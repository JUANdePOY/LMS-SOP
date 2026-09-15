import { useState, useEffect, useMemo } from "react";
import { UserPlus, X, Search } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { searchUsers, extractRows } from "../api/message.api";

export default function AddParticipantsModal({ open, onClose, conversation, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const existingIds = useMemo(
    () => new Set((conversation?.participants || []).map((p) => p.id)),
    [conversation]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setAdding(false);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await searchUsers(query, { page: 1, limit: 20 });
        const rows = extractRows(res?.data);
        setResults(Array.isArray(rows) ? rows : []);
      } catch (err) {
        setError(err.message || "Failed to search users");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = async (user) => {
    if (!conversation?.id || adding) return;
    setAdding(true);
    setError(null);
    try {
      await onAdded?.(conversation.id, user.id);
      setResults((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err.message || "Failed to add participant");
    } finally {
      setAdding(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={adding}
        className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        Close
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Add Participants" footer={footer}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Search users
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name or email..."
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 pl-8 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-[10px] text-red-500">{error}</p>}

        <div className="max-h-60 overflow-y-auto space-y-1">
          {searching && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Searching...</p>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">No matches found</p>
          )}
          {results.map((u) => {
            const already = existingIds.has(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {u.full_name || u.display_name || `User ${u.id}`}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {u.email} {u.role ? `• ${u.role.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={already || adding}
                  onClick={() => handleAdd(u)}
                  className={already ? "text-[10px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500" : "text-[10px] px-2 py-1 rounded bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"}
                >
                  {already ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
