import { useState, useEffect, useMemo } from 'react';
import { generateDepartmentCode } from '../../utils/generateDepartmentCode';

const defaultForm = {
  name: '',
  code: '',
  description: '',
  business_id: '',
  business_ids: [],
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
      const primaryId = initialData.business_id ? String(initialData.business_id) : '';
      // assigned_business_ids comes from the department business assignments
      // endpoint; the primary business is always included in the list.
      const assigned = Array.isArray(initialData.assigned_business_ids)
        ? initialData.assigned_business_ids.map((id) => String(id))
        : [];
      const allIds = primaryId
        ? (assigned.includes(primaryId) ? assigned : [primaryId, ...assigned])
        : assigned;
      setForm({
        name: initialData.name || '',
        code: initialData.code || '',
        description: initialData.description || '',
        business_id: primaryId,
        business_ids: allIds,
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
    if (!form.business_id) errs.business_id = 'Primary business is required';
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
    // business_ids always includes the primary business so the junction table
    // stays in sync with the primary assignment.
    const primaryId = data.business_id ? String(data.business_id) : null;
    const ids = (data.business_ids || [])
      .map((id) => String(id))
      .filter((id) => id && id !== 'null' && id !== 'undefined');
    data.business_ids = primaryId
      ? Array.from(new Set([primaryId, ...ids]))
      : ids;
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

  const toggleBusinessId = (businessId) => {
    const idStr = String(businessId);
    setForm((prev) => {
      const next = { ...prev };
      const ids = (prev.business_ids || []).map((id) => String(id));
      const idx = ids.indexOf(idStr);
      const updated = idx >= 0
        ? ids.filter((_, i) => i !== idx)
        : [...ids, idStr];
      next.business_ids = updated;
      // The primary business is the first selected business. If the user
      // unselected the current primary, promote the next selection (or clear).
      if (prev.business_id && String(prev.business_id) === idStr) {
        next.business_id = updated.length ? updated[0] : '';
      } else if (!prev.business_id && updated.length) {
        next.business_id = updated[0];
      }
      if (errors.business_id) setErrors((prevErr) => ({ ...prevErr, business_id: null }));
      return next;
    });
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
          Businesses <span className="text-red-500">*</span>
        </label>
        <p className="mt-0.5 mb-2 text-xs text-[var(--text-muted)]">
          Select one or more businesses. The first selected business is the department's primary business.
        </p>
        <div className={`max-h-52 overflow-y-auto rounded-lg border ${errors.business_id ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)]`}>
          {businesses.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--text-muted)]">No businesses available.</p>
          ) : (
            businesses.map((b) => {
              const idStr = String(b.id);
              const checked = (form.business_ids || []).map((id) => String(id)).includes(idStr);
              return (
                <label
                  key={b.id}
                  className={`flex cursor-pointer items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-[var(--bg-hover)] ${
                    checked ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)] text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                    checked={checked}
                    onChange={() => toggleBusinessId(b.id)}
                  />
                  <span className="flex-1 truncate text-[var(--text-primary)]">{b.business_name}</span>
                  {checked && form.business_id && String(form.business_id) === idStr && (
                    <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                      Primary
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
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

