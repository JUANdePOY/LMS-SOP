import { Camera, User } from "lucide-react";
import { resolveFileUrl } from "@/lib/fileUrl";
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#9ca3af'><path d='M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z'/></svg>"
  );

export default function ProfileCover({
  profile,
  coverUrl,
  previewCover,
  onEditProfile,
  onPickAvatar,
  avatarFile,
  onUploadAvatar,
  uploadingAvatar,
  onRemoveAvatar,
  onPickCover,
  coverFile,
  onUploadCover,
  uploadingCover,
  onRemoveCover,
}) {
  const avatarSrc = profile?.avatar_url
    ? resolveFileUrl(profile.avatar_url)
    : DEFAULT_AVATAR_SVG;
  const effectiveCover = previewCover || (coverUrl ? resolveFileUrl(coverUrl) : null);
  const hasCover = Boolean(effectiveCover);

  return (
    <div className="fb-card overflow-hidden">
      {/* Cover photo strip */}
      <div
        className={cn(
          "group relative h-40 sm:h-52 w-full bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary)]",
          hasCover && "bg-cover bg-center"
        )}
        style={hasCover ? { backgroundImage: `url(${effectiveCover})` } : undefined}
      >
        <div className="absolute inset-0 bg-black/10" />

        <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/55 transition-colors">
          <Camera size={13} />
          <label className="relative cursor-pointer">
            <span>Edit cover</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPickCover(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {coverFile && !hasCover && (
          <div className="absolute left-4 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white">
            <span className="truncate max-w-[150px]">{coverFile.name}</span>
            <button
              onClick={onUploadCover}
              disabled={uploadingCover}
              className="fb-link hover-fb-link font-medium"
            >
              {uploadingCover ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => onPickCover(null)}
              className="hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        )}
        {coverFile && hasCover && (
          <div className="absolute left-4 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white">
            <span className="truncate max-w-[150px]">{coverFile.name}</span>
            <button
              onClick={onUploadCover}
              disabled={uploadingCover}
              className="fb-link hover-fb-link font-medium"
            >
              {uploadingCover ? "Uploading..." : "Apply"}
            </button>
            <button
              onClick={() => onPickCover(null)}
              className="hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        )}
        {coverUrl && !coverFile && onRemoveCover && (
          <button
            onClick={onRemoveCover}
            className="absolute right-4 bottom-4 rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 hover:bg-black/55 transition-all"
          >
            Remove cover
          </button>
        )}
      </div>

      {/* Facebook-style info bar: avatar overlaps cover, name sits below in the card body */}
      <div className="px-4 sm:px-6 pb-5 pt-3 sm:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative shrink-0 -mt-14 sm:-mt-16">
            <div
              className={cn(
                "h-28 w-28 rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 shadow-md",
                profile?.avatar_url && "border-[var(--color-primary)]"
              )}
            >
              <img
                src={avatarSrc}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </div>
            <label className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full btn-primary text-white shadow hover-brand">
              <Camera size={14} />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {profile?.full_name || "User"}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {profile?.email}
            </p>
            {avatarFile && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">{avatarFile.name}</span>
                <button onClick={onUploadAvatar} disabled={uploadingAvatar} className="text-xs fb-link hover-fb-link font-medium">
                  {uploadingAvatar ? "Uploading..." : "Upload"}
                </button>
                <button onClick={() => onPickAvatar(null)} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">Cancel</button>
              </div>
            )}
            {profile?.avatar_url && !avatarFile && onRemoveAvatar && (
              <button onClick={onRemoveAvatar} className="mt-2 text-xs text-red-500 hover:text-red-600">
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