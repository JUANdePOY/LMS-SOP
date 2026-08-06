import { HelpCircle, CheckSquare, List, Type } from "lucide-react";

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  MULTI_SELECT: "multiple_select",
  TRUE_FALSE: "true_false",
  SHORT_ANSWER: "short_answer",
};

export const QUESTION_TYPE_LABELS = {
  multiple_choice: "Multiple Choice",
  multi_select: "Multiple Select",
  multiple_select: "Multiple Select",
  true_false: "True / False",
  short_answer: "Short Answer",
  essay: "Essay",
  fill_blank: "Fill in the Blank",
};

export const QUESTION_TYPE_CONFIG = {
  multiple_choice: { icon: HelpCircle, label: "Multiple Choice", maxOptions: null, isSingle: true },
  multi_select: { icon: CheckSquare, label: "Multiple Select", maxOptions: null, isSingle: false },
  multiple_select: { icon: CheckSquare, label: "Multiple Select", maxOptions: null, isSingle: false },
  true_false: { icon: List, label: "True / False", options: ["True", "False"] },
  short_answer: { icon: Type, label: "Short Answer", maxOptions: 0 },
};

// Centralized, restrained theme tokens for each question type. Color is used
// as a signal (dot / chip / icon) rather than a full background flood, keeping
// the organizer calm and professional. `icon` values are lucide components.
export const QUESTION_TYPE_ICONS = {
  multiple_choice: HelpCircle,
  multi_select: CheckSquare,
  multiple_select: CheckSquare,
  true_false: List,
  short_answer: Type,
  essay: Type,
  fill_blank: Type,
};

export const TYPE_THEME = {
  multiple_choice: {
    dot: "bg-sky-500",
    chip: "bg-sky-100 dark:bg-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    icon: "text-sky-500 dark:text-sky-400",
  },
  multi_select: {
    dot: "bg-violet-500",
    chip: "bg-violet-100 dark:bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    icon: "text-violet-500 dark:text-violet-400",
  },
  multiple_select: {
    dot: "bg-violet-500",
    chip: "bg-violet-100 dark:bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    icon: "text-violet-500 dark:text-violet-400",
  },
  true_false: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: "text-emerald-500 dark:text-emerald-400",
  },
  short_answer: {
    dot: "bg-amber-500",
    chip: "bg-amber-100 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    icon: "text-amber-500 dark:text-amber-400",
  },
  essay: {
    dot: "bg-rose-500",
    chip: "bg-rose-100 dark:bg-rose-500/15",
    text: "text-rose-600 dark:text-rose-400",
    icon: "text-rose-500 dark:text-rose-400",
  },
  fill_blank: {
    dot: "bg-indigo-500",
    chip: "bg-indigo-100 dark:bg-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-400",
    icon: "text-indigo-500 dark:text-indigo-400",
  },
};

export const DEFAULT_TYPE_THEME = TYPE_THEME.multiple_choice;
