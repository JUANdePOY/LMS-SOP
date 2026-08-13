import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Library,
  ClipboardCheck,
  Award,
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

// Recursively keep only the parts of a menu item visible to `userRole`.
// Handles both shapes used across the app:
//   - config `menuItems`: groups use `children`
//   - Sidebar `MENU_ITEMS`: groups use `items`, items may use `sub`
function filterMenuItem(item, userRole) {
  const roleAllowed = !item.roles || item.roles.includes(userRole);
  if (!roleAllowed) return null;

  if (Array.isArray(item.items)) {
    const visibleItems = item.items
      .map((sub) => filterMenuItem(sub, userRole))
      .filter(Boolean);
    if (visibleItems.length === 0) return null;
    return { ...item, items: visibleItems };
  }

  if (Array.isArray(item.children)) {
    const visibleChildren = item.children
      .map((child) => filterMenuItem(child, userRole))
      .filter(Boolean);
    if (visibleChildren.length === 0) return null;
    return { ...item, children: visibleChildren };
  }

  if (Array.isArray(item.sub)) {
    const visibleSub = item.sub.filter(
      (subItem) => typeof subItem === "string" || !subItem.roles || subItem.roles.includes(userRole)
    );
    return { ...item, sub: visibleSub };
  }

  return item;
}

export function filterMenuByRole(items, userRole) {
  if (!userRole) return items;
  return items.map((item) => filterMenuItem(item, userRole)).filter(Boolean);
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
    path: "/courses/library",
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
      { name: "Leaderboard", path: "/assessments/leaderboard", icon: Award, roles: ["super_admin", "admin", "department_head"] },
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
    roles: ['super_admin'],
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
