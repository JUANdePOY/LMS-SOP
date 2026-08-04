import { HelpCircle, CheckSquare, List, Type } from "lucide-react";

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  MULTI_SELECT: "multi_select",
  TRUE_FALSE: "true_false",
  SHORT_ANSWER: "short_answer",
};

export const QUESTION_TYPE_LABELS = {
  multiple_choice: "Multiple Choice",
  multi_select: "Multiple Select",
  true_false: "True / False",
  short_answer: "Short Answer",
};

export const QUESTION_TYPE_CONFIG = {
  multiple_choice: { icon: HelpCircle, label: "Multiple Choice", maxOptions: null, isSingle: true },
  multi_select: { icon: CheckSquare, label: "Multiple Select", maxOptions: null, isSingle: false },
  true_false: { icon: List, label: "True / False", options: ["True", "False"] },
  short_answer: { icon: Type, label: "Short Answer", maxOptions: 0 },
};
