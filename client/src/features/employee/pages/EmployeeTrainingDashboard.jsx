import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen, GraduationCap, ClipboardCheck, Award,
  Megaphone, Trophy, Calendar, ChevronDown, ArrowRight,
} from "lucide-react";

import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import PanelCard from "../components/dashboard/PanelCard";
import ProgressBar from "../components/dashboard/ProgressBar";
import DonutChart from "../components/dashboard/DonutChart";
import TrainingLineChart from "../components/dashboard/TrainingLineChart";
import LeaderboardPodium from "../components/dashboard/LeaderboardPodium";

const TRAINING_DATA = [
  { date: "May 1", value: 40 },
  { date: "May 3", value: 48 },
  { date: "May 5", value: 45 },
  { date: "May 7", value: 58 },
  { date: "May 9", value: 55 },
  { date: "May 11", value: 64 },
  { date: "May 13", value: 70 },
  { date: "May 15", value: 67 },
  { date: "May 17", value: 73 },
  { date: "May 19", value: 76 },
  { date: "May 21", value: 80 },
  { date: "May 22", value: 78 },
];

const SOP_STATUS = [
  { name: "Completed", value: 78, count: 14, color: "#2F5EFF" },
  { name: "In Progress", value: 17, count: 3, color: "#7CA0FF" },
  { name: "Not Started", value: 5, count: 1, color: "#E2E8F0" },
];

const ANNOUNCEMENTS = [
  { title: "New SOP: Employee Onboarding Process", date: "May 22, 2025", author: "HR Department" },
  { title: "Reminder: Update Your Training", date: "May 20, 2025", author: "HR Department" },
  { title: "System Maintenance on May 28", date: "May 18, 2025", author: "Admin" },
  { title: "Company Event: Team Building", date: "May 15, 2025", author: "Admin" },
];

const SOP_HIGHLIGHTS = [
  { title: "Employee Onboarding Process", status: "Completed", progress: 100, updated: "May 20, 2025" },
  { title: "Workplace Safety Guidelines", status: "Completed", progress: 100, updated: "May 18, 2025" },
  { title: "Data Privacy & Security", status: "In Progress", progress: 65, updated: "May 21, 2025" },
  { title: "Customer Service Standards", status: "In Progress", progress: 40, updated: "May 19, 2025" },
];

const LEADERBOARD = [
  { rank: 1, name: "Jane D.", points: 145 },
  { rank: 2, name: "Mark T.", points: 120 },
  { rank: 3, name: "Maria S.", points: 110 },
  { rank: 4, name: "John R.", points: 95 },
  { rank: 5, name: "Lisa M.", points: 90 },
];

const TASKS = [
  { label: "To Do", value: 5, icon: BookOpen, color: "blue" },
  { label: "In Progress", value: 3, icon: GraduationCap, color: "amber" },
  { label: "Completed", value: 12, icon: ClipboardCheck, color: "emerald" },
  { label: "Overdue", value: 1, icon: Award, color: "rose" },
];

const EVENTS = [
  { title: "Team Building Activity", date: "May 30, 2025", time: "9:00 AM" },
  { title: "SOP Review Meeting", date: "Jun 2, 2025", time: "2:00 PM" },
  { title: "Quarterly Training Assessment", date: "Jun 5, 2025", time: "10:00 AM" },
];

function FilterSelect({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ViewAllLink({ onClick, label = "View All" }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
    >
      {label}
    </button>
  );
}

export default function EmployeeTrainingDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(" ")[0] || "Jane";
  const department = user?.department || "HR Department";

  const [trainingPeriod, setTrainingPeriod] = useState("month");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("month");

  return (
    <div className="w-full max-w-none space-y-6 bg-slate-50 dark:bg-neutral-950">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-[28px]">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Welcome back, {firstName}!</p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="SOPs Assigned"
          value="18 SOPs"
          icon={BookOpen}
          color="blue"
          caption="100% of assigned"
          progress={100}
        />
        <DashboardStatCard
          label="Training Progress"
          value="78%"
          icon={GraduationCap}
          color="emerald"
          caption="14 of 18 completed"
          progress={78}
        />
        <DashboardStatCard
          label="Assessments Passed"
          value="92%"
          icon={ClipboardCheck}
          color="purple"
          caption="12 of 13 passed"
          progress={92}
        />
        <DashboardStatCard
          label="Certificates Earned"
          value="7"
          icon={Award}
          color="amber"
          link={{ label: "View all certificates", href: "/certificates/my-certificates" }}
        />
      </div>

      {/* Training Progress + SOPs by Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelCard
          className="lg:col-span-2"
          title="My Training Progress"
          action={
            <FilterSelect value={trainingPeriod} onChange={setTrainingPeriod}>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="quarter">This Quarter</option>
            </FilterSelect>
          }
        >
          <TrainingLineChart data={TRAINING_DATA} />
        </PanelCard>

        <PanelCard title="SOPs by Status">
          <DonutChart data={SOP_STATUS} total={18} />
        </PanelCard>
      </div>

      {/* Announcements + My SOP Highlights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard title="Announcements" action={<ViewAllLink onClick={() => navigate("/announcements")} />}>
          <ul className="space-y-3">
            {ANNOUNCEMENTS.map((item, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Megaphone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">{item.date} &middot; {item.author}</p>
                </div>
              </li>
            ))}
          </ul>
        </PanelCard>

        <PanelCard
          title={`My SOP Highlights (${department})`}
          action={<ViewAllLink onClick={() => navigate("/sops")} />}
        >
          <ul className="space-y-4">
            {SOP_HIGHLIGHTS.map((sop, i) => (
              <li key={i}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{sop.title}</p>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                      (sop.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300")
                    }
                  >
                    {sop.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={sop.progress} color={sop.status === "Completed" ? "emerald" : "amber"} />
                  <span className="shrink-0 text-xs font-semibold text-neutral-900 dark:text-neutral-100">{sop.progress}%</span>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">Last updated: {sop.updated}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-center">
            <a href="/sops" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all SOPs</a>
          </div>
        </PanelCard>
      </div>

      {/* Department Leaderboard + My Tasks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard
          title="Department Leaderboard"
          action={
            <FilterSelect value={leaderboardPeriod} onChange={setLeaderboardPeriod}>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </FilterSelect>
          }
        >
          <LeaderboardPodium entries={LEADERBOARD} />
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-neutral-800">
            {LEADERBOARD.slice(3).map((user) => (
              <li key={user.rank} className="flex items-center gap-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-neutral-800">
                  {user.rank}
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {user.name.split(" ").map((p) => p[0]).join("")}
                </div>
                <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.points} pts</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-center">
            <button onClick={() => navigate("/assessments/leaderboard")} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View full leaderboard
            </button>
          </div>
        </PanelCard>

        <PanelCard title="My Tasks" action={<ViewAllLink onClick={() => navigate("/tasks/my")} label="View All" />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TASKS.map((task) => {
              const Icon = task.icon;
              return (
                <div key={task.label} className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center dark:border-neutral-800 dark:bg-neutral-800/30">
                  <div className={
                    "flex h-9 w-9 items-center justify-center rounded-lg " +
                    (task.color === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
                    task.color === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                    task.color === "emerald" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")
                  }>
                    <Icon size={18} />
                  </div>
                  <p className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{task.value}</p>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">{task.label}</p>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </div>

      {/* Upcoming Events */}
      <PanelCard title="Upcoming Events" action={<ViewAllLink onClick={() => navigate("/events")} label="View Calendar" />}>
        <ul className="space-y-2">
          {EVENTS.map((event, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{event.title}</p>
                <p className="text-xs text-slate-400 dark:text-neutral-500">{event.date} &middot; {event.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </PanelCard>

      {/* Bottom CTA Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-blue-50 p-6 dark:bg-blue-500/10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Keep up the great work, {firstName}!</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">You're making solid progress. Keep completing your SOPs to stay on track.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/sops")}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Browse My SOPs
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
