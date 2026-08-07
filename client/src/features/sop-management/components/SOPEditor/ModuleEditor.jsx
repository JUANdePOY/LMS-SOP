import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const AUTOSAVE_DELAY_MS = 2500;

/**
 * @param {object} props
 * @param {object} [props.module]
 * @param {(data: {title: string, content: string}) => void} props.onSave - manual "Save" button
 * @param {() => void} props.onCancel
 * @param {boolean} [props.saving]
 * @param {(data: {title: string, content: string}) => Promise<void>} [props.onAutoSave] -
 *   fired ~2.5s after the user stops typing, while an *existing* module is open.
 *   Not called for a not-yet-created module (there's nothing to PATCH yet) —
 *   same rule your attachments already follow ("save the module first").
 * @param {(file: File) => Promise<string>} [props.onImageUpload]
 */
function ModuleEditor({ module, onSave, onCancel, saving = false, onAutoSave, onImageUpload }) {
  const [title, setTitle] = useState(module?.title || '');
  const [content, setContent] = useState(module?.content || '');
  const [error, setError] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | pending | saving | saved | error

  const autoSaveTimer = useRef(null);
  const lastSavedRef = useRef({ title: module?.title || '', content: module?.content || '' });
  const isExistingModule = !!module?.id;

  useEffect(() => {
    setTitle(module?.title || '');
    setContent(module?.content || '');
    setError('');
    setAutoSaveStatus('idle');
    lastSavedRef.current = { title: module?.title || '', content: module?.content || '' };
  }, [module]);

  // --- Auto-save: debounce ~2.5s after the last edit, skip if nothing changed
  // or there's no module id yet to save against. ---
  useEffect(() => {
    if (!isExistingModule || !onAutoSave) return;
    if (title === lastSavedRef.current.title && content === lastSavedRef.current.content) return;
    if (!title.trim()) return; // don't autosave an invalid (empty-title) state

    setAutoSaveStatus('pending');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await onAutoSave({ title, content });
        lastSavedRef.current = { title, content };
        setAutoSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setAutoSaveStatus('error');
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, isExistingModule]);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    clearTimeout(autoSaveTimer.current);
    lastSavedRef.current = { title, content };
    setAutoSaveStatus('idle');
    onSave({ title, content });
  };

  const handleContentChange = useCallback((html) => setContent(html), []);

  return (
    <form onSubmit={handleSubmit} className="module-editor space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Title <span className="text-red-500">*</span>
          </label>
          {isExistingModule && onAutoSave && (
            <AutoSaveIndicator status={autoSaveStatus} />
          )}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          placeholder="Module title"
          disabled={saving}
        />
        {error && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Content</label>
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          disabled={saving}
          placeholder="Module content"
          onImageUpload={isExistingModule ? onImageUpload : undefined}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AutoSaveIndicator({ status }) {
  if (status === 'idle') return null;
  const map = {
    pending: { icon: null, label: 'Unsaved changes', className: 'text-neutral-400 dark:text-neutral-500' },
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Saving…', className: 'text-neutral-500 dark:text-neutral-400' },
    saved: { icon: <Check className="w-3 h-3" />, label: 'Saved', className: 'text-green-600 dark:text-green-400' },
    error: { icon: <AlertCircle className="w-3 h-3" />, label: 'Auto-save failed', className: 'text-red-600 dark:text-red-400' },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span className={`flex items-center gap-1 text-xs ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default ModuleEditor;
