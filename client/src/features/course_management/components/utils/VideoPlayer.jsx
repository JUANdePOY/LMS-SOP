import { useState } from "react";
import { getVideoEmbedInfo } from "@/features/course_management/utils/videoUtils";
import { parseVideoUrl } from "@/features/course_management/utils/videoUrl";

export default function VideoPlayer({ src, title }) {
  const parsed = parseVideoUrl(src);
  const isBunny = parsed?.provider === "bunny";
  const bunnyPlayUrl = isBunny ? parsed.playUrl : null;
  const bunnyEmbed = isBunny ? parsed.embedUrl : null;
  const [bunnyFailed, setBunnyFailed] = useState(false);

  // Bunny Stream: prefer the native <video> play URL for custom controls, but
  // fall back to the embed iframe if the library isn't publicly streamable.
  if (isBunny && bunnyPlayUrl && !bunnyFailed) {
    return (
      <div className="w-full rounded-xl border border-[var(--border)] bg-black overflow-hidden">
        <video
          controls
          className="w-full aspect-video"
          src={bunnyPlayUrl}
          onError={() => setBunnyFailed(true)}
        >
          Your browser does not support the video tag.
        </video>
        {title && <p className="px-3 py-2 text-xs text-neutral-400 bg-neutral-900">{title}</p>}
      </div>
    );
  }

  if (bunnyEmbed) {
    return (
      <div className="w-full rounded-xl border border-[var(--border)] bg-black overflow-hidden">
        <iframe
          className="w-full aspect-video"
          src={bunnyEmbed}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || "Video"}
        />
        {title && <p className="px-3 py-2 text-xs text-neutral-400 bg-neutral-900">{title}</p>}
      </div>
    );
  }

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
