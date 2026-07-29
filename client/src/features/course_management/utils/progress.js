export function calculateProgress(completedItems, totalItems) {
  if (totalItems === 0) return 0;
  return Math.round((completedItems / totalItems) * 100);
}

export function calculateGrade(scoredPoints, totalPoints) {
  if (totalPoints === 0) return 0;
  return Math.round((scoredPoints / totalPoints) * 100);
}

export function getLetterGrade(percentage, gradingScale = "STANDARD") {
  const scale = {
    STANDARD: [
      { min: 90, max: 100, label: "A", points: 4.0 },
      { min: 80, max: 89, label: "B", points: 3.0 },
      { min: 70, max: 79, label: "C", points: 2.0 },
      { min: 60, max: 69, label: "D", points: 1.0 },
      { min: 0, max: 59, label: "F", points: 0.0 },
    ],
    PERCENTAGE: [{ min: 0, max: 100, label: "", points: 0 }],
    PASS_FAIL: [
      { min: 60, max: 100, label: "Pass", points: 1.0 },
      { min: 0, max: 59, label: "Fail", points: 0.0 },
    ],
  };
  const grades = scale[gradingScale] || scale.STANDARD;
  const match = grades.find((g) => percentage >= g.min && percentage <= g.max);
  return match || grades[grades.length - 1];
}

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function isCoursePublished(course) {
  return course.status === "published";
}

export function isCourseArchived(course) {
  return course.status === "archived";
}
