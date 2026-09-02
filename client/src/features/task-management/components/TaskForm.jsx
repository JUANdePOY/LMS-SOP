import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants/taskConstants';
import { validateTaskPayload } from '../utils/taskValidation';
import AssignmentInput from './AssignmentInput';
import { getBusinesses } from '../../organization-management/api/business.api';
import { getClientOptions } from '../api/client.api';

function TaskForm({ show, onClose, onSubmit, saving, initialData, defaultValues, userDepartmentId = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Pending');
  const [startDatetime, setStartDatetime] = useState('');
  const [deadlineDatetime, setDeadlineDatetime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [category, setCategory] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [errors, setErrors] = useState({});

  const [businessId, setBusinessId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientBusinessId, setClientBusinessId] = useState('');
  const [projectId, setProjectId] = useState(null);

  const [businessOptions, setBusinessOptions] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);

  const selectedClientBusinesses =
    clientOptions.find((c) => String(c.id) === String(clientId))?.businesses || [];

  useEffect(() => {
    if (show) {
      getBusinesses({ limit: 200 })
        .then((res) => setBusinessOptions(res.data?.data?.rows || []))
        .catch(() => setBusinessOptions([]));
      getClientOptions()
        .then((res) => setClientOptions(res.data?.data || []))
        .catch(() => setClientOptions([]));
    }
  }, [show]);

  useEffect(() => {
    // Editing an existing task takes precedence; otherwise prefill from
    // `defaultValues` (used to seed a NEW task, e.g. from a client/business
    // scope) so creation stays in "New Task" mode.
    const isEdit = !!(initialData && initialData.id);
    const source = isEdit ? initialData : (initialData || defaultValues || {});
    setTitle(source.title || '');
    setDescription(source.description || '');
    setPriority(source.priority || 'Medium');
    setStatus(source.status || 'Pending');
    setStartDatetime(source.start_datetime ? source.start_datetime.slice(0, 16) : '');
    setDeadlineDatetime(source.deadline_datetime ? source.deadline_datetime.slice(0, 16) : '');
    setEstimatedHours(source.estimated_hours || '');
    setCategory(source.category || '');
    setAssignments(
      source.assignments?.map((a) => ({
        assignment_type: a.assignment_type,
        reference_id: a.reference_id,
        reference_name: a.reference_name,
      })) || []
    );
    setBusinessId(source.business_id || '');
    setClientId(source.client_id || '');
    setClientBusinessId(source.client_business_id || '');
    setProjectId(source.project_id || null);
    setErrors({});
  }, [initialData, show, defaultValues]);

  const handleClientChange = (value) => {
    setClientId(value);
    setClientBusinessId('');
  };

  const addAssignment = () => {
    setAssignments([...assignments, { assignment_type: 'User', reference_id: '', reference_name: '' }]);
  };

  const updateAssignment = (index, updated) => {
    const next = [...assignments];
    next[index] = { ...next[index], ...updated };
    setAssignments(next);
  };

  const removeAssignment = (index) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const validate = () => {
    const payload = {
      title,
      description,
      priority,
      status,
      start_datetime: startDatetime,
      deadline_datetime: deadlineDatetime,
      estimated_hours: estimatedHours,
      category,
      assignments,
      business_id: businessId || null,
      client_id: clientId || null,
      client_business_id: clientBusinessId || null,
    };
    const result = validateTaskPayload(payload, true);
    setErrors(result.errors);
    return result.valid;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      title,
      description,
      priority,
      status,
      start_datetime: startDatetime,
      deadline_datetime: deadlineDatetime,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
      category: category || null,
      business_id: businessId ? Number(businessId) : null,
      client_id: clientId ? Number(clientId) : null,
      client_business_id: clientBusinessId ? Number(clientBusinessId) : null,
      project_id: projectId ? Number(projectId) : null,
      assignments: assignments.filter((a) => a.reference_id || a.reference_name),
    });
  };

  if (!show) return null;

  const fieldClass = (hasError) =>
    `w-full rounded-lg border bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)] ${hasError ? 'border-red-500' : 'border-[var(--border)]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full sm:max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm max-h-[92vh] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{initialData ? 'Edit Task' : 'New Task'}</h3>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" aria-label="Close">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Business</label>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className={fieldClass(errors.business_id)}
            >
              <option value="">Select business (optional)</option>
              {businessOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.business_name}
                </option>
              ))}
            </select>
            {errors.business_id && <p className="text-xs text-red-500 mt-1">{errors.business_id}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Client Name *</label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className={fieldClass(errors.client_name)}
              >
                <option value="">Select client</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
              {errors.client_name && <p className="text-xs text-red-500 mt-1">{errors.client_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Client Business *</label>
              <select
                value={clientBusinessId}
                onChange={(e) => setClientBusinessId(e.target.value)}
                disabled={!clientId}
                className={fieldClass(errors.client_business)}
              >
                <option value="">{clientId ? 'Select client business' : 'Select a client first'}</option>
                {selectedClientBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.business_name}
                  </option>
                ))}
              </select>
              {errors.client_business && <p className="text-xs text-red-500 mt-1">{errors.client_business}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className={fieldClass(errors.title)}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions"
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                className={fieldClass(errors.start_datetime)}
              />
              {errors.start_datetime && <p className="text-xs text-red-500 mt-1">{errors.start_datetime}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Deadline *</label>
              <input
                type="datetime-local"
                value={deadlineDatetime}
                onChange={(e) => setDeadlineDatetime(e.target.value)}
                className={fieldClass(errors.deadline_datetime)}
              />
              {errors.deadline_datetime && <p className="text-xs text-red-500 mt-1">{errors.deadline_datetime}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Estimated Hours</label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="Optional"
                min="0"
                className={fieldClass(errors.estimated_hours)}
              />
              {errors.estimated_hours && <p className="text-xs text-red-500 mt-1">{errors.estimated_hours}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">Assignments *</label>
              <button
                type="button"
                onClick={addAssignment}
                className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
              >
                + Add Assignment
              </button>
            </div>
            {errors.assignments && <p className="text-xs text-red-500 mb-2">{errors.assignments}</p>}
            <div className="space-y-2">
              {assignments.map((a, idx) => (
                <AssignmentInput
                  key={idx}
                  assignment={a}
                  onUpdate={(updated) => updateAssignment(idx, updated)}
                  onRemove={() => removeAssignment(idx)}
                  departmentId={userDepartmentId}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskForm;
