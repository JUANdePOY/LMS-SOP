import { useState } from 'react';
import {
  Users, UserCheck, FileText, BookOpen,
  ClipboardCheck, Award, TrendingUp,
  BarChart3, PieChart, Calendar,
  MessageSquare, Bell, Megaphone,
  CheckSquare, AlertTriangle, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ['#2F6FED', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
  { name: 'Completed', value: 78, count: 100, color: '#2F6FED' },
  { name: 'In Progress', value: 15, count: 19, color: '#F59E0B' },
  { name: 'Not Started', value: 7, count: 9, color: '#94A3B8' },
];

const SOP_BY_CATEGORY_DATA = [
  { name: 'Operations', value: 45, count: 19, color: '#2F6FED' },
  { name: 'HR & Admin', value: 24, count: 10, color: '#10B981' },
  { name: 'Sales & Marketing', value: 17, count: 7, color: '#F59E0B' },
  { name: 'Finance', value: 9, count: 4, color: '#8B5CF6' },
  { name: 'IT', value: 5, count: 2, color: '#EF4444' },
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Welcome back, Admin!</p>
        </div>
        <div className="text-sm text-neutral-500">
          Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                    card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                    card.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  )}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">{card.label}</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{card.value}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <TrendingUp size={12} />
                  {card.delta}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Training Completion Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Training Completion Overview</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRAINING_COMPLETION_DATA}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value) => [`${value}%`, 'Completion']}
                />
                <Area type="monotone" dataKey="completed" stroke="#2F6FED" strokeWidth={2} fill="url(#blueGradient)" dot={{ fill: '#2F6FED', r: 3 }} activeDot={{ r: 5, fill: '#2F6FED' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="relative" style={{ width: 180, height: 180 }}>
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
                  {DONUT_DATA.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </RePieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">78%</span>
                <span className="text-xs text-neutral-500">Overall</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              {DONUT_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.name}</span>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.value}% ({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Announcements */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Recent Announcements</h2>
            <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="space-y-3">
            {ANNOUNCEMENTS.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Megaphone size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{item.date} · {item.author}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SOPs by Category */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">SOPs by Category</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <div className="relative" style={{ width: 160, height: 160 }}>
              <RePieChart>
                <Pie
                  data={SOP_BY_CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                >
                  {SOP_BY_CATEGORY_DATA.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </RePieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">42</span>
                <span className="text-xs text-neutral-500">Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 ml-4">
              {SOP_BY_CATEGORY_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.name}</span>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* User Activity */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">User Activity</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="space-y-4">
            {USER_ACTIVITY_DATA.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <item.icon size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.label}</span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{item.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${(item.value / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Internal Tasks + Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Internal Tasks Overview */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Internal Tasks Overview</h2>
            <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TASK_OVERVIEW.map((task) => (
              <div key={task.label} className={cn(
                "rounded-xl p-3 text-center",
                task.color === 'red' ? 'bg-red-50 dark:bg-red-500/10' :
                task.color === 'amber' ? 'bg-amber-50 dark:bg-amber-500/10' :
                task.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                'bg-blue-50 dark:bg-blue-500/10'
              )}>
                <p className={cn(
                  "text-2xl font-bold",
                  task.color === 'red' ? 'text-red-600 dark:text-red-400' :
                  task.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                  task.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                  'text-blue-600 dark:text-blue-400'
                )}>{task.value}</p>
                <p className="text-xs text-neutral-500 mt-1">{task.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Department Performance */}
        <Card className="p-4 lg:col-span-3 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Department Performance</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-3 py-2 text-left font-semibold text-neutral-500">Department</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-500">Total Users</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-500">Training Completion</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-500">Assessments Passed</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-500">SOPs Read</th>
                <th className="px-3 py-2 text-left font-semibold text-neutral-500">Certificates Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {DEPARTMENT_DATA.map((row) => (
                <tr key={row.department} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{row.department}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{row.totalUsers}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${row.trainingCompletion}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 w-10 text-right">{row.trainingCompletion}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.assessmentsPassed}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 w-10 text-right">{row.assessmentsPassed}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{row.sopsRead}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{row.certificatesIssued}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Upcoming Events + Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Upcoming Events</h2>
            <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="space-y-3">
            {UPCOMING_EVENTS.map((event, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Calendar size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{event.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{event.date} · {event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Messages */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Recent Messages</h2>
            <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="space-y-3">
            {RECENT_MESSAGES.map((msg, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold">
                  {msg.sender.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{msg.sender}</span>
                    {msg.unread > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{msg.unread}</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{msg.preview}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}