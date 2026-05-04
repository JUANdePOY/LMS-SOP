import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTrainings, deleteTraining } from '@/services/trainingsService';
import TrainingForm from '@/components/trainings/TrainingForm';
import { cn } from '@/lib/utils';

export default function Trainings() {
  const { isAdmin } = useAuth();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Modal
  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);

  const fetchTrainings = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      };
      
      const data = await getTrainings(params);
      
      if (data.status === 'success') {
        setTrainings(data.data?.trainings || []);
        setTotalCount(data.data?.pagination?.total || 0);
      } else {
        setError(data.message || 'Failed to fetch trainings');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this training?')) return;
    
    try {
      const data = await deleteTraining(id);
      if (data.status === 'success') {
        fetchTrainings();
      } else {
        alert(data.message || 'Failed to delete training');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingTraining(null);
    fetchTrainings();
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Trainings & Activities
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Schedule and manage training sessions and activities
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => {
              setEditingTraining(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Schedule Training
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search trainings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            <option value="all">All Types</option>
            <option value="physical">Physical</option>
            <option value="classroom">Classroom</option>
            <option value="field">Field</option>
            <option value="simulation">Simulation</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Trainings Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {trainings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                        No trainings found
                      </td>
                    </tr>
                  ) : (
                    trainings.map((training) => (
                      <tr key={training.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {training.title}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {training.location || 'No location'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 capitalize">
                          {training.type || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {training.start_date ? new Date(training.start_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {training.duration_hours ? `${training.duration_hours} hrs` : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                            training.status === 'upcoming' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                            training.status === 'ongoing' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                            training.status === 'completed' && "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
                            training.status === 'cancelled' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {training.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingTraining(training);
                                setShowForm(true);
                              }}
                              className="p-1.5 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(training.id)}
                                className="p-1.5 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} trainings
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <TrainingForm
          training={editingTraining}
          onClose={() => {
            setShowForm(false);
            setEditingTraining(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
