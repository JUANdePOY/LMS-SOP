const db = require('../config/database');
const taskDueReminderService = require('./taskDueReminderService');

const { MS_PER_DAY, REMINDER_WINDOWS, OVERDUE_GRACE_MS } = taskDueReminderService;

// How often the scheduler scans for tasks that just crossed a reminder
// threshold. 5 minutes is frequent enough that a "due in N days" banner
// appears near the top of the hour the task is actually due, without hammering
// the DB on every poll.
const SCAN_INTERVAL_MS = 5 * 60 * 1000;

// Reminder kinds, in firing order (longest-to-shortest countdown). Each kind is
// gated by its own "sent" flag on the task row so it fires at most once per
// task. Overdue is handled separately because its recipient set is different
// (includes admins).
const COUNTDOWN_KINDS = ['almost_due_3d', 'almost_due_2d', 'almost_due_1d'];

function nowMs() {
  return Date.now();
}

function toMs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

// Pick the next reminder kind that should fire for a task right now, given the
// current time and the task's deadline + already-sent flags. Returns the kind
// name or null when nothing should fire.
function nextReminderKind(task, now) {
  const deadline = toMs(task.deadline_datetime);
  if (!deadline) return null;

  const timeLeft = deadline - now;

  if (timeLeft <= -OVERDUE_GRACE_MS) {
    if (!task.reminder_overdue_sent) return 'overdue';
    return null;
  }

  if (timeLeft <= 0) {
    // Within the grace window — not overdue yet, nothing to fire.
    return null;
  }

  // Pick the MOST URGENT unfired countdown (shortest window first). Checking
  // longest-first would label a task due tomorrow as "due in 3 days" (it
  // matches the 3d window first), then "2 days", then "1 day" on subsequent
  // scans — three stale labels before the accurate one. Shortest-first fires
  // the correct day immediately and still progresses naturally as the deadline
  // approaches (3d -> 2d -> 1d for a task created with 3 days left).
  for (const kind of ['almost_due_1d', 'almost_due_2d', 'almost_due_3d']) {
    const spec = REMINDER_WINDOWS[kind];
    if (timeLeft <= spec.days * MS_PER_DAY && !task[spec.flag]) {
      return kind;
    }
  }

  return null;
}

async function markSent(taskId, flag) {
  await db.query(`UPDATE tasks SET ${flag} = 1 WHERE id = ?`, [taskId]);
}

// Scan once. Returns the number of reminders fired. Safe to call repeatedly.
async function scanOnce() {
  const now = nowMs();
  // Fetch every task that still has at least one reminder flag unset and a
  // deadline in the future-ish window. Tasks already completed/cancelled are
  // skipped because they carry no deadline urgency worth reminding about.
  const [rows] = await db.query(
    `SELECT id, title, deadline_datetime, status,
            reminder_3d_sent, reminder_2d_sent, reminder_1d_sent, reminder_overdue_sent
     FROM tasks
     WHERE deadline_datetime IS NOT NULL
       AND status NOT IN ('Completed', 'Cancelled')
       AND (
         reminder_3d_sent = 0
         OR reminder_2d_sent = 0
         OR reminder_1d_sent = 0
         OR reminder_overdue_sent = 0
       )`
  );

  let fired = 0;
  for (const task of rows) {
    const kind = nextReminderKind(task, now);
    if (!kind) continue;

    try {
      await taskDueReminderService.notifyTaskDueReminder(task, kind);
      const flag = kind === 'overdue'
        ? 'reminder_overdue_sent'
        : REMINDER_WINDOWS[kind].flag;
      await markSent(task.id, flag);
      fired += 1;
    } catch (err) {
      console.error(`[task-due] Failed to fire ${kind} reminder for task ${task.id}:`, err.message || err);
    }
  }

  if (fired > 0) {
    console.log(`[task-due] Fired ${fired} due-date reminder(s)`);
  }
  return fired;
}

let intervalHandle = null;
let running = false;

function startTaskDueScheduler() {
  if (intervalHandle) return intervalHandle;
  // Fire an initial scan shortly after boot so reminders that crossed a
  // threshold while the server was down are caught, then settle into the
  // regular cadence.
  setTimeout(() => {
    scanOnce().catch((err) => console.error('[task-due] Initial scan failed:', err.message || err));
  }, 5000);
  intervalHandle = setInterval(() => {
    if (running) return;
    running = true;
    scanOnce()
      .catch((err) => console.error('[task-due] Scheduled scan failed:', err.message || err))
      .finally(() => { running = false; });
  }, SCAN_INTERVAL_MS);
  console.log(`[task-due] Scheduler started (scan every ${SCAN_INTERVAL_MS / 1000}s)`);
  return intervalHandle;
}

function stopTaskDueScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  SCAN_INTERVAL_MS,
  OVERDUE_GRACE_MS,
  MS_PER_DAY,
  COUNTDOWN_KINDS,
  nextReminderKind,
  scanOnce,
  startTaskDueScheduler,
  stopTaskDueScheduler,
};