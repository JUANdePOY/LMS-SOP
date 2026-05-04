import { useState, useEffect } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { createTraining, updateTraining } from '@/services/trainingsService';

export default function TrainingForm({ training, onClose, onSubmit }) {
  const isEditMode = !!training;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'physical',
    start_date: '',
    start_time: '',
    duration_hours: '',
    location: '',
    instructor: '',
    max_participants: '',
    status: 'upcoming'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode && training) {
      setFormData({
        title: training.title || '',
        description: training.description || '',
        type: training.type || 'physical',
        start_date: training.start_date ? training.start_date.split('T')[0] : '',
        start_time: training.start_time || '',
        duration_hours: training.duration_hours || '',
        location: training.location || '',
        instructor: training.instructor || '',
        max_participants: training.max_participants || '',
        status: training.status || 'upcoming'
      });
    }
  }, [isEditMode, training]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.title || !formData.start_date || !formData.type) {
      setError('Title, date, and type are required');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        start_date: formData.start_date,
        start_time: formData.start_time || undefined,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : undefined,
        location: formData.location || undefined,
        instructor: formData.instructor || undefined,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
        status: formData.status
      };

      let result;
      if (isEditMode) {
        result = await updateTraining(training.id, payload);
      } else {
        result = await createTraining(payload);
      }

      if (result.status === 'success') {
        onSubmit();
      } else {
        setError(result.message || 'Failed to save training');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isEditMode ? 'Edit Training' : 'Schedule New Training'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter training title"
              required
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                <option value="physical">Physical</option>
                <option value="classroom">Classroom</option>
                <option value="field">Field</option>
                <option value="simulation">Simulation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Duration (hours)
              </label>
              <input
                type="number"
                name="duration_hours"
                value={formData.duration_hours}
                onChange={handleChange}
                placeholder="e.g., 2"
                min="0"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                placeholder="e.g., 30"
                min="0"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter location"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Instructor
            </label>
            <input
              type="text"
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              placeholder="Enter instructor name"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEditMode ? 'Update' : 'Schedule'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
