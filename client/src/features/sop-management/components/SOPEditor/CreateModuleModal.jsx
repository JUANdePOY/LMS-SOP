import { useState } from 'react';
import { X } from 'lucide-react';

function CreateModuleModal({ open, onClose, onSave, loading = false }) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    onSave(title.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim() && !loading) {
      e.preventDefault();
      onSave(title.trim());
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Create New Module</h2>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Module Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Enter module title"
              autoFocus
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end gap-2 p-4 sm:p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-xl">
            <button
              type="button"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create Module
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateModuleModal;
