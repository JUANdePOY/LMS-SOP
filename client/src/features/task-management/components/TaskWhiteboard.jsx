import { useState, useRef, useMemo, useCallback } from 'react';
import { Plus, Trash2, PenTool, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_STYLES, TASK_PRIORITY_DOT } from '../constants/taskConstants';

const POS_KEY = 'ppm:whiteboard:positions';
const NOTE_KEY = 'ppm:whiteboard:notes';
const NOTE_COLORS = ['#FEF3C7', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#EDE9FE'];

function gridPos(i) {
  return { x: 40 + (i % 5) * 270, y: 40 + Math.floor(i / 5) * 190 };
}

export default function TaskWhiteboard({ tasks, onView }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [positions, setPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch { return {}; }
  });
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY)) || []; } catch { return []; }
  });

  const taskList = useMemo(() => (tasks || []).filter((t) => t.id != null), [tasks]);

  const persistPos = useCallback(() => {
    try { localStorage.setItem(POS_KEY, JSON.stringify(positionsRef.current)); } catch { /* ignore */ }
  }, []);

  const persistNotes = useCallback((next) => {
    setNotes(next);
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const onBackgroundDown = (e) => {
    if (e.button !== 0 || e.target !== containerRef.current) return;
    dragRef.current = {
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
      moved: false,
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true;

    if (d.kind === 'pan' && d.moved) {
      containerRef.current.scrollLeft = d.scrollLeft - (e.clientX - d.startX);
      containerRef.current.scrollTop = d.scrollTop - (e.clientY - d.startY);
    } else if ((d.kind === 'card' || d.kind === 'note') && d.moved) {
      const cr = containerRef.current.getBoundingClientRect();
      const x = e.clientX - cr.left + containerRef.current.scrollLeft - d.grabDX;
      const y = e.clientY - cr.top + containerRef.current.scrollTop - d.grabDY;
      if (d.kind === 'card') {
        setPositions((p) => ({ ...p, [d.id]: { x: Math.max(0, x), y: Math.max(0, y) } }));
      } else {
        setNotes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
      }
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'card') {
      if (d.moved) persistPos();
      else onView?.(d.task);
    } else if (d.kind === 'note') {
      if (d.moved) persistNotes(notes);
    }
    dragRef.current = null;
  };

  const startDrag = (e, kind, id, task) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      kind,
      id,
      task,
      grabDX: e.clientX - rect.left,
      grabDY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const addNote = () => {
    const id = `note-${Date.now()}`;
    const next = [...notes, { id, x: 80, y: 80, text: '', color: NOTE_COLORS[notes.length % NOTE_COLORS.length] }];
    persistNotes(next);
  };

  const updateNote = (id, text) => persistNotes(notes.map((n) => (n.id === id ? { ...n, text } : n)));
  const removeNote = (id) => persistNotes(notes.filter((n) => n.id !== id));
  const resetLayout = () => {
    setPositions({});
    try { localStorage.removeItem(POS_KEY); } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          Drag cards to arrange · drag empty space to pan · add free-form notes
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addNote}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <Plus size={14} /> Note
          </button>
          <button
            type="button"
            onClick={resetLayout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onBackgroundDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative h-[70vh] min-h-[480px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-page)]"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <div className="relative h-[1600px] w-[2400px]">
          {taskList.map((task, i) => {
            const pos = positions[task.id] || gridPos(i);
            return (
              <div
                key={task.id}
                onPointerDown={(e) => startDrag(e, 'card', task.id, task)}
                style={{ left: pos.x, top: pos.y, width: 240 }}
                className="absolute cursor-grab touch-none rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
              >
                <div className="flex items-start gap-2">
                  <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', TASK_PRIORITY_DOT[task.priority] || TASK_PRIORITY_DOT.Medium)} />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">{task.title}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[task.status] || STATUS_STYLES.Pending)}>
                    {task.status}
                  </span>
                  {task.progress_rate != null && (
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">{task.progress_rate}%</span>
                  )}
                </div>
              </div>
            );
          })}

          {notes.map((n) => (
            <div
              key={n.id}
              style={{ left: n.x, top: n.y, backgroundColor: n.color }}
              className="absolute w-48 rounded-lg border border-black/10 shadow-sm"
            >
              <div
                onPointerDown={(e) => startDrag(e, 'note', n.id)}
                className="flex cursor-grab items-center justify-end rounded-t-lg px-1.5 py-1 active:cursor-grabbing"
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}
                  className="rounded p-0.5 text-neutral-500 hover:bg-black/5"
                  aria-label="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                value={n.text}
                onChange={(e) => updateNote(n.id, e.target.value)}
                placeholder="Type a note…"
                className="w-full resize-none rounded-b-lg bg-transparent p-2 text-sm outline-none placeholder:text-neutral-500"
                rows={3}
              />
            </div>
          ))}

          {taskList.length === 0 && notes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                <PenTool size={28} />
                <p className="text-sm">No tasks to place. Add a note to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
