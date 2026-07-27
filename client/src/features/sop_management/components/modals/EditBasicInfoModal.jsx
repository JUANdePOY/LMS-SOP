import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useDepartmentList } from '../../hooks/useDepartmentList';

export default function EditBasicInfoModal({ open, onClose, onSave, sop, saving }) {
  const { departments } = useDepartmentList();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (sop && open) {
      setTitle(sop.title || '');
      setDescription(sop.description || '');
      setDepartmentId(sop.department_id ?? '');
      setErrors({});
    }
  }, [sop, open]);

  if (!open) return null;

  const validate = () => {
    const next = {};
    if (!title.trim() || title.trim().length < 2) {
      next.title = 'Title must be at least 2 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      department_id: departmentId ? parseInt(departmentId, 10) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Edit SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-lg border bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${errors.title ? 'border-destructive' : 'border-[var(--border)]'}`}
              placeholder="Enter SOP title"
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Briefly describe the purpose of this SOP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Department <span className="text-destructive">*</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select department —</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
