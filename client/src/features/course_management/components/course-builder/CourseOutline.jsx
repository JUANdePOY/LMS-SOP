import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  PlayCircle,
  HelpCircle,
  Link2,
  FileArchive,
  Plus,
  Edit3,
  Trash2,
  Award,
  BookOpen,
  GripVertical,
  Search,
} from "lucide-react";

const TYPE_CONFIG = {
  video: { icon: PlayCircle, label: "Video", color: "text-[var(--color-primary)] bg-[rgba(242,92,5,0.08)] dark:bg-blue-900/20" },
  reading: { icon: FileText, label: "Text", color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  quiz: { icon: HelpCircle, label: "Quiz", color: "text-[var(--color-secondary)] bg-purple-50 dark:bg-purple-900/20" },
  link: { icon: Link2, label: "Link", color: "text-[var(--color-secondary)] bg-[rgba(19,47,69,0.08)] dark:bg-indigo-900/20" },
  sop: { icon: FileText, label: "SOP", color: "text-amber-500 bg-warning-soft dark:bg-warning-soft" },
  certificate: { icon: Award, label: "Cert", color: "text-[var(--color-success)] bg-success-soft dark:bg-success-soft" },
  document: { icon: FileArchive, label: "File", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

export default function CourseOutline({
  modules,
  selectedModuleId,
  selectedLessonId,
  onSelectModule,
  onSelectLesson,
  onAddModule,
  onUpdateModule,
  onRemoveModule,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
  onMoveLessonUp,
  onMoveLessonDown,
}) {
  const [expandedModules, setExpandedModules] = useState(() => modules.map((m) => m.id));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const filteredModules = modules.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.title || "").toLowerCase().includes(q) ||
      (m.lessons || []).some((l) => (l.title || "").toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Course Structure</span>
          <button
            type="button"
            onClick={onAddModule}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-medium text-white hover-brand transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filteredModules.map((mod, idx) => (
          <ModuleOutlineItem
            key={mod.id || idx}
            module={mod}
            index={idx}
            expanded={expandedModules.includes(mod.id)}
            onToggle={() => toggleModule(mod.id)}
            selected={selectedModuleId === mod.id}
            selectedLessonId={selectedLessonId}
            onSelectLesson={(lessonId) => onSelectLesson?.(mod.id, lessonId)}
            onUpdate={(patch) => onUpdateModule?.(mod.id, patch)}
            onRemove={() => onRemoveModule?.(mod.id)}
            onAddLesson={() => onAddLesson?.(mod.id)}
            onUpdateLesson={onUpdateLesson}
            onRemoveLesson={onRemoveLesson}
            onMoveLessonUp={onMoveLessonUp}
            onMoveLessonDown={onMoveLessonDown}
          />
        ))}
        {filteredModules.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen size={20} className="text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 mb-3">
              {searchQuery ? "No matches found" : "No modules yet"}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onAddModule}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover-brand"
              >
                <Plus size={14} /> Add your first module
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleOutlineItem({
  module,
  index,
  expanded,
  onToggle,
  selected,
  selectedLessonId,
  onSelectModule,
  onSelectLesson,
  onUpdate,
  onRemove,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
  onMoveLessonUp,
  onMoveLessonDown,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const titleInputRef = useRef(null);
  const lessons = module.lessons || [];
  const hasLessons = lessons.length > 0;

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      const len = titleInputRef.current.value.length;
      titleInputRef.current.setSelectionRange(len, len);
    }
  }, [isEditingTitle]);

  const handleEditTitle = () => {
    setTitleInput(module.title || "");
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== module.title) {
      onUpdate({ title: trimmed });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTitleInput(module.title || "");
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      className="rounded-lg border border-transparent transition-all"
    >
      <div className="flex items-center gap-1 px-2 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${module.title || `Module ${index + 1}`}` : `Expand ${module.title || `Module ${index + 1}`}`}
          className="flex flex-1 min-w-0 items-center gap-1.5 text-left rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <span className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors shrink-0">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100"
              />
            ) : (
              <span
                className="block w-full truncate text-sm font-medium text-neutral-800 dark:text-neutral-200"
                title={module.title || `Module ${index + 1}`}
              >
                {module.title || `Module ${index + 1}`}
              </span>
            )}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <span
            className={`text-xs ${
              hasLessons ? "text-neutral-500 dark:text-neutral-500" : "text-[var(--color-warning)] dark:text-[var(--color-warning)] font-medium"
            }`}
          >
            {hasLessons ? `${lessons.length}` : "0"}
          </span>
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEditTitle();
              }}
              className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              title="Rename module"
            >
              <Edit3 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded p-1 text-neutral-400 hover:text-red-600"
            title="Delete module"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-2 py-1.5 space-y-0.5">
          {lessons.map((lesson, lIdx) => {
            const cfg = TYPE_CONFIG[lesson.type] || TYPE_CONFIG.reading;
            const isSelected = selectedLessonId === lesson.id;
            return (
              <LessonOutlineItem
                key={lesson.id || lIdx}
                lesson={lesson}
                index={lIdx}
                typeConfig={cfg}
                isSelected={isSelected}
                onSelect={() => onSelectLesson?.(lesson.id)}
                onMoveUp={() => onMoveLessonUp?.(module.id, lIdx)}
                onMoveDown={() => onMoveLessonDown?.(module.id, lIdx)}
                onRemove={() => onRemoveLesson?.(module.id, lIdx)}
                onUpdateTitle={(newTitle) => onUpdateLesson?.(module.id, lIdx, { title: newTitle })}
                isFirst={lIdx === 0}
                isLast={lIdx === lessons.length - 1}
              />
            );
          })}
          <button
            type="button"
            onClick={onAddLesson}
            className="w-full rounded border border-dashed border-neutral-300 dark:border-neutral-600 py-2 text-xs text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all"
          >
            <Plus size={14} className="inline mr-1" />
            Add Lesson
          </button>
        </div>
      )}
    </div>
  );
}

function LessonOutlineItem({
  lesson,
  index,
  typeConfig,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateTitle,
  isFirst,
  isLast,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      const len = titleInputRef.current.value.length;
      titleInputRef.current.setSelectionRange(len, len);
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== lesson.title) {
      onUpdateTitle(trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTitleInput(lesson.title || "");
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-1 rounded px-2 py-1.5 transition-colors ${
        isSelected
          ? "bg-blue-100 dark:bg-blue-900/30"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-neutral-400 dark:text-neutral-500 disabled:opacity-20 hover:text-neutral-700 dark:hover:text-neutral-200"
          title="Move up"
        >
          <GripVertical size={14} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="text-neutral-400 dark:text-neutral-500 disabled:opacity-20 hover:text-neutral-700 dark:hover:text-neutral-200"
          title="Move down"
        >
          <GripVertical size={14} className="rotate-180" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-center gap-1.5 truncate text-left text-sm ${
              isSelected
                ? "text-blue-800 dark:text-white font-medium"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
            title={`${typeConfig.label}: ${lesson.title || `Lesson ${index + 1}`}`}
          >
            <span className={`inline-flex items-center justify-center rounded px-1.5 py-1 text-[10px] font-medium ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className="truncate">{lesson.title || `Lesson ${index + 1}`}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setTitleInput(lesson.title || "");
          setIsEditingTitle(true);
        }}
        className="opacity-0 group-hover:opacity-100 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded transition-opacity"
        title="Rename lesson"
      >
        <Edit3 size={14} />
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-neutral-400 dark:text-neutral-500 hover:text-red-600 p-1 rounded transition-opacity"
        title="Delete lesson"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
