import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('assignments')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === 'assignments'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Assignments
        </button>
        <button
          type="button"
          onClick={() => setTab('acknowledgements')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === 'acknowledgements'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Acknowledgements
        </button>
      </div>

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Assignments ({assignments.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshAssignments}
                disabled={assignmentsLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${assignmentsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={assignmentsSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Assignment
              </button>
            </div>
          </div>

          {assignmentsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
            <h3 className="text-base font-semibold text-gray-900">
              Acknowledgements
            </h3>
            <button
              type="button"
              onClick={refreshAcknowledgements}
              disabled={ackLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${ackLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {ackError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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

