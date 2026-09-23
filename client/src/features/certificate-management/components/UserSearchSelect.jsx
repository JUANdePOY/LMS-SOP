import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Check } from 'lucide-react';
import { getUsers } from '@/services/api';

const LIMIT = 50;

function getOptionLabel(user) {
  const name = user.full_name || user.email || 'User';
  return `${name}: ${user.id}`;
}

export default function UserSearchSelect({ value, onChange, placeholder = 'Search users...', required = false }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const justPicked = useRef(false);

  const selected = options.find(o => String(o.id) === String(value));

  useEffect(() => {
    if (value && selected) {
      setQuery(getOptionLabel(selected));
    }
  }, [value, selected]);

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getUsers({ search: query || '', limit: LIMIT, page: 1 });
        const rows = res.data?.data?.rows || res.data?.data || [];
        setOptions(Array.isArray(rows) ? rows : []);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePosition = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 240;
      const menuWidth = Math.min(300, Math.max(rect.width || 220, 220));
      const MARGIN = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + MARGIN;
      const top = openUp
        ? Math.max(MARGIN, rect.top - menuHeight - 4)
        : rect.bottom + 4;
      const maxLeft = window.innerWidth - MARGIN - menuWidth;
      let left = rect.left;
      if (left > maxLeft) {
        left = Math.max(MARGIN, Math.min(left, maxLeft, rect.right - menuWidth));
      }
      setCoords({ top, left, width: rect.width });
    };

    updatePosition();

    const handleScroll = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && containerRef.current.contains(event.target)) return;
      if (menuRef.current && menuRef.current.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (user) => {
    justPicked.current = true;
    const id = String(user.id);
    onChange?.(id);
    setQuery(getOptionLabel(user));
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const dropdownStyle = {
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    width: `${coords.width}px`,
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange?.('');
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-input)] pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 max-h-64 min-w-[240px] max-w-[300px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
            style={dropdownStyle}
          >
            {options.length === 0 && !loading && (
              <div className="px-3 py-3 text-xs text-[var(--text-muted)]">
                {query ? 'No users found' : 'Type to search users'}
              </div>
            )}
            {options.map((user) => {
              const isSelected = String(user.id) === String(value);
              const label = getOptionLabel(user);
              return (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(user);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--bg-hover)] ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <span className="truncate text-sm text-[var(--text-primary)]">{label}</span>
                  {isSelected && <Check size={14} className="shrink-0 text-blue-600" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
