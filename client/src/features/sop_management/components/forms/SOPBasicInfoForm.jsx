import { useMemo } from 'react';
import { generateSOPCode } from '../../utils/generateSOPCode';

export default function SOPBasicInfoForm({ formData, onChange, errors = {}, departments = [], categories = [] }) {
  const displayCode = useMemo(() => {
    if (formData.code) return formData.code;
    return formData.title.trim() ? generateSOPCode(formData.title) : '';
  }, [formData.title, formData.code]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    const next = { ...formData, [field]: value };
    if (!next.code && next.title.trim()) {
      next.code = generateSOPCode(next.title);
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="sop-title">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="sop-title"
          type="text"
          value={formData.title}
          onChange={handleChange('title')}
          placeholder="e.g. Fire Evacuation Procedure"
          className={`w-full rounded-lg border bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
            errors.title ? 'border-destructive' : 'border-[var(--border)]'
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="sop-code">
          Code
        </label>
        <input
          id="sop-code"
          type="text"
          value={displayCode}
          onChange={handleChange('code')}
          placeholder={formData.title.trim() ? 'Auto-generated from title' : 'Leave blank to auto-generate'}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="sop-description">
          Description
        </label>
        <textarea
          id="sop-description"
          rows={3}
          value={formData.description}
          onChange={handleChange('description')}
          placeholder="What is this SOP for?"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="sop-department">
            Department <span className="text-destructive">*</span>
          </label>
          <select
            id="sop-department"
            value={formData.department_id}
            onChange={handleChange('department_id')}
            className={`w-full rounded-lg border bg-[var(--bg-input)] text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
              errors.department_id ? 'border-destructive' : 'border-[var(--border)]'
            }`}
          >
            <option value="">— Select department —</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {errors.department_id && <p className="mt-1 text-xs text-destructive">{errors.department_id}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="sop-category">
            Category
          </label>
          <select
            id="sop-category"
            value={formData.category_id}
            onChange={handleChange('category_id')}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Select category (optional) —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        New SOPs always start as <span className="font-medium">Draft</span>. Status changes happen through the review workflow.
      </p>
    </div>
  );
}
