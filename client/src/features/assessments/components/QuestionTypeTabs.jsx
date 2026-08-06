import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Edit,
  Trash2,
  CheckSquare,
  Square,
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={`relative group flex items-center gap-3 rounded-xl border ${colors.border} ${colors.bg} p-3.5 shadow-sm hover:shadow-md transition-all duration-200`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl`}
        />
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="flex items-center gap-2 flex-shrink-0">
          <GripVertical className="h-4 w-4 text-neutral-400 cursor-grab flex-shrink-0 group-hover:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(q.id);
            }}
            className="flex-shrink-0"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" />
            )}
          </button>
          <TypeIcon type={q.type} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-neutral-900 dark:text-neutral-100 block truncate text-sm">
            {q.question_text || q.text || ""}
          </span>
          {q.options && Array.isArray(q.options) && q.options.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {q.options.map((opt, oi) => {
                const optText =
                  typeof opt === "string"
                    ? opt
                    : opt?.label || opt?.value || JSON.stringify(opt);
                const isCorrect =
                  JSON.stringify(q.correct_answer) === JSON.stringify(opt) ||
                  (Array.isArray(q.correct_answer) &&
                    q.correct_answer.some(
                      (ca) =>
                        JSON.stringify(ca) === JSON.stringify(opt) ||
                        ca === optText
                    ));
                return (
                  <span
                    key={oi}
                    className={`text-xs px-2 py-0.5 rounded ${
                      isCorrect
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {optText}
                  </span>
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
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
          {q.points || 1}pt
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(q)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(q)}
            title="Delete"
            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
}) {
  const [collapsed, setCollapsed] = useState(true);
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
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${colors.bg} hover:opacity-85 transition-opacity`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <TypeIcon type={type} />
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
          className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
        >
          {collapsed ? (
            <ChevronRight className={`h-4 w-4 ${colors.icon}`} />
          ) : (
            <ChevronDown className={`h-4 w-4 ${colors.icon}`} />
          )}
        </button>
      </div>

      {!collapsed && (
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

    const orderedTypes = TYPE_ORDER.filter(
      (t) => groups[t] && groups[t].length > 0
    );

    return { groups, orderedTypes };
  }, [filtered]);

  const typeTabs = [
    { value: "all", label: "All Questions", count: filtered.length },
    ...grouped.orderedTypes.map((t) => ({
      value: t,
      label: QUESTION_TYPE_LABELS[t] || t,
      count: grouped.groups[t].length,
    })),
  ];

  const visibleSections =
    activeTab === "all"
      ? grouped.orderedTypes
      : grouped.orderedTypes.filter((t) => t === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
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
                  ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ring-blue-500/20 dark:ring-offset-neutral-900`
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {tab.value !== "all" && <TypeIcon type={tab.value} />}
              {tab.label}
              <span
                className={`px-1.5 py-0.25 rounded-full text-xs ${
                  isActive
                    ? "bg-white/20 dark:bg-black/20"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
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
            items={grouped.groups[type]}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onReorder={onReorder}
          />
        ))
      )}
    </div>
  );
}
