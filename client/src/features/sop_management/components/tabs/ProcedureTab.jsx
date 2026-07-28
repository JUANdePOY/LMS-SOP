import { useSOPSteps } from '../../hooks/useSOPSteps';
import { ListOrdered } from 'lucide-react';
import SOPStepForm from '../forms/SOPStepForm';

export default function ProcedureTab({ sopId }) {
  const { steps, loading, saving, error, create, update, remove } = useSOPSteps(sopId);

  if (loading) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading steps…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Procedure Steps ({steps.length})
        </h3>
      </div>

      <SOPStepForm
        steps={steps}
        onCreate={create}
        onUpdate={update}
        onRemove={remove}
        saving={saving}
      />
    </div>
  );
}
