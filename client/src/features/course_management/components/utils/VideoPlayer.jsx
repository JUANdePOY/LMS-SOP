import { useState, useEffect } from "react";
import { getVideoEmbedInfo } from "@/features/course_management/utils/videoUtils";
import { parseVideoUrl } from "@/features/course_management/utils/videoUrl";

export default function VideoPlayer({ src, title, onEnded }) {
  const parsed = parseVideoUrl(src);
  const isBunny = parsed?.provider === "bunny";
  const bunnyPlayUrl = isBunny ? parsed.playUrl : null;
  const bunnyEmbed = isBunny ? parsed.embedUrl : null;
  const [bunnyFailed, setBunnyFailed] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setEnded(false);
  }, [src]);

  useEffect(() => {
    if (!onEnded) return;
    if (ended) onEnded();
  }, [ended, onEnded]);

  useEffect(() => {
    if (!bunnyEmbed && !parsed?.videoId) return;
    const handler = (event) => {
      try {
        const data = event.data || {};
        if (typeof data === 'string') {
          const parsedData = JSON.parse(data);
          if (parsedData?.event === 'ended' || parsedData?.state === 0) {
            setEnded(true);
          }
        } else if (data?.event === 'ended' || data?.state === 0) {
          setEnded(true);
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [bunnyEmbed, parsed?.videoId]);

  const handleNativeEnded = () => {
    setEnded(true);
  };

  if (isBunny && bunnyPlayUrl && !bunnyFailed) {
    return (
      <div className="w-full rounded-xl border border-[var(--border)] bg-black overflow-hidden">
        <video
          controls
          className="w-full aspect-video"
          src={bunnyPlayUrl}
          onEnded={handleNativeEnded}
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
        <video controls className="w-full aspect-video" src={info.src} onEnded={handleNativeEnded}>
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
