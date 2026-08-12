import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useAnnouncements } from "../hooks/useAnnouncements";
import AnnouncementList from "../components/AnnouncementList";
import AnnouncementForm from "../components/AnnouncementForm";
import AnnouncementDetail from "../components/AnnouncementDetail";
import { Modal } from "@/shared/components/ui/modal";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const { toast } = useToast();
  const { items, error, refresh, create, update, remove } = useAnnouncements({ status: "active" });
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingItem) {
        await update(editingItem.id, payload);
        toast.success("Announcement updated");
      } else {
        await create(payload);
        toast.success("Announcement created");
      }
      setShowForm(false);
      setEditingItem(null);
      refresh();
    } catch (err) {
      toast.error(err.message || "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove(id);
      toast.success("Announcement deleted");
      refresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete announcement");
    }
  };

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Megaphone size={20} className="text-neutral-400 dark:text-neutral-500" />
          Announcements
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Stay updated with company-wide announcements</p>
      </div>

      <AnnouncementList
        items={items}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        canManage={canManage}
        onView={(item) => setDetailItem(item)}
      />

      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Announcement Details"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDetailItem(null)}
              className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600"
            >
              Close
            </button>
          </div>
        }
      >
        {detailItem && <AnnouncementDetail item={detailItem} />}
      </Modal>

      {canManage && (
        <Modal
          open={showForm}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          title={editingItem ? "Edit Announcement" : "New Announcement"}
        >
          <AnnouncementForm
            initialData={editingItem}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  );
}
