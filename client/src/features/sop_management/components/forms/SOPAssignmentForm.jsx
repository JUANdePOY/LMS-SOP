import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { ASSIGNMENT_TYPE, ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_TYPE_LIST } from '../../constants/assignmentTypes';
import { validateAssignmentForm } from '../../validators/assignment.validator';

export default function SOPAssignmentForm({ onSubmit, saving, departments = [] }) {
  const [assignmentType, setAssignmentType] = useState(ASSIGNMENT_TYPE.DEPARTMENT);
  const [departmentId, setDepartmentId] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [userId, setUserId] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const handleTypeChange = (value) => {
    setAssignmentType(value);
    setErrors({});
    setSubmitError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const values = {
      assignment_type: assignmentType,
      department_id: assignmentType === ASSIGNMENT_TYPE.DEPARTMENT ? departmentId : undefined,
      position_title: assignmentType === ASSIGNMENT_TYPE.POSITION ? positionTitle : undefined,
      user_id: assignmentType === ASSIGNMENT_TYPE.USER ? userId : undefined,
    };

    const validationErrors = validateAssignmentForm(values);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSubmit(values);
      setDepartmentId('');
      setPositionTitle('');
      setUserId('');
      setErrors({});
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Unable to create assignment');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Assignment Type</label>
        <select
          value={assignmentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {ASSIGNMENT_TYPE_LIST.map((type) => (
            <option key={type} value={type}>
              {ASSIGNMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {assignmentType === ASSIGNMENT_TYPE.DEPARTMENT && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Department <span className="text-destructive">*</span>
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className={`w-full rounded-lg border bg-[var(--bg-input)] text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
              errors.department_id ? 'border-destructive' : 'border-[var(--border)]'
            }`}
          >
            <option value="">— Select department —</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {errors.department_id && <p className="mt-1 text-xs text-destructive">{errors.department_id}</p>}
        </div>
      )}

      {assignmentType === ASSIGNMENT_TYPE.POSITION && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Position Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
            placeholder="e.g. QA Officer, Safety Inspector"
            className={`w-full rounded-lg border bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
              errors.position_title ? 'border-destructive' : 'border-[var(--border)]'
            }`}
          />
          {errors.position_title && <p className="mt-1 text-xs text-destructive">{errors.position_title}</p>}
        </div>
      )}

      {assignmentType === ASSIGNMENT_TYPE.USER && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            User ID <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className={`w-full rounded-lg border bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
              errors.user_id ? 'border-destructive' : 'border-[var(--border)]'
            }`}
          />
          {errors.user_id && <p className="mt-1 text-xs text-destructive">{errors.user_id}</p>}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" variant="default" disabled={saving}>
          {saving ? 'Adding…' : 'Add Assignment'}
        </Button>
      </div>
    </form>
  );
}