import { useState } from 'react';
import { X, FileText, Calendar, AlertCircle, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const typeOptions = [
  { value: 'General', icon: FileText, color: 'text-blue-600' },
  { value: 'Training', icon: Calendar, color: 'text-green-600' },
  { value: 'Deployment', icon: Shield, color: 'text-purple-600' },
  { value: 'Administrative', icon: Users, color: 'text-amber-600' },
  { value: 'Emergency', icon: AlertCircle, color: 'text-red-600' },
];

export default function AnnouncementForm({ announcement, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    type: announcement?.type || 'General',
    priority: announcement?.priority || 'medium',
    status: announcement?.status || 'active',
    author: announcement?.author || 'CO Admin',
    body: announcement?.body || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {announcement ? 'Modify Announcement' : 'New Announcement'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter announcement title..."
              className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          {/* Type, Priority, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Category
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500"
              >
                {typeOptions.map(({ value, icon: Icon, color }) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Originator
            </label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Enter author name..."
              className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Message Content
            </label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              rows={6}
              required
              placeholder="Enter announcement details..."
              className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <Button type="submit">
              {announcement ? 'Update' : 'Dispatch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}