import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  BookOpen,
  Library,
  ClipboardCheck,
  Award,
  MessageSquare,
  Megaphone,
  Calendar,
  CheckSquare,
  Settings,
  Shield,
  LogOut,
  User,
   ChevronDown,
   Building2,
   FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import UserAvatar from "@/shared/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { filterMenuByRole, LMS_ROLES } from "@/config/menuItems";
import { useNotificationStore, useNotifications } from "@/shared/stores/notificationStore.js";

const EMPLOYEE_MENU_ITEMS = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "LEARNING",
    group: true,
    items: [
      { name: "My Learning", path: "/my-learning", icon: Home },
      { name: "Course Library", path: "/courses/library", icon: Library },
      { name: "SOP Library", path: "/my-learning/sops", icon: FileText },
      { name: "My Certificates", path: "/certificates/my-certificates", icon: Award },
    ],
  },
  {
    name: "COMMUNICATION",
    group: true,
    items: [
      { name: "Messaging", path: "/messaging", icon: MessageSquare },
      { name: "Announcements", path: "/announcements", icon: Megaphone },
      { name: "Events", path: "/events", icon: Calendar },
    ],
  },
  {
    name: "WORKFLOW",
    group: true,
    items: [
      { name: "My Tasks", path: "/tasks/my", icon: CheckSquare },
    ],
  },
  {
    name: "SYSTEM",
    group: true,
    items: [
      { name: "Profile", path: "/profile", icon: User },
    ],
  },
];

const MENU_ITEMS = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    roles: LMS_ROLES.filter(r => r !== 'employee'),
  },
  {
    name: "CORE MODULES",
    group: true,
    items: [
      {
        name: "SOP Management",
        path: "/admin/organization",
        icon: Building2,
        sub: ["Dashboard", "Businesses", "Departments", "Categories", "Files"],
        roles: ['super_admin', 'admin'],
      },
       { name: "Course Management", path: "/courses", icon: BookOpen, roles: ['super_admin', 'admin', 'department_head'] },
       { name: "Course Library", path: "/courses/library", icon: Library, roles: LMS_ROLES },
        { name: "Quizzes", path: "/assessments", icon: ClipboardCheck, sub: [{name:"Manage", roles:['super_admin','admin','department_head']}, {name:"Leaderboard", roles:['super_admin','admin','department_head']}, {name:"Integrity", roles:['super_admin']}], roles: ['super_admin', 'admin', 'department_head'] },
       { name: "Certificates", path: "/certificates", icon: Award, roles: ['super_admin', 'admin'] },
    ],
  },
  {
    name: "COMMUNICATION",
    group: true,
    items: [
      { name: "Messaging", path: "/messaging", icon: MessageSquare, roles: LMS_ROLES },
      { name: "Announcements", path: "/announcements", icon: Megaphone, roles: LMS_ROLES },
      { name: "Events", path: "/events", icon: Calendar, roles: LMS_ROLES },
    ],
  },
  {
    name: "INTERNAL OPERATIONS",
    group: true,
    items: [
      { name: "Tasks & Projects", path: "/tasks", icon: CheckSquare, roles: ['super_admin', 'admin'] },
    ],
  },
  {
    name: "SYSTEM",
    group: true,
    items: [
      { name: "Settings", path: "/settings", icon: Settings, sub: ["Users", "Roles"], roles: ['super_admin'] },
      { name: "Audit Logs", path: "/audit-logs", icon: Shield, roles: ['super_admin'] },
    ],
  },
];

const SIDEBAR_WIDTH = {
  expanded: "w-[260px]",
  collapsed: "w-[72px]",
};

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const [expandedSubMenus, setExpandedSubMenus] = useState({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleLabel = typeof user?.role === 'string' ? user.role.replace('_', ' ') : '';
  const isEmployee = user?.role === 'employee';
  const baseMenuItems = isEmployee ? EMPLOYEE_MENU_ITEMS : MENU_ITEMS;
  const activeMenuItems = filterMenuByRole(baseMenuItems, user?.role);
  const notificationStore = useNotificationStore();
  const notifications = useNotifications();

  const PATH_BANNER_MAP = { "/announcements": ["1"], "/events": ["2"] };
  const getBadgeCount = (path) => {
    if (path === "/messaging") return notificationStore.unreadMessageCount || 0;
    if (path === "/my-learning") return notifications.getEnrollmentNotificationCount?.() || 0;
    if (path === "/announcements") return notifications.getUnreadCountByEntityType?.('announcement') || 0;
    if (path === "/events") return notifications.getUnreadCountByEntityType?.('event') || 0;
    if (path === "/courses/library") return notifications.getUnreadCountByEntityType?.('course') || 0;
    if (path === "/certificates/my-certificates") return notifications.getUnreadCountByEntityType?.('certificate') || 0;
    const bannerIds = PATH_BANNER_MAP[path] || [];
    const unreadBannerIds = bannerIds.filter(
      (id) => !notificationStore.dismissed.includes(id)
    );
    return unreadBannerIds.length;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-expand SOP Management when on its child routes
  useEffect(() => {
    if (location.pathname.startsWith("/admin/organization") || location.pathname.startsWith("/sops")) {
      setExpandedSubMenus(prev => ({ ...prev, "SOP Management": true }));
    }
  }, [location.pathname]);

  const toggleSubMenu = (name) => {
    setExpandedSubMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAnySubActive = (subItems, basePath) => {
    return subItems.some((subItem) => {
      const name = typeof subItem === 'string' ? subItem : subItem.name;
      if (name === "Files") {
        return location.pathname.startsWith("/sops");
      }
      if (name === "Dashboard") {
        return location.pathname.startsWith("/admin/organization");
      }
      const subPath = `${basePath}/${name.toLowerCase().replace(/\s+/g, '-')}`;
      return location.pathname.startsWith(subPath);
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col",
        "bg-[var(--bg-sidebar)] text-[var(--text-on-sidebar)]",
        "transition-transform duration-200 ease-out",
        "bg-white/95 dark:bg-neutral-900/95",
        "backdrop-blur-md",
        "border-r border-[var(--border-sidebar)]",
        SIDEBAR_WIDTH.expanded,
        "lg:translate-x-0",
        !mobileOpen ? "max-lg:-translate-x-full" : "max-lg:translate-x-0",
        collapsed && SIDEBAR_WIDTH.collapsed,
        "shadow-lg lg:shadow-none"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          "bg-[var(--bg-topbar)] shadow-[0_1px_0_rgba(0,0,0,0.15)]",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <Link
          to="/"
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-2.5 overflow-hidden",
            collapsed && "justify-center"
          )}
        >
           <div className={cn("flex items-center justify-center rounded-lg", collapsed ? "h-10 w-10" : "h-11 w-auto max-w-[180px]")}>
             <img
               src={collapsed ? "/UseThisLogo.png" : "/UseThisLogo.v.1.2.png"}
               alt="The Roldan Group"
               className={cn("object-contain", collapsed ? "h-8 w-8" : "h-11 w-auto")}
             />
          </div>
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-2.5 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
        {activeMenuItems.map((item) => {
          if (item.group) {
            return (
              <div key={item.name} className="mb-3 sm:mb-4">
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--text-on-sidebar)_55%,transparent)]">
                    {item.name}
                  </p>
                )}
                {collapsed && <div className="mx-2 mb-2 h-px bg-[var(--border-sidebar)]" />}
                <ul className="space-y-0.5" role="list">
                  {item.items.map((sub) => (
                    <li key={sub.path}>
                      {sub.sub ? (
                        <div className="w-full">
                          <button
                            onClick={() => {
                              if (collapsed) {
                                navigate(sub.path);
                                handleNavClick();
                              } else {
                                toggleSubMenu(sub.name);
                              }
                            }}
                            className={cn(
                              "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                              "text-sm font-medium leading-none tracking-[-0.01em]",
                              "transition-all duration-200 ease-out",
                              "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]",
                              (isActive(sub.path) || isAnySubActive(sub.sub, sub.path))
                                ? [
                                    "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
                                    "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                                    "before:h-[18px] before:w-0.5 before:rounded-full",
                                    "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
                                  ]
                                : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]",
                              collapsed && "justify-center px-0"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200",
                                (isActive(sub.path) || isAnySubActive(sub.sub, sub.path)) ? "text-[var(--text-on-sidebar)]" : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]"
                              )}
                            >
                              <sub.icon size={17} strokeWidth={(isActive(sub.path) || isAnySubActive(sub.sub, sub.path)) ? 2.2 : 1.8} />
                            </span>
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left truncate">{sub.name}</span>
                                <ChevronDown
                                  size={13}
                                  className={cn(
                                    "transition-transform duration-200 shrink-0",
                                    expandedSubMenus[sub.name] ? "rotate-180" : ""
                                  )}
                                />
                              </>
                            )}
                          </button>
                          {expandedSubMenus[sub.name] && !collapsed && sub.sub && (
                            <div className="overflow-hidden transition-all duration-200 ease-out">
                              <div className="relative ml-[22px] mt-0.5 border-l border-[var(--border-sidebar)] pb-0.5">
                                <ul className="space-y-0.5 py-0.5" role="list">
                                   {sub.sub.filter((subItem) => {
                                     const itemRoles = typeof subItem === 'string' ? undefined : subItem.roles;
                                     return !itemRoles || itemRoles.includes(user?.role);
                                   }).map((subItem) => {
                                     const subItemName = typeof subItem === 'string' ? subItem : subItem.name;
                                     const isSopMgmt = subItemName === "Files";
                                     const isDashboard = subItemName === "Dashboard";
                                     const subPath = isSopMgmt ? "/sops" : isDashboard ? "/admin/organization" : `${sub.path}/${subItemName.toLowerCase().replace(/\s+/g, '-')}`;
                                     const active = isDashboard
                                       ? location.pathname === "/admin/organization" || location.pathname === "/admin/organization/hierarchy"
                                       : isActive(subPath);
                                     return (
                                       <li key={subItemName}>
                                         <Link
                                           to={subPath}
                                           onClick={handleNavClick}
                                           className={cn(
                                             "relative flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 w-full",
                                             "text-[13px] font-medium leading-none tracking-[-0.01em]",
                                             "transition-all duration-150 ease-out",
                                             active
                                               ? [
                                                   "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
                                                   "before:absolute before:left-[18px] before:top-1/2 before:-translate-y-1/2",
                                                   "before:h-[14px] before:w-0.5 before:rounded-full",
                                                   "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
                                                 ]
                                               : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]"
                                           )}
                                         >
                                           {subItemName}
                                         </Link>
                                       </li>
                                     );
                                   })}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <SidebarItem
                          item={sub}
                          isCollapsed={collapsed}
                          onNavClick={handleNavClick}
                          isActive={isActive(sub.path)}
                          badgeCount={getBadgeCount(sub.path)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <li key={item.path}>
              <SidebarItem
                item={item}
                isCollapsed={collapsed}
                onNavClick={handleNavClick}
                isActive={isActive(item.path)}
                badgeCount={getBadgeCount(item.path)}
              />
            </li>
          );
        })}
      </nav>

      <div
        ref={dropdownRef}
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-[var(--border-sidebar)]",
          collapsed ? "justify-center gap-2 p-3" : "gap-3 px-3 sm:px-4 py-3",
          "cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        )}
        onClick={() => setProfileMenuOpen((v) => !v)}
      >
        <div className="relative">
          <UserAvatar user={user} size="sm" ring />
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-400" />

          {profileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
              <div className="absolute left-full bottom-0 top-auto z-50 ml-2 w-48 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-lg py-1">
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {roleLabel}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(false); navigate('/profile'); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(false); navigate('/settings'); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Settings size={14} /> Settings
                </button>
                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                <button
                  onClick={async (e) => { e.stopPropagation(); setProfileMenuOpen(false); await logout(); navigate('/login'); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="flex flex-1 flex-col leading-tight overflow-hidden">
            <span className="truncate text-[13px] font-medium text-[var(--text-on-sidebar)]">
              {user?.full_name || user?.email || 'User'}
            </span>
            <span className="truncate text-[11px] text-[var(--text-on-sidebar)]">
              {roleLabel}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}