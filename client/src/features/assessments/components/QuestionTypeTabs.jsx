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
  List,
  Type,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_CONFIG } from "../constants/questionTypes";
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

const TYPE_COLORS = {
  multiple_choice: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-500/30 dark:border-blue-700/50",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-400/10 via-blue-500/5 to-transparent",
  },
  multi_select: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-500/30 dark:border-purple-700/50",
    text: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-400/10 via-purple-500/5 to-transparent",
  },
  multiple_select: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-500/30 dark:border-purple-700/50",
    text: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-400/10 via-purple-500/5 to-transparent",
  },
  true_false: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-500/30 dark:border-emerald-700/50",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-400/10 via-emerald-500/5 to-transparent",
  },
  short_answer: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-500/30 dark:border-amber-700/50",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-400/10 via-amber-500/5 to-transparent",
  },
  essay: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-500/30 dark:border-rose-700/50",
    text: "text-rose-700 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-400",
    gradient: "from-rose-400/10 via-rose-500/5 to-transparent",
  },
  fill_blank: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-500/30 dark:border-indigo-700/50",
    text: "text-indigo-700 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
    gradient: "from-indigo-400/10 via-indigo-500/5 to-transparent",
  },
};

const TYPE_ICONS = {
  multiple_choice: HelpCircle,
  multi_select: CheckSquare,
  multiple_select: CheckSquare,
  true_false: List,
  short_answer: Type,
  essay: Type,
  fill_blank: Type,
};

const TYPE_ORDER = [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "short_answer",
  "essay",
  "fill_blank",
];

function TypeIcon({ type }) {
  const Icon = TYPE_ICONS[type] || GripVertical;
  const colorClass = TYPE_COLORS[type]?.icon || "text-neutral-400";
  return <Icon className={`h-5 w-5 ${colorClass}`} />;
}

function getOptionText(opt) {
  if (typeof opt === "string") return opt;
  return opt?.label || opt?.value || JSON.stringify(opt);
}

function isOptionCorrect(option, correctAnswer) {
  const optText = getOptionText(option);
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(
      (ca) => JSON.stringify(ca) === JSON.stringify(option) || ca === optText
    );
  }
  return JSON.stringify(correctAnswer) === JSON.stringify(option) || correctAnswer === optText;
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
  };

  const colors = TYPE_COLORS[q.type] || TYPE_COLORS.multiple_choice;
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
        className={`group relative flex flex-wrap items-center gap-3 rounded-xl border ${colors.border} ${colors.bg} p-3.5 shadow-sm hover:shadow-md transition-all duration-200 touch-none`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl`}
        />
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="flex items-center gap-2 flex-shrink-0">
          <GripVertical className="h-4 w-4 text-neutral-400 cursor-grab flex-shrink-0 group-hover:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" />
          <button
            type="button"
            aria-label={isSelected ? "Deselect question" : "Select question"}
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(q.id);
            }}
            className="flex-shrink-0 p-1 -m-1 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" />
            )}
          </button>
          <TypeIcon type={q.type} />
        </div>

        <div className="flex-1 min-w-[200px]">
          <span className="font-medium text-neutral-900 dark:text-neutral-100 block text-sm">
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
                        ? "bg-green-50 dark:bg-green-900/25 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300"
                        : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {correct ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                    )}
                    <span className="leading-snug">{optText}</span>
                    {correct && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
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
            className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full"
            title="Points"
          >
            {q.points || 1}pt
          </span>
          {hasOptions && correctCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
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
  const colors = TYPE_COLORS[type] || TYPE_COLORS.multiple_choice;
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
    <div
      className={`border ${colors.border} rounded-xl bg-white dark:bg-neutral-900 shadow-sm overflow-hidden transition-all duration-200`}
    >
      <div
        className={`relative flex items-center justify-between px-4 py-3 cursor-pointer ${colors.bg} transition-opacity hover:opacity-85`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="relative flex items-center gap-3">
          <span className={`flex items-center justify-center h-7 w-7 rounded-lg ${colors.bg} ${colors.text} ring-1 ${colors.border}`}>
            <TypeIcon type={type} />
          </span>
          <h3 className={`font-semibold ${colors.text} text-sm`}>
            {config.label || QUESTION_TYPE_LABELS[type] || type}
          </h3>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}
          >
            {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
          className="relative p-1.5 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70 rounded-md transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className={`h-4 w-4 ${colors.icon}`} />
          ) : (
            <ChevronDown className={`h-4 w-4 ${colors.icon}`} />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
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
              <TypeIcon type={type} />
              <p className="mt-2">No questions of this type yet.</p>
              <p className="text-xs mt-1">
                Use "Add Question" to create one.
              </p>
            </div>
          )}
        </div>
      )}
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
    if (!searchQuery.trim()) return questions;
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

    const orderedTypes = TYPE_ORDER.filter((t) => groups[t] && groups[t].length > 0);

    return { groups, orderedTypes };
  }, [filtered]);

  // Always present every configured question type as a filter tab so users
  // can switch to (and see the count of) each type — including empty ones
  // like "Multiple Select" — instead of only types that already have questions.
  const typeTabs = [
    { value: "all", label: "All Questions", count: filtered.length },
    ...TYPE_ORDER.map((t) => ({
      value: t,
      label: QUESTION_TYPE_LABELS[t] || t,
      count: grouped.groups[t]?.length || 0,
    })),
  ];

  const visibleSections =
    activeTab === "all"
      ? TYPE_ORDER
      : TYPE_ORDER.filter((t) => t === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent flex-1">
          {typeTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const colors =
              TYPE_COLORS[tab.value] || {
                bg: "bg-neutral-100 dark:bg-neutral-800",
                text: "text-neutral-700 dark:text-neutral-300",
              };
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ring-blue-500/20 dark:ring-offset-neutral-900 shadow-sm`
                    : "text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {tab.value !== "all" && <TypeIcon type={tab.value} />}
                {tab.label}
                <span
                  className={`px-1.5 py-0.25 rounded-full text-xs ${
                    isActive
                      ? "bg-white/25 dark:bg-black/25"
                      : "bg-neutral-200 dark:bg-neutral-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {expandAll ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
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
