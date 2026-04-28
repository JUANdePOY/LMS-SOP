import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  MapPin,
  Dumbbell,
  ClipboardList,
  BarChart3,
  Package,
  FileText,
} from "lucide-react";

export const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview & summary",
  },
    {
      name: "Reservists",
      path: "/reservations",
      icon: CalendarCheck,
      description: "Manage reservists",
    },
  {
    name: "Groups & Units",
    path: "/groups",
    icon: Users,
    description: "Teams & units",
  },
  {
    name: "Areas",
    path: "/areas",
    icon: MapPin,
    description: "Location management",
  },
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
  },
  {
    name: "Reports",
    path: "/reports",
    icon: FileText,
    description: "Generate reports",
  },
];
