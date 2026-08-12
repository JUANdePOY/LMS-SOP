import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyQuizzes } from "../hooks/useMyQuizzes";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { LayoutGrid, Play, Clock, Trophy } from "lucide-react";
import { StaggerList, MotionItem } from "@/shared/motion";

const TYPE_LABEL = { practice: "Practice", final: "Final" };
const STATUS_LABEL = { draft: "Draft", published: "Published", archived: "Archived" };

export default function AssessmentsDashboardPage() {
  const { isAnyAdmin } = useAuth();
  const { data: quizzes, loading, error } = useMyQuizzes();

  if (isAnyAdmin) return <Navigate to="/assessments/manage" replace />;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Quizzes</h1>
          <p className="text-sm text-neutral-500">Quizzes assigned to you across your courses.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <LayoutGrid className="h-10 w-10 mx-auto text-neutral-300" />
            <p className="mt-3 text-neutral-500">You have no quizzes assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <MotionItem key={q.id}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{q.title}</CardTitle>
                  <CardDescription>
                    {q.course_title || `Course #${q.course_id}`} · {TYPE_LABEL[q.quiz_type] || q.quiz_type} · {STATUS_LABEL[q.status] || q.status}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-neutral-600">
                    {q.time_limit ? <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{q.time_limit}m</span> : null}
                    <span className="flex items-center gap-1"><Play className="h-4 w-4" />{q.attempts_allowed ?? (q.quiz_type === "final" ? 3 : "∞")} attempts</span>
                  </div>
                  <div className="flex gap-1">
                    {q.status === "published" && (
                      <Button size="sm" asChild>
                        <Link to={`/assessments/quiz/${q.id}/take`}><Play className="h-4 w-4 mr-1" /> Take</Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/assessments/quiz/${q.id}/results`}><Trophy className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MotionItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
