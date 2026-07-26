import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function SOPStepForm({ steps, onCreate, onUpdate, onRemove, saving }) {
  const [newTitle, setNewTitle] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState('');
  const [formError, setFormError] = useState(null);

  const handleAdd = async () => {
    setFormError(null);
    if (!newInstruction.trim()) {
      setFormError('Instruction is required');
      return;
    }
    try {
      await onCreate({
        title: newTitle.trim() || null,
        instruction: newInstruction.trim(),
        estimated_minutes: newEstimatedMinutes ? parseInt(newEstimatedMinutes, 10) : null,
        sort_order: (steps?.length || 0) + 1,
      });
      setNewTitle('');
      setNewInstruction('');
      setNewEstimatedMinutes('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Unable to add step');
    }
  };

  const sortedSteps = [...(steps || [])].sort(
    (a, b) => (a.sort_order || a.step_number || 0) - (b.sort_order || b.step_number || 0)
  );

  return (
    <div className="space-y-4">
      {sortedSteps.length > 0 && (
        <div className="space-y-3">
          {sortedSteps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  defaultValue={step.title || ''}
                  onBlur={(e) => onUpdate(step.id, { title: e.target.value || null })}
                  placeholder="Step title (optional)"
                  className="w-full rounded border border-gray-200 px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  defaultValue={step.instruction || step.content || ''}
                  onBlur={(e) => onUpdate(step.id, { instruction: e.target.value })}
                  placeholder="Step instruction"
                  rows={2}
                  className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 flex items-center justify-between">
                  <input
                    type="number"
                    defaultValue={step.estimated_minutes || ''}
                    onBlur={(e) => onUpdate(step.id, { estimated_minutes: e.target.value ? parseInt(e.target.value, 10) : null })}
                    placeholder="Minutes"
                    className="w-20 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(step.id)}
                    disabled={saving}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new step form */}
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Step</h4>
        <div className="space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Step title (optional)"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            placeholder="Step instruction *"
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={newEstimatedMinutes}
              onChange={(e) => setNewEstimatedMinutes(e.target.value)}
              placeholder="Est. minutes"
              className="w-28 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>
          </div>
        </div>
        {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
      </div>
    </div>
  );
}

