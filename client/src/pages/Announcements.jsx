import { useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import AnnouncementCard from '@/components/announcements/AnnouncementCard';
import AnnouncementForm from '@/components/announcements/AnnouncementForm';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import useAnnouncements from '@/hooks/useAnnouncements';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function Announcements() {
  const { addToast } = useToast();
  const { announcements, loading, error, refetch, addAnnouncement, editAnnouncement, removeAnnouncement } = useAnnouncements();
  const [showForm, setShowForm] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setShowForm(true);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    setAnnouncementToDelete(id);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await removeAnnouncement(announcementToDelete);
      addToast('Announcement deleted successfully', 'success');
    } catch (err) {
      addToast('Failed to delete announcement', 'error');
      console.error('Failed to delete announcement:', err);
    }
    setAnnouncementToDelete(null);
  };

  const handleSubmit = async (data) => {
    try {
      if (editingAnnouncement) {
        await editAnnouncement(editingAnnouncement.id, data);
        addToast('Announcement updated successfully', 'success');
      } else {
        await addAnnouncement(data);
        addToast('Announcement created successfully', 'success');
      }
      setShowForm(false);
      setEditingAnnouncement(null);
    } catch (err) {
      addToast('Failed to save announcement', 'error');
      console.error('Failed to save announcement:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Radio size={32} className="text-blue-600 animate-pulse mb-3" />
        <span className="text-neutral-600 dark:text-neutral-400 font-medium">
          Loading announcement feed...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <p className="text-red-600 dark:text-red-400 font-medium mb-3">
            Connection Error
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            {error}
          </p>
          <button onClick={refetch} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <Radio size={24} className="text-blue-600" />
            Announcements
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Official communications and operational updates
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={16} className="mr-2" />
          New Dispatch
        </Button>
      </div>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto scrollbar-custom flex-1 min-h-0">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="col-span-full">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Radio size={32} className="text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                No Active Dispatches
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Communications headquarters has not issued any announcements yet.
                Create a new dispatch to notify personnel.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <AnnouncementForm
          announcement={editingAnnouncement}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingAnnouncement(null);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Announcement"
        message="This action cannot be undone. The announcement will be permanently removed from the system."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}