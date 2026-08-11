import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-100 border-slate-200 dark:border-slate-500/30",
  medium: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.08)]0/15 dark:text-[var(--color-primary)] border-[rgba(242,92,5,0.25)] dark:border-[rgba(242,92,5,0.30)]",
  high: "bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft dark:text-[var(--color-warning)] border-[rgba(217,163,0,0.25)] dark:border-[rgba(217,163,0,0.30)]",
  critical: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30",
};

function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function CalendarGrid({ items, onSelectDay, onCreate, selectedDate, canManage }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();

  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const eventsByDate = {};
  items.forEach((item) => {
    if (!item.event_date) return;
    const d = new Date(item.event_date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(item);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={prevMonth}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{monthLabel}</h3>
        <button
          onClick={nextMonth}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-2 text-center text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20" />;
          }

          const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`;
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(dateObj, today);
          const isSelected = selectedDate ? isSameDay(dateObj, selectedDate) : false;

          return (
            <div
              key={day}
              onClick={() => onSelectDay && onSelectDay(dateObj)}
              className={`group relative min-h-[80px] sm:min-h-[100px] border-b border-r border-neutral-200 dark:border-neutral-700 p-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-[rgba(242,92,5,0.08)] dark:bg-[rgba(242,92,5,0.16)]"
                  : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "btn-primary"
                      : "text-neutral-700 dark:text-neutral-200"
                  }`}
                >
                  {day}
                </span>
                {canManage && isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreate && onCreate(dateObj);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus size={14} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
                  </button>
                )}
              </div>

              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((evt) => (
                  <div
                    key={evt.id}
                    className={`text-[10px] leading-tight rounded px-1.5 py-0.5 truncate border ${PRIORITY_COLORS[evt.priority] || PRIORITY_COLORS.medium}`}
                  >
                    {formatTime(evt.event_date)} {evt.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
