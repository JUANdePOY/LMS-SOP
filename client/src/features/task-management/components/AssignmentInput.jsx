import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Building2 } from 'lucide-react';
import { ASSIGNMENT_TYPES } from '../constants/taskConstants';
import { getUsersForAssignment, getDepartmentsForAssignment } from '../api/assignment.api';

const TYPE_ICONS = {
  User: Users,
  Department: Building2,
};

export default function AssignmentInput({ assignment, onUpdate, onRemove, canRemove = true, departmentId = null }) {
  const [type, setType] = useState(assignment?.assignment_type || 'User');
  const [selectedId, setSelectedId] = useState(assignment?.reference_id || '');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const inputContainerRef = useRef(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (assignment) {
      setType(assignment.assignment_type || 'User');
      setSelectedId(assignment.reference_id || '');
      setQuery(assignment.reference_name || '');
    }
  }, [assignment]);

  useEffect(() => {
    // Skip search when the query changed due to a selection
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let results = [];
        if (type === 'User') {
          results = await getUsersForAssignment(query, departmentId);
        } else if (type === 'Department') {
          results = await getDepartmentsForAssignment(query);
        }
        if (active) {
          setOptions(results);
          setShowDropdown(true);
        }
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [type, query]);

  // Position the dropdown using fixed coordinates so it renders above
  // modal overlays and overflow containers that would otherwise clip it.
  // It opens downward by default, but flips upward when there isn't enough
  // room below the input so the menu stays fully within the viewport. It also
  // flips horizontally (to the left of the input) when it would otherwise be
  // clipped by the right edge of the viewport.
  useLayoutEffect(() => {
    if (!showDropdown || !inputContainerRef.current) return;

    const MARGIN = 8;
    const updatePosition = () => {
      const input = inputContainerRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      // The menu has min-w-[220px] and max-w-[280px], so its actual width is the
      // input width clamped to that range. Use this for collision math instead of
      // the measured offsetWidth, which can lag a render behind the applied style.
      const menuHeight = menuRef.current?.offsetHeight || 240;
      const menuWidth = Math.min(280, Math.max(rect.width || 220, 220));
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + MARGIN;
      const top = openUp
        ? Math.max(MARGIN, rect.top - menuHeight - 4)
        : rect.bottom + 4;
      // Prefer aligning the menu's left edge with the input, but if that would
      // overflow the right edge, shift it left (right-aligned to the input) so
      // the whole menu stays inside the viewport.
      const maxLeft = window.innerWidth - MARGIN - menuWidth;
      let left = rect.left;
      if (left > maxLeft) {
        left = Math.max(MARGIN, Math.min(left, maxLeft, rect.right - menuWidth));
      }
      setDropdownCoords({ top, left, width: rect.width });
    };

    updatePosition();

    const handleScroll = (e) => {
      // Don't close when scrolling inside the dropdown or input area
      if (dropdownRef.current && e.target && dropdownRef.current.contains(e.target)) return;
      if (menuRef.current && e.target && menuRef.current.contains(e.target)) return;
      setShowDropdown(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown, options]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // The menu is portaled to <body>, so also ignore clicks inside it.
        if (menuRef.current && menuRef.current.contains(event.target)) return;
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    const id = String(option.id);
    const name = type === 'User' ? option.full_name : option.name;
    setSelectedId(id);
    setQuery(name || '');
    setShowDropdown(false);
    justSelectedRef.current = true;
    onUpdate?.({ assignment_type: type, reference_id: id, reference_name: name || id });
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setSelectedId('');
    setQuery('');
    setOptions([]);
    setShowDropdown(false);
    onUpdate?.({ assignment_type: newType, reference_id: '', reference_name: '' });
  };

  const Icon = TYPE_ICONS[type] || Users;

  const dropdownStyle = {
    top: `${dropdownCoords.top}px`,
    left: `${dropdownCoords.left}px`,
    width: `${dropdownCoords.width}px`,
  };

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      <div className="relative shrink-0">
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-[92px] truncate rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-xs outline-none focus:border-blue-500"
        >
          {ASSIGNMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="relative" ref={inputContainerRef}>
          <Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId('');
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={type === 'User' ? 'Search users...' : 'Search departments...'}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
          />
          {loading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-blue-500" />
            </div>
          )}
        </div>

        {showDropdown && options.length > 0 && createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 max-h-48 min-w-[220px] max-w-[280px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
            style={dropdownStyle}
          >
            {options.map((option) => {
              const optionId = String(option.id);
              const optionName = type === 'User' ? option.full_name : option.name;
              const subtitle = type === 'User' ? option.email : option.code;
              return (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[var(--bg-hover)] ${selectedId === optionId ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                >
                  <span className="w-full truncate text-sm text-[var(--text-primary)]">{optionName}</span>
                  {subtitle && <span className="w-full truncate text-xs text-[var(--text-muted)]">{subtitle}</span>}
                </button>
              );
            })}
          </div>,
          document.body
        )}

        {showDropdown && !loading && query && options.length === 0 && createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-muted)] shadow-lg whitespace-nowrap"
            style={dropdownStyle}
          >
            No results found
          </div>,
          document.body
        )}
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
          aria-label="Remove assignment"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
