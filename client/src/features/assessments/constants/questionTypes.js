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
};

export const QUESTION_TYPE_CONFIG = {
  multiple_choice: { icon: HelpCircle, label: "Multiple Choice", maxOptions: null, isSingle: true },
  multi_select: { icon: CheckSquare, label: "Multiple Select", maxOptions: null, isSingle: false },
  multiple_select: { icon: CheckSquare, label: "Multiple Select", maxOptions: null, isSingle: false },
  true_false: { icon: List, label: "True / False", options: ["True", "False"] },
  short_answer: { icon: Type, label: "Short Answer", maxOptions: 0 },
};

// Question types are differentiated by ICON + LABEL only — never by hue.
// A single accent (indigo) and a single semantic success (emerald, for correct
// answers) are applied at the component level, keeping the organizer calm and
// professional. `icon` values are lucide components.
export const QUESTION_TYPE_ICONS = {
  multiple_choice: HelpCircle,
  multi_select: CheckSquare,
  multiple_select: CheckSquare,
  true_false: List,
  short_answer: Type,
};

// Neutral, reusable class tokens for type badges/chips. No per-type colors so
// the only hues in the organizer are the accent (indigo), success (emerald)
// and danger (rose) applied deliberately elsewhere.
export const TYPE_BADGE =
  "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300";
export const TYPE_CHIP =
  "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400";
export const TYPE_ICON = "text-neutral-500 dark:text-neutral-400";
export const TYPE_DOT = "bg-neutral-400 dark:bg-neutral-500";
