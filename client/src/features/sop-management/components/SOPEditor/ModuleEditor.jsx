import { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';

function ModuleEditor({ module, onSave, onCancel, saving = false }) {
  const [title, setTitle] = useState(module?.title || '');
  const [content, setContent] = useState(module?.content || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(module?.title || '');
    setContent(module?.content || '');
    setError('');
  }, [module]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    onSave({ title, content });
  };

  return (
    <form onSubmit={handleSubmit} className="module-editor space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
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
          onChange={setContent}
          disabled={saving}
          placeholder="Module content"
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

export default ModuleEditor;