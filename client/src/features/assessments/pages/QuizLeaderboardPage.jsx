import { useParams, useSearchParams, Link } from "react-router-dom";
import { useMyQuizzes } from "../hooks/useMyQuizzes";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Trophy, Medal, Award, Clock, TrendingUp, Users, BarChart3, Crown, Star } from "lucide-react";

const RANK_ICONS = { 1: Crown, 2: Medal, 3: Award };

function formatTime(sec) {
  const s = Number(sec) || 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

function ScoreBadge({ value }) {
  const tone =
    value >= 80
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : value >= 60
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {value}%
    </span>
  );
}

function RankCell({ rank }) {
  const Icon = RANK_ICONS[rank] || null;
  const conf =
    rank === 1
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : rank === 2
      ? "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
      : rank === 3
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400";

  return (
    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full">
      {Icon ? (
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${conf}`}>
          <Icon className="h-4 w-4" />
        </div>
      ) : (
        <span className={`text-sm font-bold ${conf} w-8 h-8 inline-flex items-center justify-center rounded-full`}>{rank}</span>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent = "blue" }) {
  const palette = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <Card className="border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="py-4 text-center">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full mb-2 ${palette[accent]}`}>
          {Icon && <Icon className="h-4.5 w-4.5" />}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</div>
        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function QuizLeaderboardPage() {
  const { quizId: paramQuizId } = useParams();
  const [searchParams] = useSearchParams();
  const quizId = paramQuizId || searchParams.get("quizId");
  const { data: myQuizzes, loading: myQuizzesLoading, error: myQuizzesError } = useMyQuizzes();
  const { data: board, loading: boardLoading, error: boardError } = useLeaderboard({ quizId });

  if (!quizId) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.35),rgba(147,51,234,0.10),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),rgba(168,85,247,0.14),transparent_45%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Leaderboard</h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Select a quiz to view its leaderboard</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/assessments/leaderboard">All Quizzes</Link>
            </Button>
          </div>
        </div>

        {myQuizzesLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
            ))}
          </div>
        )}

        {myQuizzesError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm">
            <p className="font-medium text-red-800 dark:text-red-200 mb-1">Failed to load quizzes</p>
            <p className="text-red-600 dark:text-red-300">{myQuizzesError}</p>
          </div>
        )}

        {!myQuizzesLoading && !myQuizzesError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(myQuizzes || []).map((q) => (
              <Link
                key={q.id}
                to={`/assessments/quiz/${q.id}/leaderboard`}
                className="group relative rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md hover:border-blue-300/80 dark:hover:border-blue-500/40 transition-all duration-200"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-200">{q.title}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{q.course_title}</div>
                  </div>
                  <Trophy className="h-4 w-4 text-neutral-300 dark:text-neutral-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200" />
                </div>
              </Link>
            ))}
            {(myQuizzes || []).length === 0 && (
              <Card className="border border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 md:col-span-2">
                <CardContent className="py-10 text-center">
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No quizzes available</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Create and publish a quiz to see leaderboard entries.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  const topScore = board.length > 0 ? Number(board[0].percentage) : 0;
  const averageScore = board.length > 0 ? Math.round(board.reduce((s, r) => s + Number(r.percentage), 0) / board.length) : 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.35),rgba(147,51,234,0.10),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),rgba(168,85,247,0.14),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Leaderboard</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Ranked by score, then fastest time, then fewer attempts</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/assessments/leaderboard">All Quizzes</Link>
          </Button>
        </div>
      </div>

      {boardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm">
          <p className="font-medium text-red-800 dark:text-red-200 mb-1">Failed to load leaderboard</p>
          <p className="text-red-600 dark:text-red-300">{boardError}</p>
        </div>
      )}

      {board.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Ranked" value={board.length} icon={Users} accent="blue" />
          <StatCard label="Top Score" value={`${topScore}%`} icon={TrendingUp} accent="emerald" />
          <StatCard label="Average" value={`${averageScore}%`} icon={BarChart3} accent="purple" />
        </div>
      )}

      {boardLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
          ))}
        </div>
      ) : !board.length ? (
        <Card className="border border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900">
          <CardContent className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3">
              <Trophy className="h-6 w-6 text-neutral-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No ranked attempts yet</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Be the first to complete this quiz!</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Rankings</CardTitle>
                <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Ranked by score, then fastest time, then fewer attempts</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>{board.length} entries</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/80">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-28">Score</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-28">Time</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-24">Attempt</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((r, idx) => {
                    const isTopThree = r.rank <= 3;
                    return (
                      <tr
                        key={r.user_id}
                        className={`border-b border-neutral-200 dark:border-neutral-700 last:border-0 transition-colors duration-150 ${
                          isTopThree
                            ? "bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50/70 dark:hover:bg-amber-900/15"
                            : idx % 2 === 0
                            ? "bg-white dark:bg-neutral-900 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50"
                            : "bg-neutral-50/40 dark:bg-neutral-800/30 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <RankCell rank={r.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">{r.user_name || r.user_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 max-w-[60px]">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(Number(r.percentage) || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 min-w-[3rem]">{r.score}/{r.max_score}</span>
                            <ScoreBadge value={Number(r.percentage)} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                            <Clock className="h-3.5 w-3.5 text-neutral-400" />
                            {r.time_taken_sec != null ? formatTime(r.time_taken_sec) : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">#{r.attempt_number}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
