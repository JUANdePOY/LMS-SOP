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
    path: "/reservists",
    icon: UserSquare,
    description: "Manage reservists",
  },
  {
    name: "Airbase",
    path: "/airbase",
    icon: PlaneTakeoff,
    description: "Airbase hierarchy management",
    children: [
      {
        name: "Manage ARCENs",
        path: "/airbase/arcens",
        icon: Shield,
        description: "ARCEN units management",
      },
      {
        name: "Manage Groups",
        path: "/airbase/groups",
        icon: Users,
        description: "Reserve groups management",
      },
      {
        name: "Manage Squadrons",
        path: "/airbase/squadrons",
        icon: Layers,
        description: "Squadron management",
      },
    ],
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