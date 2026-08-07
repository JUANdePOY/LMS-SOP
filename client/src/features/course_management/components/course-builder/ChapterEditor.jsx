import { useState } from "react";
import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus, Clock } from "lucide-react";
import { formatTimestamp, parseTimestamp } from "@/features/course_management/utils/videoUrl";

let chapterSeq = 0;
const newChapterId = () => `ch-${Date.now()}-${chapterSeq++}`;

/**
 * Chapter / timestamp editor for video lessons.
 * Each chapter has a `start` (seconds, integer) and `title`.
 * Reuses the drag-to-reorder pattern from LessonContentBlocks.
 */
export default function ChapterEditor({ chapters = [], onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const list = Array.isArray(chapters) ? chapters : [];

  const commit = (next) => onChange(next);

  const add = () => {
    const next = [...list, { id: newChapterId(), start: 0, title: "" }];
    commit(next);
  };

  const update = (id, patch) => {
    commit(list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const remove = (id) => {
    commit(list.filter((c) => c.id !== id));
  };

  const move = (from, to) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const onDrop = (to) => {
    if (dragIndex !== null && dragIndex !== to) move(dragIndex, to);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-neutral-500">No chapters yet. Add timestamps to help learners navigate the video.</p>
      )}

      <ul role="list" className="space-y-2" aria-label="Video chapters">
        {list.map((chapter, index) => (
          <li
            key={chapter.id}
            role="listitem"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={() => onDrop(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`group flex items-stretch rounded-lg border bg-white transition-shadow ${
              overIndex === index && dragIndex !== null ? "border-blue-400 shadow-md" : "border-neutral-200"
            } ${dragIndex === index ? "opacity-50" : ""}`}
          >
            <div
              className="flex w-9 shrink-0 cursor-grab items-center justify-center border-r border-neutral-100 text-neutral-300 active:cursor-grabbing hover:bg-neutral-50 hover:text-neutral-500"
              title="Drag to reorder"
              aria-hidden="true"
            >
              <GripVertical size={16} />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 p-2">
              <div className="relative w-24 shrink-0">
                <Clock size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatTimestamp(chapter.start)}
                  onChange={(e) => update(chapter.id, { start: parseTimestamp(e.target.value) ?? 0 })}
                  placeholder="0:00"
                  aria-label={`Chapter ${index + 1} start time`}
                  className="w-full rounded-md border border-neutral-200 bg-white py-1.5 pl-7 pr-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <input
                type="text"
                value={chapter.title || ""}
                onChange={(e) => update(chapter.id, { title: e.target.value })}
                placeholder={`Chapter ${index + 1} title`}
                aria-label={`Chapter ${index + 1} title`}
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex w-9 shrink-0 flex-col items-center justify-center border-l border-neutral-100 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move chapter ${index + 1} up`}
                className="flex-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === list.length - 1}
                aria-label={`Move chapter ${index + 1} down`}
                className="flex-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => remove(chapter.id)}
                aria-label={`Remove chapter ${index + 1}`}
                className="flex-1 text-neutral-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
      >
        <Plus size={14} /> Add chapter
      </button>
    </div>
  );
}
