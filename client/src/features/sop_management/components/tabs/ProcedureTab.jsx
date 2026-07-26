import { useSOPSteps } from '../../hooks/useSOPSteps';
import { ListOrdered, GripVertical } from 'lucide-react';

export default function ProcedureTab({ sopId }) {
  const { steps, loading, error } = useSOPSteps(sopId);

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading steps…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No steps defined yet. Add steps to build the procedure.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Procedure Steps ({steps.length})
        </h3>
      </div>

      <div className="space-y-3">
        {steps
          .sort((a, b) => (a.sort_order || a.step_number || 0) - (b.sort_order || b.step_number || 0))
          .map((step, index) => (
            <div
              key={step.id}
              className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start pt-1">
                <GripVertical className="h-4 w-4 text-gray-300" />
              </div>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                {step.title && (
                  <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                )}
                <p className="mt-1 text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                  {step.instruction || step.content || 'No content'}
                </p>
                {step.estimated_minutes && (
                  <p className="mt-1 text-xs text-gray-500">
                    Estimated: {step.estimated_minutes} min
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

