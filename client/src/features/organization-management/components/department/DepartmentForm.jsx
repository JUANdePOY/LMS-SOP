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
    if (!form.code.trim()) errs.code = 'Department code is required';
    if (!form.business_id) errs.business_id = 'Business is required';
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
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none resize-none" />
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
      </div><div className="flex items-center justify-end gap-3 pt-2">
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : initialData ? 'Update Department' : 'Create Department'}
        </button>
      </div>
    </form>
    
  );
}

