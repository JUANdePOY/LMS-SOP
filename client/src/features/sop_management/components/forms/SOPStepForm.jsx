import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableStep({ step, index, onUpdate, onRemove, saving }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm">
        <div
          className="flex h-6 w-6 flex-shrink-0 cursor-grab items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary active:cursor-grabbing"
          {...listeners}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            defaultValue={step.title || ''}
            onBlur={(e) => onUpdate(step.id, { title: e.target.value || null })}
            placeholder="Step title (optional)"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            defaultValue={step.instruction || step.content || ''}
            onBlur={(e) => onUpdate(step.id, { instruction: e.target.value })}
            placeholder="Step instruction"
            rows={2}
            className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex items-center justify-between">
            <input
              type="number"
              defaultValue={step.estimated_minutes || ''}
              onBlur={(e) => onUpdate(step.id, { estimated_minutes: e.target.value ? parseInt(e.target.value, 10) : null })}
              placeholder="Minutes"
              className="w-20 rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => onRemove(step.id)}
              disabled={saving}
              className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SOPStepForm({ steps, onCreate, onUpdate, onRemove, saving }) {
  const [newTitle, setNewTitle] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState('');
  const [formError, setFormError] = useState(null);

  const sortedSteps = [...(steps || [])].sort(
    (a, b) => (a.sort_order || a.step_number || 0) - (b.sort_order || b.step_number || 0)
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
      const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(sortedSteps, oldIndex, newIndex);

      reordered.forEach((step, idx) => {
        const newSortOrder = idx + 1;
        if (step.sort_order !== newSortOrder) {
          onUpdate(step.id, { sort_order: newSortOrder });
        }
      });
    }
  };

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
        sort_order: (sortedSteps.length || 0) + 1,
      });
      setNewTitle('');
      setNewInstruction('');
      setNewEstimatedMinutes('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Unable to add step');
    }
  };

  return (
    <div className="space-y-4">
      {sortedSteps.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedSteps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sortedSteps.map((step, index) => (
                <SortableStep
                  key={step.id}
                  step={step}
                  index={index}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  saving={saving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="rounded-lg border border-dashed border-[var(--border)] bg-muted p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Add New Step</h4>
        <div className="space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Step title (optional)"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            placeholder="Step instruction *"
            rows={2}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={newEstimatedMinutes}
              onChange={(e) => setNewEstimatedMinutes(e.target.value)}
              placeholder="Est. minutes"
              className="w-28 rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button variant="default" onClick={handleAdd} disabled={saving}>
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </div>
        </div>
        {formError && <p className="mt-2 text-xs text-destructive">{formError}</p>}
      </div>
    </div>
  );
}
