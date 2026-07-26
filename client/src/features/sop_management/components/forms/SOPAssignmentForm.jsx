import { useState } from 'react';
import { ASSIGNMENT_TYPE, ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_TYPE_LIST } from '../../constants/assignmentTypes';
import { validateAssignmentForm } from '../../validators/assignment.validator';

export default function SOPAssignmentForm({ onSubmit, saving }) {
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Assignment Type</label>
        <select
          value={assignmentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Department ID <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="Enter department ID"
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.department_id ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.department_id && <p className="mt-1 text-xs text-red-600">{errors.department_id}</p>}
        </div>
      )}

      {assignmentType === ASSIGNMENT_TYPE.POSITION && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Position Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
            placeholder="e.g. QA Officer, Safety Inspector"
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.position_title ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.position_title && <p className="mt-1 text-xs text-red-600">{errors.position_title}</p>}
        </div>
      )}

      {assignmentType === ASSIGNMENT_TYPE.USER && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            User ID <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.user_id ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.user_id && <p className="mt-1 text-xs text-red-600">{errors.user_id}</p>}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add Assignment'}
        </button>
      </div>
    </form>
  );
}

