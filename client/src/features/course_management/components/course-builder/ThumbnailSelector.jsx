import { useState } from "react";
import { Image as ImageIcon, Upload, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useVideoUpload } from "@/features/course_management/hooks/useVideoUpload";
import { uploadContent } from "@/features/course_management/api/content.api";

/**
 * Thumbnail selector for video (and other) lessons.
 * Supports pasting an image URL or uploading a file with a progress
 * indicator and cancel. Uploads go through the existing course image
 * endpoint so no new server surface is required.
 */
export default function ThumbnailSelector({ courseId, moduleId, value, onChange }) {
  const { upload, cancel, progress, uploading, error } = useVideoUpload();
  const [localError, setLocalError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!courseId || !moduleId) {
      setLocalError("Save the module first to upload a thumbnail");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file (JPEG, PNG, WebP, GIF)");
      return;
    }
    setLocalError(null);
    try {
      const res = await upload(`/api/courses/${courseId}/modules/${moduleId}/images`, file);
      const viewUrl = res?.data?.view_url || res?.view_url;
      if (viewUrl) onChange(viewUrl);
    } catch (err) {
      if (err.message !== "Upload cancelled") setLocalError(err.message || "Upload failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-28 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {value ? (
            <img src={value} alt="Lesson thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="space-y-1 text-center">
              <ImageIcon size={22} className="mx-auto text-neutral-300" />
              <p className="text-xs text-neutral-400">No thumbnail</p>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <label className="block text-sm font-medium text-neutral-700">Thumbnail URL</label>
          <input
            type="url"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://... or upload below"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />

          <div className="relative">
            <input
              id="thumb-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              disabled={uploading}
            />
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 py-2 text-sm text-neutral-600 hover:border-blue-400 hover:text-blue-600">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? `Uploading ${progress}%` : "Upload image"}
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <button type="button" onClick={cancel} className="text-xs font-medium text-neutral-500 hover:text-red-600">
                Cancel
              </button>
            </div>
          )}

          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-red-600"
            >
              <X size={12} /> Remove thumbnail
            </button>
          )}
        </div>
      </div>

      {(localError || error) && (
        <p className="inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {localError || error}
        </p>
      )}
    </div>
  );
}
