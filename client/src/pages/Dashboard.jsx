import { useState } from 'react';
import {
  Users, UserCheck, FileText, BookOpen,
  ClipboardCheck, Award, TrendingUp,
  Calendar, Megaphone,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/lib/utils';
import { StaggerList, MotionItem } from '@/shared/motion';
import useAdminDashboard from './hooks/useAdminDashboard';

const SOP_BY_CATEGORY_DATA = [
  { name: 'Operations', value: 45, count: 19, color: '#F25C05' },
  { name: 'HR & Admin', value: 24, count: 10, color: '#da7756' },
  { name: 'Sales & Marketing', value: 17, count: 7, color: '#d97a6c' },
  { name: 'Finance', value: 9, count: 4, color: '#1D3067' },
  { name: 'IT', value: 5, count: 2, color: '#32667F' },
];

function buildTrainingCompletionData(avgProgress) {
  const base = Number(avgProgress) || 0;
  return [
    { date: 'Week 1', completed: Math.max(0, base - 20) },
    { date: 'Week 2', completed: Math.max(0, base - 10) },
    { date: 'Week 3', completed: Math.max(0, base - 5) },
    { date: 'Week 4', completed: base },
  ];
}

function formatEventDate(dateStr) {
  if (!dateStr) return { date: '', time: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useAdminDashboard();
  const [period, setPeriod] = useState('month');

  const trainingCompletionData = data
    ? buildTrainingCompletionData(data.training?.avg_progress)
    : buildTrainingCompletionData(0);

  const statCards = data ? [
    { label: 'Total Users', value: String(data.users?.total || 0), delta: '+12%', icon: Users, color: 'blue' },
    { label: 'Active Users', value: String(data.users?.active || 0), delta: '+8%', icon: UserCheck, color: 'emerald' },
    { label: 'SOPs Published', value: String(data.sops?.published || 0), delta: '+5%', icon: FileText, color: 'blue' },
    { label: 'Training Completion', value: `${data.training?.avg_progress || 0}%`, delta: '+10%', icon: BookOpen, color: 'blue' },
    { label: 'Assessments Passed', value: '85%', delta: '+7%', icon: ClipboardCheck, color: 'blue' },
    { label: 'Certificates Issued', value: String(data.certificatesIssued || 0), delta: '+15%', icon: Award, color: 'blue' },
  ] : [];

  const announcements = data?.announcements || [];
  const events = data?.events || [];
  const messages = data?.messages || [];
  const departments = data?.departments?.performance || [];
  const taskStats = data?.tasks || {};

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={refetch}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 sm:mt-1">Welcome back, Admin!</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-neutral-500">
          <Calendar size={14} className="hidden sm:block" />
          <span>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            <span className="hidden sm:inline">, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </div>

      {/* Stat Cards - fluid grid */}
      <StaggerList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <MotionItem key={card.label}>
              <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-neutral-800/50" />
                
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-110",
                        card.color === 'blue' ? 'bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)] dark:bg-[rgba(242,92,5,0.16)] dark:text-[var(--color-primary)]' :
                        card.color === 'emerald' ? 'bg-success-soft text-[var(--color-success)] dark:bg-success-soft dark:text-[var(--color-success)]' :
                        card.color === 'amber' ? 'bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft0/10 dark:text-[var(--color-warning)]' :
                        'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                      )}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">{card.label}</p>
                        <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{card.value}</p>
                      </div>
                    </div>
                     <span className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-[var(--color-success)] dark:text-[var(--color-success)] shrink-0">
                      <TrendingUp size={12} />
                      {card.delta}
                    </span>
                  </div>
                </div>
              </div>
            </MotionItem>
          );
        })}
      </StaggerList>

      {/* Training Completion Overview */}
      <Card className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
          <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Training Completion Overview</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] w-full sm:w-auto"
          >
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="lg:col-span-3 min-h-[250px] sm:min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trainingCompletionData}>
                <defs>
                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F25C05" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F25C05" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    color: 'var(--card-foreground)',
                  }}
                  formatter={(value) => [`${value}%`, 'Completion']}
                />
                <Area type="monotone" dataKey="completed" stroke="#F25C05" strokeWidth={2} fill="url(#orangeGradient)" dot={{ fill: '#F25C05', r: 3 }} activeDot={{ r: 5, fill: '#F25C05' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4 sm:gap-6">
            <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: data?.training?.completed_courses || 0, count: data?.training?.completed_courses || 0, color: '#F25C05' },
                      { name: 'In Progress', value: Math.max(0, (data?.training?.total_enrollments || 0) - (data?.training?.completed_courses || 0)), count: Math.max(0, (data?.training?.total_enrollments || 0) - (data?.training?.completed_courses || 0)), color: '#da7756' },
                      { name: 'Not Started', value: 0, count: 0, color: '#d97a6c' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {[
                      { name: 'Completed', value: data?.training?.completed_courses || 0, count: data?.training?.completed_courses || 0, color: '#F25C05' },
                      { name: 'In Progress', value: Math.max(0, (data?.training?.total_enrollments || 0) - (data?.training?.completed_courses || 0)), count: Math.max(0, (data?.training?.total_enrollments || 0) - (data?.training?.completed_courses || 0)), color: '#da7756' },
                      { name: 'Not Started', value: 0, count: 0, color: '#d97a6c' },
                    ].map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.training?.avg_progress || 0}%</span>
                <span className="text-xs text-neutral-500">Overall</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {[
                { name: 'Completed', value: data?.training?.completed_courses || 0, count: data?.training?.completed_courses || 0, color: '#F25C05' },
                { name: 'In Progress', value: Math.max(0, (data?.training?.total_enrollments || 0) - (data?.training?.completed_courses || 0)), count: Math.max(0, (data?.training?.total_enrollments || 0) - (data?.training?.completed_courses || 0)), color: '#da7756' },
                { name: 'Not Started', value: 0, count: 0, color: '#d97a6c' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">{item.name}</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.value}% ({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {/* Recent Announcements */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Recent Announcements</h2>
            <a href="/announcements" className="text-[11px] sm:text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View All</a>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {announcements.length > 0 ? announcements.map((item, i) => (
              <div key={item.id || i} className="group flex items-start gap-2.5 sm:gap-3 rounded-lg p-2 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)] shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-[rgba(242,92,5,0.16)] dark:text-[var(--color-primary)]">
                  <Megaphone size={14} />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</p>
                   <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                     {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} · {item.author || 'Admin'}
                   </p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">No announcements yet.</p>
            )}
          </div>
        </Card>

        {/* SOPs by Category */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">SOPs by Category</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-[rgba(242,92,5,0.20)]"
            >
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={SOP_BY_CATEGORY_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    dataKey="value"
                    stroke="none"
                  >
                  {SOP_BY_CATEGORY_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">{data?.sops?.total || 0}</span>
                <span className="text-[10px] sm:text-xs text-neutral-500">Total</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {SOP_BY_CATEGORY_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">{item.name}</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* User Activity */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">User Activity</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-[rgba(242,92,5,0.20)]"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { label: 'Logged In Users', value: String(data?.users?.active || 0), icon: UserCheck },
              { label: 'Completed Training', value: String(data?.training?.completed_courses || 0), icon: BookOpen },
              { label: 'Active Learners', value: String(data?.training?.active_learners || 0), icon: ClipboardCheck },
              { label: 'Certificates Issued', value: String(data?.certificatesIssued || 0), icon: Award },
            ].map((item) => (
              <div key={item.label} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-neutral-800/50" />
                <div className="relative flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)] shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-[rgba(242,92,5,0.16)] dark:text-[var(--color-primary)]">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.value}</p>
                    <p className="text-[10px] sm:text-xs text-neutral-500">{item.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Internal Tasks + Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
        {/* Internal Tasks Overview */}
        <Card className="p-3 sm:p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Internal Tasks Overview</h2>
            <a href="/tasks" className="text-[11px] sm:text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View All</a>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {[
              { label: 'Total Tasks', value: String(taskStats.total || 0), color: 'blue' },
              { label: 'In Progress', value: String(taskStats.in_progress || 0), color: 'amber' },
              { label: 'Completed', value: String(taskStats.completed || 0), color: 'emerald' },
              { label: 'Overdue', value: String(taskStats.overdue || 0), color: 'red' },
            ].map((task) => (
              <div key={task.label} className={cn(
                "group relative overflow-hidden rounded-xl p-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                task.color === 'red' ? 'bg-red-50 dark:bg-red-500/10' :
                task.color === 'amber' ? 'bg-warning-soft dark:bg-warning-soft0/10' :
                task.color === 'emerald' ? 'bg-success-soft dark:bg-success-soft' :
                'bg-[rgba(242,92,5,0.08)] dark:bg-[rgba(242,92,5,0.16)]'
              )}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-white/5" />
                <div className="relative">
                  <p className={cn(
                    "text-xl sm:text-2xl font-bold",
                    task.color === 'red' ? 'text-red-600 dark:text-red-400' :
                    task.color === 'amber' ? 'text-[var(--color-warning)] dark:text-[var(--color-warning)]' :
                    task.color === 'emerald' ? 'text-[var(--color-success)] dark:text-[var(--color-success)]' :
                    'text-[var(--color-primary)] dark:text-[var(--color-primary)]'
                  )}>{task.value}</p>
                   <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{task.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Department Performance */}
        <Card className="p-3 sm:p-4 lg:col-span-3 overflow-x-auto">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Department Performance</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-[rgba(242,92,5,0.20)]"
            >
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">Department</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">Total Users</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap hidden sm:table-cell">Training Completion</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap hidden sm:table-cell">Assessments</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap hidden md:table-cell">SOPs Read</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap hidden md:table-cell">Certificates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {departments.length > 0 ? departments.map((row) => (
                <tr key={row.department} className="group transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                  <td className="px-2 sm:px-3 py-2.5 font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{row.department}</td>
                   <td className="px-2 sm:px-3 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{row.totalUsers}</td>
                  <td className="px-2 sm:px-3 py-2.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 min-w-[60px]">
                        <div className="h-full rounded-full bg-[rgba(242,92,5,0.08)]0 transition-all duration-500" style={{ width: `${row.trainingCompletion}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 w-10 text-right">{row.trainingCompletion}%</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-2.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 min-w-[60px]">
                        <div className="h-full rounded-full bg-success-soft0 transition-all duration-500" style={{ width: `${row.assessmentsPassed}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 w-10 text-right">{row.assessmentsPassed}%</span>
                    </div>
                  </td>
                   <td className="px-2 sm:px-3 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap hidden md:table-cell">{row.sopsRead}</td>
                   <td className="px-2 sm:px-3 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap hidden md:table-cell">{row.certificatesIssued}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-neutral-400 dark:text-neutral-500">No departments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Upcoming Events + Recent Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
        {/* Upcoming Events */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Upcoming Events</h2>
            <a href="/events" className="text-[11px] sm:text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View All</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-3">
            {events.length > 0 ? events.map((event, i) => {
              const formatted = formatEventDate(event.event_date || event.start_date || event.created_at);
              return (
                <div key={event.id || i} className="group flex items-center gap-2.5 sm:gap-3 rounded-lg p-2.5 transition-all duration-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)] shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-[rgba(242,92,5,0.16)] dark:text-[var(--color-primary)]">
                    <Calendar size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{event.title}</p>
                     <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{formatted.date} · {formatted.time}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 col-span-full">No upcoming events.</p>
            )}
          </div>
        </Card>

        {/* Recent Messages */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Recent Messages</h2>
            <a href="/messaging" className="text-[11px] sm:text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View All</a>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {messages.length > 0 ? messages.map((msg, i) => {
              const formatted = formatEventDate(msg.last_message_at);
              return (
                <div key={msg.id || i} className="group flex items-start gap-2.5 sm:gap-3 rounded-lg p-2 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-secondary-hover)] text-white text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-110">
                    {(msg.subject || 'M').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{msg.subject || 'No subject'}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">{msg.last_message_body || ''}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{formatted.date} {formatted.time ? `· ${formatted.time}` : ''}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">No recent messages.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
