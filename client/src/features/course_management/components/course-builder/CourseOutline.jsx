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
} from "lucide-react";

const TYPE_CONFIG = {
  video: { icon: PlayCircle, label: "Video", color: "text-blue-500" },
  reading: { icon: FileText, label: "Text / Reading", color: "text-green-500" },
  quiz: { icon: HelpCircle, label: "Quiz", color: "text-purple-500" },
  link: { icon: Link2, label: "Link", color: "text-indigo-500" },
  sop: { icon: FileText, label: "SOP", color: "text-amber-500" },
  document: { icon: FileArchive, label: "Document / File", color: "text-red-500" },
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
  return (
    <div className="flex h-full flex-col border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Course Structure</span>
        <button
          type="button"
          onClick={onAddModule}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-700 px-2 py-1 text-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition-all"
        >
          <Plus size={14} /> Module
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {modules.map((mod, idx) => (
          <ModuleOutlineItem
            key={mod.id || idx}
            module={mod}
            index={idx}
            selected={selectedModuleId === mod.id}
            selectedLessonId={selectedLessonId}
            onSelectModule={() => onSelectModule?.(mod.id)}
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
        {modules.length === 0 && (
          <div className="text-center py-6 text-neutral-400">
            <FileText size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No modules yet. Add your first module to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleOutlineItem({
  module,
  index,
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
  const [open, setOpen] = useState(true);
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
      className={`rounded-md border transition-all ${
        selected
          ? "border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10 shadow-sm"
          : "border-transparent hover:border-neutral-200 dark:border-transparent dark:hover:border-neutral-700"
      }`}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-900 dark:text-neutral-100"
            />
          ) : (
            <button
              type="button"
              onClick={onSelectModule}
              className={`w-full truncate text-left text-xs font-medium ${
                selected
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-neutral-800 dark:text-neutral-200"
              }`}
              title={module.title || `Module ${index + 1}`}
            >
              {module.title || `Module ${index + 1}`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`text-[10px] ${
              hasLessons ? "text-neutral-500 dark:text-neutral-500" : "text-amber-600 dark:text-amber-400 font-medium"
            }`}
          >
            {hasLessons ? `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}` : "No lessons"}
          </span>
          {selected && (
            <button
              type="button"
              onClick={handleEditTitle}
              className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              title="Rename module"
            >
              <Edit3 size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 text-neutral-400 hover:text-red-600"
            title="Delete module"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-1.5 py-1 space-y-0.5">
          {lessons.map((lesson, lIdx) => {
            const cfg = TYPE_CONFIG[lesson.type] || TYPE_CONFIG.reading;
            const Icon = cfg.icon;
            const isSelected = selectedLessonId === lesson.id;
            return (
              <LessonOutlineItem
                key={lesson.id || lIdx}
                lesson={lesson}
                index={lIdx}
                typeConfig={cfg}
                Icon={Icon}
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
            className="w-full rounded border border-dashed border-neutral-300 dark:border-neutral-600 py-1.5 text-[10px] text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all"
          >
            <Plus size={12} className="inline mr-1" />
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
  Icon,
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
      className={`group flex items-center gap-1 rounded px-1.5 py-1 transition-colors ${
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
          className="text-neutral-400 dark:text-neutral-500 disabled:opacity-30 hover:text-neutral-700 dark:hover:text-neutral-200"
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="text-neutral-400 dark:text-neutral-500 disabled:opacity-30 hover:text-neutral-700 dark:hover:text-neutral-200"
          title="Move down"
        >
          ↓
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
            className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1 py-0.5 text-xs text-neutral-900 dark:text-neutral-100"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-center gap-1.5 truncate text-left text-xs ${
              isSelected
                ? "text-blue-800 dark:text-blue-200 font-medium"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
            title={`${typeConfig.label}: ${lesson.title || `Lesson ${index + 1}`}`}
          >
            <Icon size={12} className={`shrink-0 ${typeConfig.color}`} />
            <span className="truncate">{lesson.title || `Lesson ${index + 1}`}</span>
          </button>
        )}
      </div>

      <span
        className={`shrink-0 text-[10px] px-1.5 py-0.25 rounded-full ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
        }`}
        title={typeConfig.label}
      >
        {typeConfig.label.split(" ")[0]}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setTitleInput(lesson.title || "");
          setIsEditingTitle(true);
        }}
        className="opacity-0 group-hover:opacity-100 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded transition-opacity"
        title="Rename lesson"
      >
        <Edit3 size={10} />
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-neutral-400 dark:text-neutral-500 hover:text-red-600 p-0.5 rounded transition-opacity"
        title="Delete lesson"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}
