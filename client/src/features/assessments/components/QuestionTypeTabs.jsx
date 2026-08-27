import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_CONFIG,
  QUESTION_TYPE_ICONS,
  TYPE_BADGE,
  TYPE_CHIP,
  TYPE_ICON,
  TYPE_DOT,
} from "../constants/questionTypes";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TYPE_ORDER = [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "short_answer",
];

function TypeIcon({ type, className = "h-5 w-5" }) {
  const Icon = QUESTION_TYPE_ICONS[type] || GripVertical;
  return <Icon className={`${className} ${TYPE_ICON}`} />;
}

function TypeDot() {
  return <span className={`h-2.5 w-2.5 rounded-full ${TYPE_DOT}`} />;
}

function getOptionText(opt) {
  if (typeof opt === "string") return opt;
  return opt?.label || opt?.value || JSON.stringify(opt);
}

function isOptionCorrect(option, correctAnswer) {
  const optText = (getOptionText(option) || "").toString().trim().toLowerCase();
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(
      (ca) =>
        (typeof ca === "string" ? ca.trim().toLowerCase() : JSON.stringify(ca).toLowerCase()) === optText ||
        JSON.stringify(ca).toLowerCase() === JSON.stringify(option).toLowerCase()
    );
  }
  const caText = (correctAnswer != null ? correctAnswer : "").toString().trim().toLowerCase();
  return JSON.stringify(correctAnswer).toLowerCase() === JSON.stringify(option).toLowerCase() || caText === optText;
}

function QuestionItem({ q, isSelected, onToggleSelect, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const hasOptions = q.options && Array.isArray(q.options) && q.options.length > 0;
  const correctCount = hasOptions
    ? q.options.filter((o) => isOptionCorrect(o, q.correct_answer)).length
    : 0;

  const stop = (e) => e.stopPropagation();

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        className={`group relative flex flex-wrap items-center gap-3 rounded-2xl border bg-white dark:bg-neutral-900 p-3.5 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 touch-none ${
          isSelected
            ? "border-indigo-400 dark:border-indigo-500 border-l-4"
            : "border-neutral-200 dark:border-neutral-700"
        }`}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <GripVertical className="h-4 w-4 text-neutral-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
          <button
            type="button"
            aria-label={isSelected ? "Deselect question" : "Select question"}
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(q.id);
            }}
            className="flex-shrink-0 p-1 -m-1 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-indigo-600" />
            ) : (
              <Square className="h-4 w-4 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
            )}
          </button>
          <TypeIcon type={q.type} />
        </div>

        <div className="flex-1 min-w-[200px]">
          <span
            title={q.question_text || q.text || ""}
            className="font-medium text-neutral-900 dark:text-neutral-100 block text-[15px] leading-snug truncate"
          >
            {q.question_text || q.text || ""}
          </span>

          {hasOptions && (
            <div className="mt-1.5 flex flex-col gap-1">
              {q.options.map((opt, oi) => {
                const optText = getOptionText(opt);
                const correct = isOptionCorrect(opt, q.correct_answer);
                return (
                  <div
                    key={oi}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
                      correct
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {correct ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-neutral-300 flex-shrink-0" />
                    )}
                    <span className="leading-snug">{optText}</span>
                    {correct && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!hasOptions && q.type === "short_answer" && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="leading-snug">{q.correct_answer || "—"}</span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Expected
              </span>
            </div>
          )}

          {q.explanation && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 italic line-clamp-1">
              {q.explanation}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <span
            className="text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full"
            title="Points"
          >
            {q.points || 1}pt
          </span>
          {hasOptions && correctCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> {correctCount} correct
            </span>
          )}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Edit question"
              onPointerDown={stop}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(q);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete question"
              onPointerDown={stop}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(q);
              }}
              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionTypeSection({
  type,
  items,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onReorder,
  forceExpanded,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsed = !forceExpanded && collapsed;
  const config = QUESTION_TYPE_CONFIG[type] || {
    icon: GripVertical,
    label: type,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((q) => q.id === active.id);
    const newIndex = items.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(type, reordered.map((q) => q.id));
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden transition-all duration-200">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        className="relative flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed(!collapsed);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center h-7 w-7 rounded-lg ${TYPE_CHIP} ${TYPE_ICON} ring-1 ring-black/5`}>
            <TypeIcon type={type} className="h-4 w-4" />
          </span>
          <h3 className={`font-semibold ${TYPE_ICON} text-[13px] tracking-tight`}>
            {config.label || QUESTION_TYPE_LABELS[type] || type}
          </h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full ${TYPE_BADGE} font-semibold tabular-nums`}>
            {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
          aria-label={isCollapsed ? "Expand" : "Collapse"}
          className="relative p-1.5 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70 rounded-md transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className={`h-4 w-4 ${TYPE_ICON}`} />
          ) : (
            <ChevronDown className={`h-4 w-4 ${TYPE_ICON}`} />
          )}
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {items.map((q) => (
                    <QuestionItem
                      key={q.id}
                      q={q}
                      isSelected={selectedIds.has(q.id)}
                      onToggleSelect={onToggleSelect}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {items.length === 0 && (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
                <span className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${TYPE_CHIP} ${TYPE_ICON} mb-2`}>
                  <TypeIcon type={type} className="h-5 w-5" />
                </span>
                <p>No questions of this type yet.</p>
                <p className="text-xs mt-1">Use "Add Question" to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuestionTypeTabs({
  questions,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onReorder,
  searchQuery,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [expandAll, setExpandAll] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter((item) => {
      const text = (item.question_text || item.text || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      return text.includes(q) || type.includes(q);
    });
  }, [questions, searchQuery]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((q) => {
      const qt = q.type || "multiple_choice";
      if (!groups[qt]) groups[qt] = [];
      groups[qt].push(q);
    });
    return { groups, orderedTypes: TYPE_ORDER.filter((t) => groups[t] && groups[t].length > 0) };
  }, [filtered]);

  // Always present every configured question type as a filter tab so users
  // can switch to (and see the count of) each type — including empty ones
  // like "Multiple Select" — instead of only types that already have questions.
  const typeTabs = [
    { value: "all", label: "All Questions", count: filtered.length, dot: null },
    ...TYPE_ORDER.map((t) => ({
      value: t,
      label: QUESTION_TYPE_LABELS[t] || t,
      count: grouped.groups[t]?.length || 0,
      dot: t,
    })),
  ];

  const visibleSections =
    activeTab === "all" ? TYPE_ORDER : TYPE_ORDER.filter((t) => t === activeTab);

  return (
    <div className="space-y-4">
      <div className="sticky top-[var(--page-sticky-top)] z-10 -mx-1 px-1 py-2 bg-gradient-to-b from-[var(--bg-page,white)] via-[var(--bg-page,white)]/95 to-transparent dark:from-neutral-950 dark:via-neutral-950/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div
            role="tablist"
            aria-label="Filter by question type"
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent flex-1"
          >
            {typeTabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.value)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive
                      ? "bg-white dark:bg-neutral-800 border-indigo-500/60 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/30"
                      : "text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {tab.dot && <TypeDot />}
                  {tab.label}
                  <span
                    className={`px-1.5 py-0.25 rounded-full text-xs tabular-nums ${
                      isActive
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setExpandAll((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {expandAll ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {expandAll ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No questions found.</p>
          <p className="text-xs mt-1">
            {searchQuery
              ? "Try adjusting your search query."
              : 'Click "Add Question" to create your first question.'}
          </p>
        </div>
      ) : (
        visibleSections.map((type) => (
          <QuestionTypeSection
            key={type}
            type={type}
            items={grouped.groups[type] || []}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onReorder={onReorder}
            forceExpanded={expandAll}
          />
        ))
      )}
    </div>
  );
}
