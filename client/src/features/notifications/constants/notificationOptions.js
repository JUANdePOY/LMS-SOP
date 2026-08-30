// Notification preference options derived from the backend model.
// Categories map to the `category` column on notifications; channels map to the
// `channels` object in user_notification_preferences. Keep these in sync with
// DEFAULT_CATEGORIES / DEFAULT_CHANNELS in server/migrations/banners.js.

export const NOTIFICATION_CATEGORIES = [
  {
    key: 'task',
    label: 'Task Assigned',
    description: 'When a task is assigned to you',
    icon: 'CheckSquare',
  },
  {
    key: 'mention',
    label: 'Mentions',
    description: 'When you are mentioned in a task comment',
    icon: 'AtSign',
  },
  {
    key: 'task_admin',
    label: 'Task Admin Alerts',
    description: 'When a task you manage is completed or overdue',
    icon: 'AlertTriangle',
  },
  {
    key: 'system',
    label: 'System',
    description: 'Account, maintenance and general system messages',
    icon: 'Settings',
  },
  {
    key: 'social',
    label: 'Social',
    description: 'Direct messages and social interactions',
    icon: 'MessageSquare',
  },
  {
    key: 'training',
    label: 'Training',
    description: 'Course enrollments and learning updates',
    icon: 'GraduationCap',
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Security alerts and sign-in activity',
    icon: 'Shield',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Product news and promotional messages',
    icon: 'Megaphone',
  },
];

export const NOTIFICATION_CHANNELS = [
  {
    key: 'in_app',
    label: 'In-App',
    description: 'Show in the notifications panel',
    icon: 'Monitor',
  },
  {
    key: 'push',
    label: 'Push',
    description: 'Browser push notifications',
    icon: 'Smartphone',
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Email notifications',
    icon: 'Mail',
  },
  {
    key: 'sound',
    label: 'Sound',
    description: 'Play a sound alert',
    icon: 'Volume2',
  },
];

export const DEFAULT_QUIET_HOURS = {
  enabled: 0,
  start: '22:00:00',
  end: '07:00:00',
  timezone: 'UTC',
};
