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
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { StaggerList, MotionItem } from '@/shared/motion';

const STAT_CARDS = [
  { label: 'Total Users', value: '128', delta: '+12%', icon: Users, color: 'blue' },
  { label: 'Active Users', value: '96', delta: '+8%', icon: UserCheck, color: 'emerald' },
  { label: 'SOPs Published', value: '42', delta: '+5%', icon: FileText, color: 'blue' },
  { label: 'Training Completion', value: '78%', delta: '+10%', icon: BookOpen, color: 'blue' },
  { label: 'Assessments Passed', value: '85%', delta: '+7%', icon: ClipboardCheck, color: 'blue' },
  { label: 'Certificates Issued', value: '112', delta: '+15%', icon: Award, color: 'blue' },
];

const TRAINING_COMPLETION_DATA = [
  { date: 'May 1', completed: 45 },
  { date: 'May 3', completed: 52 },
  { date: 'May 5', completed: 48 },
  { date: 'May 7', completed: 61 },
  { date: 'May 9', completed: 58 },
  { date: 'May 11', completed: 67 },
  { date: 'May 13', completed: 72 },
  { date: 'May 15', completed: 69 },
  { date: 'May 17', completed: 74 },
  { date: 'May 19', completed: 78 },
  { date: 'May 21', completed: 82 },
  { date: 'May 22', completed: 78 },
];

const DONUT_DATA = [
  { name: 'Completed', value: 78, count: 100, color: '#F25C05' },
  { name: 'In Progress', value: 15, count: 19, color: '#da7756' },
  { name: 'Not Started', value: 7, count: 9, color: '#d97a6c' },
];

const SOP_BY_CATEGORY_DATA = [
  { name: 'Operations', value: 45, count: 19, color: '#F25C05' },
  { name: 'HR & Admin', value: 24, count: 10, color: '#da7756' },
  { name: 'Sales & Marketing', value: 17, count: 7, color: '#d97a6c' },
  { name: 'Finance', value: 9, count: 4, color: '#1D3067' },
  { name: 'IT', value: 5, count: 2, color: '#32667F' },
];

const USER_ACTIVITY_DATA = [
  { label: 'Logged In Users', value: 96, icon: UserCheck },
  { label: 'Completed Training', value: 74, icon: BookOpen },
  { label: 'Assessments Taken', value: 68, icon: ClipboardCheck },
  { label: 'Certificates Issued', value: 55, icon: Award },
];

const TASK_OVERVIEW = [
  { label: 'Total Tasks', value: 24, color: 'blue' },
  { label: 'In Progress', value: 14, color: 'amber' },
  { label: 'Completed', value: 8, color: 'emerald' },
  { label: 'Overdue', value: 2, color: 'red' },
];

const DEPARTMENT_DATA = [
  { department: 'Operations', totalUsers: 36, trainingCompletion: 85, assessmentsPassed: 90, sopsRead: 120, certificatesIssued: 32 },
  { department: 'HR & Admin', totalUsers: 28, trainingCompletion: 80, assessmentsPassed: 88, sopsRead: 95, certificatesIssued: 26 },
  { department: 'Sales & Marketing', totalUsers: 24, trainingCompletion: 75, assessmentsPassed: 82, sopsRead: 80, certificatesIssued: 18 },
  { department: 'Finance', totalUsers: 20, trainingCompletion: 70, assessmentsPassed: 78, sopsRead: 65, certificatesIssued: 12 },
  { department: 'IT', totalUsers: 20, trainingCompletion: 90, assessmentsPassed: 95, sopsRead: 100, certificatesIssued: 24 },
];

const ANNOUNCEMENTS = [
  { title: 'New SOP: Client Onboarding Process', date: 'May 22, 2025', author: 'Admin' },
  { title: 'Q2 Training Schedule Updated', date: 'May 20, 2025', author: 'HR' },
  { title: 'System Maintenance Window', date: 'May 18, 2025', author: 'IT' },
  { title: 'New Assessment: Safety Protocols', date: 'May 15, 2025', author: 'Admin' },
];

const UPCOMING_EVENTS = [
  { title: 'Team Building Activity', date: 'May 30, 2025', time: '9:00 AM' },
  { title: 'SOP Review Meeting', date: 'Jun 2, 2025', time: '2:00 PM' },
  { title: 'Quarterly Training Assessment', date: 'Jun 5, 2025', time: '10:00 AM' },
];

const RECENT_MESSAGES = [
  { sender: 'John D.', preview: 'Please review the updated SOP for...', time: '2m ago', unread: 2 },
  { sender: 'Sarah M.', preview: 'Training completion report is ready', time: '15m ago', unread: 0 },
  { sender: 'Mike R.', preview: 'Can you approve the new course?', time: '1h ago', unread: 1 },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('month');

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
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <MotionItem key={card.label}>
              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      card.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                      card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      card.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                      'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    )}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">{card.label}</p>
                      <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{card.value}</p>
                    </div>
                  </div>
                   <span className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    <TrendingUp size={12} />
                    {card.delta}
                  </span>
                </div>
              </Card>
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
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-auto"
          >
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="lg:col-span-3 min-h-[250px] sm:min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRAINING_COMPLETION_DATA}>
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
                    data={DONUT_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                  {DONUT_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">78%</span>
                <span className="text-xs text-neutral-500">Overall</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {DONUT_DATA.map((item) => (
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
            <a href="#" className="text-[11px] sm:text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {ANNOUNCEMENTS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 sm:gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Megaphone size={14} />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</p>
                   <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{item.date} · {item.author}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SOPs by Category */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">SOPs by Category</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
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
                <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">42</span>
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
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {USER_ACTIVITY_DATA.map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-1.5 sm:gap-2">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.value}</p>
                  <p className="text-[10px] sm:text-xs text-neutral-500">{item.label}</p>
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
            <a href="#" className="text-[11px] sm:text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {TASK_OVERVIEW.map((task) => (
              <div key={task.label} className={cn(
                "rounded-xl p-3 text-center",
                task.color === 'red' ? 'bg-red-50 dark:bg-red-500/10' :
                task.color === 'amber' ? 'bg-amber-50 dark:bg-amber-500/10' :
                task.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                'bg-blue-50 dark:bg-blue-500/10'
              )}>
                <p className={cn(
                  "text-xl sm:text-2xl font-bold",
                  task.color === 'red' ? 'text-red-600 dark:text-red-400' :
                  task.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                  task.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                  'text-blue-600 dark:text-blue-400'
                )}>{task.value}</p>
                 <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{task.label}</p>
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
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
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
              {DEPARTMENT_DATA.map((row) => (
                <tr key={row.department} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-2 sm:px-3 py-2.5 font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{row.department}</td>
                   <td className="px-2 sm:px-3 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{row.totalUsers}</td>
                  <td className="px-2 sm:px-3 py-2.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 min-w-[60px]">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${row.trainingCompletion}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 w-10 text-right">{row.trainingCompletion}%</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-2.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 min-w-[60px]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.assessmentsPassed}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 w-10 text-right">{row.assessmentsPassed}%</span>
                    </div>
                  </td>
                   <td className="px-2 sm:px-3 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap hidden md:table-cell">{row.sopsRead}</td>
                   <td className="px-2 sm:px-3 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap hidden md:table-cell">{row.certificatesIssued}</td>
                </tr>
              ))}
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
            <a href="#" className="text-[11px] sm:text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-3">
            {UPCOMING_EVENTS.map((event, i) => (
              <div key={i} className="flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Calendar size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{event.title}</p>
                   <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{event.date} · {event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Messages */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Recent Messages</h2>
            <a href="#" className="text-[11px] sm:text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {RECENT_MESSAGES.map((msg, i) => (
              <div key={i} className="flex items-start gap-2.5 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold">
                  {msg.sender.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{msg.sender}</span>
                    {msg.unread > 0 && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{msg.unread}</span>
                    )}
                  </div>
                   <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">{msg.preview}</p>
                   <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
