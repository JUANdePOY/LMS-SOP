import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Library,
  ClipboardCheck,
  Award,
  Users,
  Building2,
  MessageSquare,
  Megaphone,
  Calendar,
  CheckSquare,
  BarChart3,
  PieChart,
  Settings,
  Shield,
} from "lucide-react";

export const LMS_ROLES = ['super_admin', 'admin', 'department_head', 'employee'];

export function filterMenuByRole(items, userRole) {
  if (!userRole) return items;
  return items
    .filter((item) => !item.roles || item.roles.includes(userRole))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((c) => !c.roles || c.roles.includes(userRole)),
        };
      }
      return item;
    });
}

export const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview & summary",
    roles: LMS_ROLES,
  },
  {
    name: "SOP Management",
    path: "/sops",
    icon: FileText,
    description: "Create and manage SOPs",
    roles: LMS_ROLES,
  },
  {
    name: "Course Management",
    path: "/courses",
    icon: BookOpen,
    description: "Create and assign courses",
    roles: LMS_ROLES,
  },
  {
    name: "Course Library",
    path: "/course-library",
    icon: Library,
    description: "Browse course catalog",
    roles: LMS_ROLES,
  },
  {
    name: "Assessments",
    path: "/assessments",
    icon: ClipboardCheck,
    description: "Quizzes and assessments",
    roles: LMS_ROLES,
    children: [
      { name: "Leaderboard", path: "/assessments/leaderboard", icon: Award },
      { name: "Report", path: "/assessments/report", icon: BarChart3 },
    ],
  },
  {
    name: "Certificates",
    path: "/certificates",
    icon: Award,
    description: "Certificate management",
    roles: LMS_ROLES,
  },
  {
    name: "Users & Departments",
    path: "/users",
    icon: Users,
    description: "Manage users and departments",
    roles: LMS_ROLES,
  },
  {
    name: "Messaging",
    path: "/messaging",
    icon: MessageSquare,
    description: "Direct and group messages",
    roles: LMS_ROLES,
  },
  {
    name: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    description: "Org-wide announcements",
    roles: LMS_ROLES,
  },
  {
    name: "Events",
    path: "/events",
    icon: Calendar,
    description: "Company calendar",
    roles: LMS_ROLES,
  },
  {
    name: "Tasks & Projects",
    path: "/tasks",
    icon: CheckSquare,
    description: "Task tracking and kanban",
    roles: LMS_ROLES,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: BarChart3,
    description: "Exportable reports",
    roles: LMS_ROLES,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: PieChart,
    description: "Trend dashboards",
    roles: LMS_ROLES,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Org settings and config",
    roles: ['super_admin'],
  },
  {
    name: "Audit Logs",
    path: "/audit-logs",
    icon: Shield,
    description: "System activity log",
    roles: ['super_admin'],
  },
];