export const GRADING_SCALES = {
  STANDARD: {
    name: "Standard",
    range: [0, 100],
    grades: [
      { min: 90, max: 100, label: "A", points: 4.0 },
      { min: 80, max: 89, label: "B", points: 3.0 },
      { min: 70, max: 79, label: "C", points: 2.0 },
      { min: 60, max: 69, label: "D", points: 1.0 },
      { min: 0, max: 59, label: "F", points: 0.0 },
    ],
  },
  PERCENTAGE: {
    name: "Percentage Only",
    range: [0, 100],
    grades: [],
  },
  PASS_FAIL: {
    name: "Pass/Fail",
    range: [0, 100],
    grades: [
      { min: 60, max: 100, label: "Pass", points: 1.0 },
      { min: 0, max: 59, label: "Fail", points: 0.0 },
    ],
  },
};

export const GRADING_SCALE_LABELS = {
  STANDARD: "Standard (A-F)",
  PERCENTAGE: "Percentage Only",
  PASS_FAIL: "Pass/Fail",
};
