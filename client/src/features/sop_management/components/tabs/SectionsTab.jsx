import { useSOPSections } from '../../hooks/useSOPSections';
import SOPSectionForm from '../forms/SOPSectionForm';
import { FileText } from 'lucide-react';

export default function SectionsTab({ sopId }) {
  const {
    sections,
    loading,
    saving,
    error,
    create,
    update,
    remove,
  } = useSOPSections(sopId);

  if (loading && sections.length === 0) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading sections…</div>;
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
        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Sections ({sections.length})
        </h3>
      </div>

      <SOPSectionForm
        sections={sections}
        onCreate={create}
        onUpdate={update}
        onRemove={remove}
        saving={saving}
      />
    </div>
  );
}