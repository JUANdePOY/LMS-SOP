import { Input } from '@/shared/components/ui/input';
import { Toggle } from '@/shared/components/ui/toggle';
import { Loader2 } from 'lucide-react';

export function RoleForm({ formData, setFormData, onSave, saving, onCancel, submitLabel, showName }) {
  return (
    <div className="flex flex-col gap-4">
      {showName && (
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Role Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. department_head"
            className="border-neutral-300 dark:border-neutral-600"
          />
          <p className="text-[10px] text-neutral-500 mt-1">Lowercase with underscores</p>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          Display Name <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.display_name || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
          placeholder="e.g. Department Head"
          className="border-neutral-300 dark:border-neutral-600"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          Description
        </label>
        <Input
          value={formData.description || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          className="border-neutral-300 dark:border-neutral-600"
        />
      </div>
      {!showName && (
        <div className="flex items-center gap-2">
          <Toggle
            checked={formData.is_active ?? true}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            size="sm"
          />
          <label className="text-xs text-neutral-700 dark:text-neutral-300">
            Active
          </label>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50 flex items-center gap-1"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
