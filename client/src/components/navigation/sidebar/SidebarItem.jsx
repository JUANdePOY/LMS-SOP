import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarTooltip from "@/components/ui/Tooltip";

function SidebarSubItem({ item, onNavClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end ?? false}
      onClick={onNavClick}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 w-full",
          "text-[13px] font-medium leading-none tracking-[-0.01em]",
          "transition-all duration-150 ease-out",
          "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]",
!isActive && [
             "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]",
           ],
           isActive && [
             "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
             "before:absolute before:left-[18px] before:top-1/2 before:-translate-y-1/2",
             "before:h-[14px] before:w-0.5 before:rounded-full",
             "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
           ]
        )
      }
    >
      {({ isActive }) => (
        <>
<span className={cn(
             "flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-150",
             isActive ? "text-[var(--text-on-sidebar)]" : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]"
           )}>
            <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
          </span>
          <span className="truncate">{item.name}</span>
        </>
      )}
    </NavLink>
  );
}

export default function SidebarItem({ item, isCollapsed, onNavClick }) {
  const Icon = item.icon;
  const location = useLocation();
  const navigate = useNavigate();
  const hasChildren = item.children && item.children.length > 0;

  const isChildActive = hasChildren &&
    item.children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/"));

  const isParentPathActive = location.pathname === item.path;

  const [open, setOpen] = useState(isChildActive);

  if (hasChildren) {
    const isParentActive = isParentPathActive || isChildActive;
    const firstChildPath = item.children[0]?.path;

    const handleChevronClick = (e) => {
      e.stopPropagation();
      setOpen((v) => !v);
    };

    return (
      <SidebarTooltip label={item.name} description={item.description} enabled={isCollapsed}>
        <div className="w-full">
          <button
            onClick={() => {
              navigate(firstChildPath);
              setOpen(true);
            }}
            aria-expanded={open}
className={cn(
               "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
               "text-sm font-medium leading-none tracking-[-0.01em]",
               "transition-all duration-200 ease-out",
               "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]",
isParentActive
                ? [
                    "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
                    "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                    "before:h-[18px] before:w-0.5 before:rounded-full",
                    "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
                  ]
                 : [
                     "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]",
                     "hover:scale-[1.015]",
                   ],
               isCollapsed && "justify-center px-0"
             )}
           >
<span className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200",
                isParentActive ? "text-[var(--text-on-sidebar)]" : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]"
              )}>
              <Icon size={17} strokeWidth={isParentActive ? 2.2 : 1.8} />
            </span>

            {!isCollapsed && (
              <>
                <span className="flex-1 truncate text-left">{item.name}</span>
                <span
                  onClick={handleChevronClick}
                  className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                  aria-label={open ? "Collapse" : "Expand"}
                >
                  <ChevronDown
                    size={13}
                    className={cn(
                      "text-[var(--text-on-sidebar)]",
                      "transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                </span>
              </>
            )}

            {isCollapsed && isParentActive && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]" />
            )}
          </button>

          {!isCollapsed && (
            <div className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="relative ml-[22px] mt-0.5 border-l border-[var(--border-sidebar)] pb-0.5">
                <ul className="space-y-0.5 py-0.5" role="list">
                  {item.children.map((child) => (
                    <li key={child.path}>
                      <SidebarSubItem item={child} onNavClick={onNavClick} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </SidebarTooltip>
    );
  }

  return (
    <SidebarTooltip label={item.name} description={item.description} enabled={isCollapsed}>
      <NavLink
        to={item.path}
        end={item.path === "/"}
        onClick={onNavClick}
        className={({ isActive }) =>
          cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 w-full",
            "text-sm font-medium leading-none tracking-[-0.01em]",
            "transition-all duration-200 ease-out",
            "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]",
            !isActive && [
              "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]",
              "hover:scale-[1.015]",
            ],
            isActive && [
              "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
              "before:h-[18px] before:w-0.5 before:rounded-full",
              "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
            ],
            isCollapsed && "justify-center px-0"
          )
        }
      >
        {({ isActive }) => (
          <>
<span className={cn(
               "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200",
               isActive ? "text-[var(--text-on-sidebar)]" : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]"
             )}>
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            {!isCollapsed && <span className="truncate">{item.name}</span>}
            {isCollapsed && isActive && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]" />
            )}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}