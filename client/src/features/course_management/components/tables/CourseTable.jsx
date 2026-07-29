import { useState } from "react";

export default function CourseTable({
  courses,
  onEdit,
  onArchive,
  onDelete,
  onView,
  onReorder,
  sortField,
  sortDirection,
  onSort,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (from !== index && onReorder) {
      onReorder(from, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500 w-10">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              </span>
            </th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500 cursor-pointer hover:text-blue-600" onClick={() => onSort?.('title')}>
              Title {sortField === 'title' && <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500 cursor-pointer hover:text-blue-600 hidden md:table-cell" onClick={() => onSort?.('category')}>
              Category {sortField === 'category' && <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Difficulty</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500 cursor-pointer hover:text-blue-600 hidden lg:table-cell" onClick={() => onSort?.('module_count')}>
              Modules {sortField === 'module_count' && <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500 cursor-pointer hover:text-blue-600 hidden lg:table-cell" onClick={() => onSort?.('enrollment_count')}>
              Enrollments {sortField === 'enrollment_count' && <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses?.map((c, idx) => {
            const isDragging = dragIndex === idx;
            const isOver = overIndex === idx;
            return (
              <tr
                key={c.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`border-b border-[var(--border)] last:border-0 transition-all duration-150 ${
                  isDragging ? "opacity-50 bg-blue-50 dark:bg-blue-900/20" : ""
                } ${isOver ? "border-t-2 border-t-blue-400" : ""} hover:bg-neutral-50 dark:hover:bg-neutral-800/50`}
              >
                <td className="px-3 py-2">
                  <button
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </button>
                </td>
                <td className="px-3 py-2">{c.title}</td>
                <td className="px-3 py-2 text-neutral-500 hidden md:table-cell">{c.category}</td>
                <td className="px-3 py-2 text-neutral-500 capitalize">{c.difficulty?.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{c.status}</span>
                </td>
                <td className="px-3 py-2 hidden lg:table-cell">{c.module_count ?? 0}</td>
                <td className="px-3 py-2 hidden lg:table-cell">{c.enrollment_count ?? 0}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => onView?.(c)} className="text-xs text-blue-600 hover:underline">View</button>
                  <button onClick={() => onEdit?.(c)} className="ml-2 text-xs text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => onArchive?.(c)} className="ml-2 text-xs text-amber-600 hover:underline">Archive</button>
                  <button onClick={() => onDelete?.(c.id)} className="ml-2 text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
