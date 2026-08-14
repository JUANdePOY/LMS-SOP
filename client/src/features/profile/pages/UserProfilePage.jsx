import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, User as UserIcon, MessageSquare, Briefcase, Shield, Phone, MapPin, Calendar, Mail, Building2, Users } from "lucide-react";
import { getUser } from "@/services/api";
import UserAvatar from "@/shared/components/ui/Avatar";
import { useToast } from "@/shared/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { resolveFileUrl } from "@/lib/fileUrl";
import { cn } from "@/lib/utils";
import { StaggerList, MotionItem } from "@/shared/motion";

function ProfileRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={16} className="mt-0.5 shrink-0 text-neutral-400" />
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 leading-snug">{value}</p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <p className="text-neutral-500 dark:text-neutral-400">Failed to load profile</p>
        <Link to="/" className="text-sm fb-link hover-fb-link font-medium">Back to home</Link>
      </div>
    );
  }

  const coverPhotoUrl = profile.cover_photo_url || profile.cover_url;
  const coverStyle = coverPhotoUrl
    ? { backgroundImage: `url(${resolveFileUrl(coverPhotoUrl)})` }
    : undefined;
  const isSelf = String(currentUser?.id) === String(profile.id);

  const rows = [
    profile.bio ? { icon: UserIcon, label: "Bio", value: profile.bio } : null,
    { icon: Briefcase, label: "Works at", value: profile.position_title },
    { icon: Shield, label: "Employee ID", value: profile.employee_id },
    { icon: Shield, label: "Role", value: profile.role },
    { icon: Building2, label: "Department", value: profile.department_name },
    { icon: Users, label: "Business", value: profile.business_name },
    { icon: Shield, label: "Employment status", value: profile.employment_status },
    { icon: Calendar, label: "Joined", value: profile.date_hired },
    { icon: Calendar, label: "Birthdate", value: profile.birthdate },
    { icon: Phone, label: "Contact", value: profile.contact_number },
    { icon: MapPin, label: "Lives in", value: profile.address },
    { icon: Mail, label: "Email", value: profile.email },
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="fb-card overflow-hidden">
        <div
          className={cn(
            "relative h-40 sm:h-56 w-full bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary)]",
            coverPhotoUrl && "bg-cover bg-center"
          )}
          style={coverStyle}
        >
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className="px-4 sm:px-6 pb-5">
          <div className="-mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative">
              <UserAvatar
                user={profile}
                size="xl"
                className="h-28 w-28 rounded-full border-4 border-white dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 shadow-md"
              />
            </div>

            <div className="flex-1 pb-1">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {profile.full_name || "User"}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {profile.position_title || profile.role || profile.email}
              </p>
            </div>

             <div className="pb-1 flex flex-wrap gap-2">
              {isSelf ? (
                <>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <UserIcon size={14} />
                    View my profile
                  </Link>
                  <Link
                    to={`/digital-id/${profile.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <UserIcon size={14} />
                    My Digital ID
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={`/messaging?to=${profile.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md btn-primary px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    <MessageSquare size={14} />
                    Message
                  </Link>
                  <Link
                    to={`/digital-id/${profile.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <UserIcon size={14} />
                    View Digital ID
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="fb-card p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Intro
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No intro details yet.</p>
            ) : (
              <StaggerList className="space-y-3">
                {rows.map((row) => (
                  <MotionItem key={row.label}>
                    <ProfileRow {...row} />
                  </MotionItem>
                ))}
              </StaggerList>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="fb-card p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              About
            </h2>
            {profile.bio ? (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {profile.full_name || "This user"} hasn't added a bio yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
