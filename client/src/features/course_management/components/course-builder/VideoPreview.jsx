import { useState } from "react";
import { PlayCircle, AlertTriangle, Film, CheckCircle2, ExternalLink } from "lucide-react";
import { parseVideoUrl, PROVIDER_LABEL } from "@/features/course_management/utils/videoUrl";
import { resolveFileUrl } from "@/lib/fileUrl";

/**
 * Live, validated preview for a video lesson URL.
 * Renders an embed for recognized providers, a native player for direct
 * files, and clear error states for invalid input.
 */
export default function VideoPreview({ url, thumbnailUrl, onPickChapter, activeChapterStart }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const parsed = parseVideoUrl(url);
  const resolvedThumbnail = thumbnailUrl ? resolveFileUrl(thumbnailUrl) : null;

  if (!url || !url.trim()) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center">
        <div className="space-y-2 px-4">
          <Film size={28} className="mx-auto text-neutral-300" />
          <p className="text-sm text-neutral-500">Paste a video link to preview it here</p>
        </div>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-center">
        <div className="space-y-2 px-4">
          <AlertTriangle size={28} className="mx-auto text-red-400" />
          <p className="text-sm font-medium text-red-700">Unsupported video URL</p>
          <p className="text-xs text-red-500">Use YouTube, Vimeo, or a direct .mp4/.webm link.</p>
        </div>
      </div>
    );
  }

  const badgeColor = {
    youtube: "bg-red-50 text-red-600",
    vimeo: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)]",
    bunny: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)]",
    file: "bg-neutral-100 text-neutral-600",
  }[parsed.provider];

  if (parsed.provider === "file") {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-black">
          <video
            src={parsed.embedUrl}
            controls
            className="aspect-video w-full"
            crossOrigin="anonymous"
          />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
          <CheckCircle2 size={12} /> {PROVIDER_LABEL[parsed.provider]}
        </span>
      </div>
    );
  }

  if (parsed.provider === "bunny") {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-black">
          {showEmbed ? (
            <iframe
              key={parsed.embedUrl}
              src={parsed.embedUrl}
              title="Video preview"
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
           ) : (
            <button
              type="button"
              onClick={() => setShowEmbed(true)}
              className="group relative flex aspect-video w-full items-center justify-center bg-neutral-900 bg-cover bg-center"
              style={resolvedThumbnail ? { backgroundImage: `url("${resolvedThumbnail}")` } : undefined}
              aria-label="Play video preview"
            >
              <span className="absolute inset-0 bg-black/40" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-105">
                <PlayCircle size={36} className="text-neutral-900" />
              </span>
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                {PROVIDER_LABEL[parsed.provider]}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
            <CheckCircle2 size={12} /> {PROVIDER_LABEL[parsed.provider]} link detected
          </span>
          <a
            href={parsed.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
          >
            Open original <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-black">
        {showEmbed ? (
          <iframe
            key={parsed.embedUrl}
            src={parsed.embedUrl}
            title="Video preview"
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
         ) : (
          <button
            type="button"
            onClick={() => setShowEmbed(true)}
            className="group relative flex aspect-video w-full items-center justify-center bg-neutral-900 bg-cover bg-center"
            style={resolvedThumbnail ? { backgroundImage: `url("${resolvedThumbnail}")` } : undefined}
            aria-label="Play video preview"
          >
            <span className="absolute inset-0 bg-black/40" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-105">
              <PlayCircle size={36} className="text-neutral-900" />
            </span>
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {PROVIDER_LABEL[parsed.provider]}
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
          <CheckCircle2 size={12} /> {PROVIDER_LABEL[parsed.provider]} link detected
        </span>
        <a
          href={parsed.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
        >
          Open original <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
