import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAssignments } from '../../hooks/useAssignments';
import { useAcknowledgements } from '../../hooks/useAcknowledgements';
import AssignmentTable from '../tables/AssignmentTable';
import AcknowledgementTable from '../tables/AcknowledgementTable';
import AssignmentModal from '../modals/AssignmentModal';

export default function AssignmentsTab({ sopId }) {
  const {
    assignments,
    loading: assignmentsLoading,
    saving: assignmentsSaving,
    error: assignmentsError,
    refresh: refreshAssignments,
    create: createAssignment,
    remove: removeAssignment,
  } = useAssignments(sopId);

  const {
    acknowledgements,
    stats,
    loading: ackLoading,
    error: ackError,
    refresh: refreshAcknowledgements,
  } = useAcknowledgements(sopId);

  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('assignments');

  const handleCreateAssignment = async (values) => {
    await createAssignment(values);
    setShowModal(false);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    await removeAssignment(assignmentId);
  };

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('assignments')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === 'assignments'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Assignments
        </button>
        <button
          type="button"
          onClick={() => setTab('acknowledgements')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === 'acknowledgements'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Acknowledgements
        </button>
      </div>

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Assignments ({assignments.length})
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refreshAssignments} disabled={assignmentsLoading}>
                <RefreshCw className={`h-4 w-4 ${assignmentsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="default" onClick={() => setShowModal(true)} disabled={assignmentsSaving}>
                <Plus className="h-4 w-4" />
                Add Assignment
              </Button>
            </div>
          </div>

          {assignmentsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {assignmentsError}
            </div>
          )}

          <AssignmentTable
            assignments={assignments}
            onDelete={handleDeleteAssignment}
            loading={assignmentsLoading}
            disabled={assignmentsSaving}
          />
        </div>
      )}

      {/* Acknowledgements Tab */}
      {tab === 'acknowledgements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Acknowledgements
            </h3>
            <Button variant="outline" onClick={refreshAcknowledgements} disabled={ackLoading}>
              <RefreshCw className={`h-4 w-4 ${ackLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {ackError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {ackError}
            </div>
          )}

          <AcknowledgementTable
            acknowledgements={acknowledgements}
            stats={stats}
            loading={ackLoading}
          />
        </div>
      )}

      {/* Assignment Modal */}
      <AssignmentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateAssignment}
        saving={assignmentsSaving}
      />
    </div>
  );
}