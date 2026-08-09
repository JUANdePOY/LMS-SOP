import { useState, useEffect, useMemo } from 'react';
import { generateDepartmentCode } from '../../utils/generateDepartmentCode';

const defaultForm = {
  name: '',
  code: '',
  description: '',
  business_id: '',
  head_user_id: '',
  status: 'active',
};

export default function DepartmentForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
  businesses = [],
  users = [],
}) {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  const displayCode = useMemo(() => {
    if (form.code) return form.code;
    if (form.name.trim()) return generateDepartmentCode(form.name);
    return '';
  }, [form.name, form.code]);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        code: initialData.code || '',
        description: initialData.description || '',
        business_id: initialData.business_id || '',
        head_user_id: initialData.head_user_id || '',
        status: initialData.status || 'active',
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialData]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Department name is required';
    if (form.name.trim().length > 100) errs.name = 'Department name must be at most 100 characters';
    if (!form.code.trim()) errs.code = 'Department code is required';
    if (form.code.trim().length > 20) errs.code = 'Department code must be at most 20 characters';
    if (!form.business_id) errs.business_id = 'Business is required';
    if (form.head_user_id && !/^\d+$/.test(String(form.head_user_id))) {
      errs.head_user_id = 'Department head must be a valid user ID';
    }
    if (form.description && form.description.length > 500) {
      errs.description = 'Description must be at most 500 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = { ...form };
    if (!data.head_user_id) data.head_user_id = null;
    if (!data.business_id) data.business_id = null;
    onSubmit(data);
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    const next = { ...form, [field]: value };
    if (field === 'name' && !next.code && value.trim()) {
      next.code = generateDepartmentCode(value);
    }
    setForm(next);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Department Name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={handleChange('name')}
            placeholder="e.g. Operations"
            maxLength={100}
            className={`w-full rounded-lg border ${errors.name ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none`} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Department Code <span className="text-red-500">*</span>
          </label>
          <input
            value={displayCode}
            readOnly
            disabled
            placeholder="Auto-generated from name"
            className={`w-full rounded-lg border ${errors.code ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none opacity-70 cursor-not-allowed`} />
          {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Business <span className="text-red-500">*</span>
        </label>
        <select
          value={form.business_id}
          onChange={handleChange('business_id')}
          className={`w-full rounded-lg border ${errors.business_id ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none`}
        >
          <option value="">Select a business</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.business_name}</option>
          ))}
        </select>
        {errors.business_id && <p className="mt-1 text-xs text-red-500">{errors.business_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Brief description of the department"
          rows={2}
          maxLength={500}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none resize-none" />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Department Head</label>
        <select
          value={form.head_user_id}
          onChange={handleChange('head_user_id')}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="">Select a user</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
        <select
          value={form.status}
          onChange={handleChange('status')}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
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
          {loading ? 'Saving...' : initialData ? 'Update Department' : 'Create Department'}
        </button>
      </div>
    </form>
    
  );
}

