import { useState, useEffect, useRef } from 'react';
import { X, Search, User, Building2, Briefcase } from 'lucide-react';
import { ASSIGNMENT_TYPES } from '../constants/taskConstants';
import { getUsersForAssignment, getDepartmentsForAssignment } from '../api/assignment.api';

const TYPE_ICONS = {
  User: User,
  Department: Building2,
  Position: Briefcase,
};

function AssignmentInput({ assignment, onUpdate, onRemove, canRemove = true }) {
  const [type, setType] = useState(assignment?.assignment_type || 'User');
  const [selectedId, setSelectedId] = useState(assignment?.reference_id || '');
  const [selectedName, setSelectedName] = useState(assignment?.reference_name || '');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (assignment) {
      setType(assignment.assignment_type || 'User');
      setSelectedId(assignment.reference_id || '');
      setSelectedName(assignment.reference_name || '');
      setQuery(assignment.reference_name || '');
    }
  }, [assignment]);

  useEffect(() => {
    if (type === 'Position') {
      setOptions([]);
      setShowDropdown(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let results = [];
        if (type === 'User') {
          results = await getUsersForAssignment(query);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
    setSelectedName(name || '');
    setQuery(name || '');
    setShowDropdown(false);
    onUpdate?.({ assignment_type: type, reference_id: id, reference_name: name || id });
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setSelectedId('');
    setSelectedName('');
    setQuery('');
    setOptions([]);
    setShowDropdown(false);
    onUpdate?.({ assignment_type: newType, reference_id: '', reference_name: '' });
  };

  const handleInputChange = (value) => {
    setQuery(value);
    setSelectedId(value);
    setSelectedName(value);
    onUpdate?.({ assignment_type: type, reference_id: value, reference_name: value });
  };

  const Icon = TYPE_ICONS[type] || User;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        >
          {ASSIGNMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1" ref={dropdownRef}>
        {type === 'Position' ? (
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter position title..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
          />
        ) : (
          <div className="relative">
            <Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId('');
                setSelectedName('');
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

            {showDropdown && options.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg">
                {options.map((option) => {
                  const optionId = String(option.id);
                  const optionName = type === 'User' ? option.full_name : option.name;
                  const subtitle = type === 'User' ? option.email : option.code;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(option)}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[var(--bg-hover)] ${selectedId === optionId ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                    >
                      <span className="text-sm text-[var(--text-primary)]">{optionName}</span>
                      {subtitle && <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {showDropdown && !loading && query && options.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-muted)] shadow-lg">
                No results found
              </div>
            )}
          </div>
        )}
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
          aria-label="Remove assignment"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default AssignmentInput;
