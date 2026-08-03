import { lazy } from "react";

const AssessmentsDashboardPage = lazy(() => import("@/features/assessments/pages/AssessmentsDashboardPage"));
const QuizBuilderPage = lazy(() => import("@/features/assessments/pages/QuizBuilderPage"));
const TakeQuizPage = lazy(() => import("@/features/assessments/pages/TakeQuizPage"));
const QuizResultsPage = lazy(() => import("@/features/assessments/pages/QuizResultsPage"));
const QuizLeaderboardPage = lazy(() => import("@/features/assessments/pages/QuizLeaderboardPage"));
const ViolationDashboardPage = lazy(() => import("@/features/assessments/pages/ViolationDashboardPage"));

const ASSESSMENTS_ROUTES = [
  { path: "/assessments", label: "Assessments", title: "Assessments", element: AssessmentsDashboardPage, roles: ["super_admin", "admin", "department_head", "employee"] },
  { path: "/assessments/quiz/:quizId", label: "Quiz Builder", title: "Quiz Builder", element: QuizBuilderPage, roles: ["super_admin", "admin", "department_head"] },
  { path: "/assessments/quiz/:quizId/take/:attemptId?", label: "Take Quiz", title: "Take Quiz", element: TakeQuizPage, roles: ["super_admin", "admin", "department_head", "employee"] },
  { path: "/assessments/quiz/:quizId/results", label: "Quiz Results", title: "Quiz Results", element: QuizResultsPage, roles: ["super_admin", "admin", "department_head", "employee"] },
  { path: "/assessments/quiz/:quizId/leaderboard", label: "Leaderboard", title: "Leaderboard", element: QuizLeaderboardPage, roles: ["super_admin", "admin", "department_head", "employee"] },
  { path: "/assessments/reports/integrity", label: "Integrity Reports", title: "Integrity Reports", element: ViolationDashboardPage, roles: ["super_admin", "admin", "department_head"] },
];

export { AssessmentsDashboardPage, QuizBuilderPage, TakeQuizPage, QuizResultsPage, QuizLeaderboardPage, ViolationDashboardPage, ASSESSMENTS_ROUTES };
export default ASSESSMENTS_ROUTES;
