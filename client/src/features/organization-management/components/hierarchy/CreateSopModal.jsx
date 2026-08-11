import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { createSop } from '@/features/sop-management/services/sopService';
import { createModule } from '@/features/sop-management/services/moduleService';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { getDepartment } from '@/features/organization-management/api/department.api';
import { getCategories } from '@/features/organization-management/api/category.api';

function CreateSopModal({ open, onClose, departmentId, categoryId, onCreated }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setDepartmentName('');
      setCategoryName('');
      return;
    }

    let mounted = true;

    async function loadNames() {
      if (departmentId) {
        try {
          const { data } = await getDepartment(departmentId);
          const dept = data?.data;
          if (mounted && dept) setDepartmentName(dept.name);
        } catch {
          // ignore
        }
      }
      if (categoryId) {
        try {
          const { data } = await getCategories({ limit: 100 });
          const cat = (data?.data?.rows || []).find((c) => c.id === categoryId);
          if (mounted && cat) setCategoryName(cat.name);
        } catch {
          // ignore
        }
      }
    }

    loadNames();

    return () => {
      mounted = false;
    };
  }, [open, departmentId, categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const { data: sopData } = await createSop({
        title: title.trim(),
        description: description.trim(),
        department_id: departmentId,
        category_id: categoryId,
        status: 'Draft',
        restriction_type: departmentId ? 'assigned' : 'public',
      });

      const sopId = sopData?.data?.id || sopData?.id;
      if (!sopId) throw new Error('SOP creation failed');

      // Create default module
      await createModule(sopId, {
        title: 'Main Content',
        content: '',
        sort_order: 1,
      });

      // Auto-assign to department if provided
      if (departmentId) {
        await createAssignment(sopId, {
          department_ids: [departmentId],
          position_names: [],
          user_ids: [],
          due_date: null,
          notes: '',
        });
      }

      toast.success('SOP created successfully');
      onCreated?.(sopId);
      onClose();
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to create SOP';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">New SOP</h2>
          <button
            type="button"
            onClick={!loading ? onClose : undefined}
            disabled={loading}
            className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                SOP Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                placeholder="Enter SOP title"
                autoFocus
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Brief description"
                rows={3}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {departmentName && (
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {departmentName}
                </span>
              )}
              {categoryName && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {categoryName}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 sm:p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create SOP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSopModal;
