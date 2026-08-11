import { Camera, User } from "lucide-react";
import { resolveFileUrl } from "@/lib/fileUrl";
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#9ca3af'><path d='M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z'/></svg>"
  );

export default function ProfileCover({ profile, onEditProfile, onPickAvatar, avatarFile, onUploadAvatar, uploadingAvatar, onRemoveAvatar }) {
  const avatarSrc = profile?.avatar_url ? resolveFileUrl(profile.avatar_url) : DEFAULT_AVATAR_SVG;
  return (
    <div className="fb-card overflow-hidden">
      <div className="relative h-40 sm:h-52 w-full bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary)]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={profile?.cover_url ? { backgroundImage: `url(${resolveFileUrl(profile.cover_url)})` } : undefined} />
        <div className="absolute inset-0 bg-black/10" />
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/55 transition-colors"
          onClick={onEditProfile}
        >
          <Camera size={13} />
          Edit cover
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-4">
        <div className="-mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative">
            <div className={cn(
              "h-28 w-28 rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 shadow-md",
              profile?.avatar_url && "border-[var(--color-primary)]"
            )}>
              <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <label className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full btn-primary text-white shadow hover-brand">
              <Camera size={14} />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {profile?.full_name || "User"}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile?.email}</p>
            {avatarFile && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-neutral-500 truncate max-w-[200px]">{avatarFile.name}</span>
                <button onClick={onUploadAvatar} disabled={uploadingAvatar} className="text-xs fb-link hover-fb-link font-medium">
                  {uploadingAvatar ? "Uploading..." : "Upload"}
                </button>
                <button onClick={() => onPickAvatar(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
              </div>
            )}
            {profile?.avatar_url && !avatarFile && onRemoveAvatar && (
              <button onClick={onRemoveAvatar} className="mt-2 text-xs text-red-600 hover:text-red-700">
                Remove avatar
              </button>
            )}
          </div>

          <div className="pb-1">
            <button
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <User size={14} />
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
