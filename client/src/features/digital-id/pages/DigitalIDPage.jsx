import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, User } from "lucide-react";
import { getUser } from "@/services/api";
import { useToast } from "@/shared/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import DigitalIDCard from "@/features/digital-id/components/DigitalIDCard";
import ManageDigitalIDSheet from "@/features/digital-id/components/ManageDigitalIDSheet";
import useDigitalId from "@/features/digital-id/hooks/useDigitalId";

export default function DigitalIDPage() {
  const { userId } = useParams();
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const { links, addLink, updateLink, removeLink } = useDigitalId();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUser(userId);
      const data = res.data?.data || res.data;
      if (!data) throw new Error("Profile not found");
      setProfile(data);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to load profile";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [userId, addToast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-secondary)]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <p className="text-neutral-500 dark:text-neutral-400">Failed to load digital ID</p>
        <Link to="/" className="text-sm fb-link hover-fb-link font-medium">Back to home</Link>
      </div>
    );
  }

  const isSelf = String(currentUser?.id) === String(profile.id);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={isSelf ? "/profile" : `/profile/${profile.id}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <ArrowLeft size={14} />
          {isSelf ? "Back to Profile" : "Back to User Profile"}
        </Link>

        {isSelf ? (
          <button
            onClick={() => setManageOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-neutral-800 hover:bg-neutral-900 text-white transition-colors duration-200"
          >
            Manage Digital ID
          </button>
        ) : (
          <Link
            to={`/digital-id/${currentUser.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <User size={14} />
            My Digital ID
          </Link>
        )}
      </div>

      <div className="flex justify-center">
        <DigitalIDCard
          profile={profile}
          links={links}
        />
      </div>

      <ManageDigitalIDSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        links={links}
        onSave={() => {}}
        onAdd={addLink}
        onUpdate={updateLink}
        onRemove={removeLink}
      />
    </div>
  );
}
