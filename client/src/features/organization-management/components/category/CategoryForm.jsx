import { useState, useEffect } from 'react';

const defaultForm = {
  name: '',
  description: '',
  department_id: '',
};

const DESC_MAX = 500;

export default function CategoryForm({ initialData, onSubmit, onCancel, loading, departments = [] }) {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        department_id: initialData.department_id || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialData]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Category name is required';
    if (form.name.trim().length > 100) errs.name = 'Category name must be at most 100 characters';
    if (!form.department_id) errs.department_id = 'Department is required';
    if (form.description && form.description.length > DESC_MAX) {
      errs.description = `Description must be at most ${DESC_MAX} characters`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    if (field === 'description' && value.length > DESC_MAX) return;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Department <span className="text-red-500">*</span>
        </label>
        <select
          value={form.department_id}
          onChange={handleChange('department_id')}
          className={`w-full rounded-lg border ${errors.department_id ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none`}
        >
          <option value="">Select a department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {errors.department_id && <p className="mt-1 text-xs text-red-500">{errors.department_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Category Name <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={handleChange('name')}
          placeholder="e.g. Safety Procedures"
          maxLength={100}
          className={`w-full rounded-lg border ${errors.name ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Brief description of the category"
          rows={3}
          maxLength={DESC_MAX}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none resize-none"
        />
        <span className="mt-1 block text-right text-[11px] text-[var(--text-muted)]">
          {form.description.length}/{DESC_MAX}
        </span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialData ? 'Update Category' : 'Create Category'}
        </button>
      </div>
    </form>
  );
}