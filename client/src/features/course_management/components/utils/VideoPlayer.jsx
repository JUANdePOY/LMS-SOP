import { getVideoEmbedInfo } from "@/features/course_management/utils/videoUtils";

export default function VideoPlayer({ src, title }) {
  const info = getVideoEmbedInfo(src);

  if (!info) {
    return null;
  }

  const containerClass = "w-full rounded-xl border border-[var(--border)] bg-black overflow-hidden";

  if (info.type === "file") {
    return (
      <div className={containerClass}>
        <video controls className="w-full aspect-video" src={info.src}>
          Your browser does not support the video tag.
        </video>
        {title && <p className="px-3 py-2 text-xs text-neutral-400 bg-neutral-900">{title}</p>}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <iframe
        className="w-full aspect-video"
        src={info.src}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title || "Video"}
      />
      {title && <p className="px-3 py-2 text-xs text-neutral-400 bg-neutral-900">{title}</p>}
    </div>
  );
}
