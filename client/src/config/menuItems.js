import {
  LayoutDashboard,
  UserSquare,
  MapPin,
  Dumbbell,
  ClipboardList,
  BarChart3,
  Package,
  FileText,
  Shield,
  Users,
  Layers,
  PlaneTakeoff,
  Megaphone,
  CalendarDays,
  Settings as SettingsIcon,
} from "lucide-react";

// Role requirements for menu items (undefined = any authenticated user)
export const ADMIN_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];

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
  },
  {
    name: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    description: "Updates & notices",
  },
   {
     name: "Reservists",
     path: "/reservists",
     icon: UserSquare,
     description: "Manage reservists",
     // Only admins can access full list (reservists blocked by backend + route guard)
     roles: ADMIN_ROLES,
   },
   {
     name: "Airbase",
     path: "/airbase",
     icon: PlaneTakeoff,
     description: "Airbase hierarchy management",
     roles: ADMIN_ROLES,
     children: [
      {
        name: "Overview",
        path: "/airbase",
        icon: MapPin,
        description: "Hierarchy drill-down",
        end: true,
        roles: ADMIN_ROLES,
      },
      {
        name: "Manage ARCENs",
        path: "/airbase/arcens",
        icon: Shield,
        description: "ARCEN units management",
        roles: ['admin'],
      },
      {
        name: "Manage Groups",
        path: "/airbase/groups",
        icon: Users,
        description: "Reserve groups management",
        roles: ['admin', 'admin_arsen'],
      },
      {
        name: "Manage Squadrons",
        path: "/airbase/squadrons",
        icon: Layers,
        description: "Squadron management",
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    name: "Events",
    path: "/trainings",
    icon: CalendarDays,
    description: "Events, trainings & reports",
    children: [
      {
        name: "Trainings & Activities",
        path: "/trainings",
        icon: Dumbbell,
        description: "Sessions & programs",
      },
      {
        name: "Attendance",
        path: "/attendance",
        icon: ClipboardList,
        description: "Track presence",
      },
      {
        name: "Reports",
        path: "/reports",
        icon: FileText,
        description: "Generate reports",
      },
    ],
  },
  {
    name: "Readiness & Analytics",
    path: "/analytics",
    icon: BarChart3,
    description: "Performance data",
  },
  {
    name: "Logistics & Supplies",
    path: "/logistics",
    icon: Package,
    description: "Inventory & resources",
    roles: ADMIN_ROLES,
  },
];