import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function UserAvatar({ user, className = "h-5 w-5" }) {
  const initials = getInitials(user?.full_name || user?.email);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[rgba(242,92,5,0.12)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.16)] dark:text-[var(--color-primary)] text-[10px] font-medium",
        className
      )}
    >
      {initials}
    </span>
  );
}

export default function GroupRecipientInput({
  selectedUsers = [],
  onRemoveUser,
  searchResults = [],
  onSearchChange,
  onSelectUser,
  isSearching = false,
  placeholder = "Search recipients...",
  maxResults = 7,
  labelsById = null,
}) {
  const labelFor = (user) =>
    (labelsById && labelsById.get(user.id)) || user.full_name || user.email;
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const searchableResults = Array.isArray(searchResults) ? searchResults : [];

  const availableResults = searchableResults.filter(
    (u) => !selectedUsers.some((su) => su.id === u.id)
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onSearchChange && onSearchChange(val);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectUser = (user) => {
    if (selectedUsers.some((u) => u.id === user.id)) return;
    onSelectUser && onSelectUser(user);
    setInputValue("");
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (!inputValue && availableResults.length === 0 && !isSearching) return;
      setIsDropdownOpen(true);
      setHighlightedIndex(0);
      e.preventDefault();
      return;
    }

    if (!isDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, Math.max(availableResults.length - 1, 0))
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < availableResults.length) {
          handleSelectUser(availableResults[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
      case "Backspace":
        if (inputValue === "" && selectedUsers.length > 0) {
          const lastUser = selectedUsers[selectedUsers.length - 1];
          onRemoveUser && onRemoveUser(lastUser);
        }
        break;
      default:
        break;
    }
  };

  const handleInputFocus = () => {
    if (inputValue || availableResults.length > 0 || isSearching) {
      setIsDropdownOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-[36px] flex-wrap items-center gap-1.5 rounded-lg border bg-white dark:bg-neutral-800 px-2 py-1.5 cursor-text",
          "border-neutral-300 dark:border-neutral-600 focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[rgba(242,92,5,0.30)]"
        )}
      >
        {selectedUsers.map((user) => (
          <div
            key={user.id}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200"
          >
            <UserAvatar user={user} className="h-4 w-4" />
            <span className="max-w-[140px] truncate">
              {labelFor(user)}
            </span>
            <button
              type="button"
              onClick={() => onRemoveUser && onRemoveUser(user)}
              className="rounded p-0.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              aria-label={`Remove ${user.full_name || user.email}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={selectedUsers.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] border-0 bg-transparent px-1 py-1 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none"
        />
        {isSearching && availableResults.length === 0 && (
          <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
            Searching...
          </div>
        )}
      </div>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
          {isSearching && (
            <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
              Searching...
            </div>
          )}
          {!isSearching && availableResults.length === 0 && inputValue && (
            <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
              No matches found
            </div>
          )}
          {!isSearching &&
            availableResults.slice(0, maxResults).map((user, idx) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  highlightedIndex === idx && "bg-neutral-50 dark:bg-neutral-800"
                )}
              >
                <UserAvatar user={user} className="h-6 w-6" />
                <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {labelFor(user) || "Unknown User"}
                </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
