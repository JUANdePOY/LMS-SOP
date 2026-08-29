// Project / view constants for the task & project management redesign.

export const PROJECT_STATUSES = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
];

export const PROJECT_STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PROJECT_STATUS_CLASS = {
  planning: 's-planning',
  active: 's-active',
  on_hold: 's-on_hold',
  completed: 's-completed',
  cancelled: 's-cancelled',
};

export const PROJECT_VIEW_TYPES = [
  'list',
  'board',
  'table',
  'timeline',
  'calendar',
  'workload',
  'whiteboard',
];

export const PROJECT_VIEW_LABELS = {
  list: 'List',
  board: 'Board',
  table: 'Table',
  timeline: 'Timeline',
  calendar: 'Calendar',
  workload: 'Workload',
  whiteboard: 'Whiteboard',
};

export const PROJECT_VIEW_ICONS = {
  list: 'List',
  board: 'KanbanSquare',
  table: 'Table',
  timeline: 'GanttChart',
  calendar: 'CalendarDays',
  workload: 'Users',
  whiteboard: 'PenTool',
};

export const DEFAULT_PROJECT_VIEWS = [
  'list',
  'board',
  'table',
  'timeline',
  'calendar',
  'workload',
];

export const FIELD_TYPES = ['text', 'number', 'select', 'multiselect', 'date', 'user'];

export const FIELD_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  multiselect: 'Multi-select',
  date: 'Date',
  user: 'User',
};

export const PROJECT_COLORS = [
  '#C14E08',
  '#1D4ED8',
  '#047857',
  '#B45309',
  '#7C3AED',
  '#BE185D',
  '#0891B2',
  '#4B5563',
];
