import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { getVideoEmbedInfo } from "@/features/course_management/utils/videoUtils";
import { parseVideoUrl } from "@/features/course_management/utils/videoUrl";

function VideoPlayerInner({ src, title, onEnded }, ref) {
  const parsed = parseVideoUrl(src);
  const isBunny = parsed?.provider === "bunny";
  const bunnyPlayUrl = isBunny ? parsed.playUrl : null;
  const bunnyEmbed = isBunny ? parsed.embedUrl : null;
  const embedInfo = getVideoEmbedInfo(src);
  const isIframe = isBunny || (embedInfo && embedInfo.type !== "file");

  const [bunnyFailed, setBunnyFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const nativeVideoRef = useRef(null);
  const iframeRef = useRef(null);

  const resetProgress = () => {
    setEnded(false);
  };

  const finishVideo = () => {
    setEnded(true);
  };

  const notifyEnded = () => {
    if (onEnded) onEnded();
  };

  useEffect(() => {
    resetProgress();
  }, [src]);

  useEffect(() => {
    if (!onEnded) return;
    if (ended) notifyEnded();
  }, [ended, onEnded]);

  useEffect(() => {
    const video = nativeVideoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      try {
        const duration = video.duration || 0;
        if (duration > 0 && video.currentTime >= duration - 1) {
          finishVideo();
        }
      } catch {
        // ignore
      }
    };

    const handleNativeEnded = () => finishVideo();

    const handleSeeked = () => {
      try {
        const duration = video.duration || 0;
        if (duration > 0 && video.currentTime >= duration - 1) {
          finishVideo();
        }
      } catch {
        // ignore
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleNativeEnded);
    video.addEventListener("seeked", handleSeeked);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleNativeEnded);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [src, bunnyPlayUrl]);

  useEffect(() => {
    if (!isIframe) return;
    const handler = (event) => {
      try {
        const raw = event.data || {};
        let data = raw;
        if (typeof raw === "string") {
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
        }

        if (!data || typeof data !== "object") return;

        if (data.context === "player.js") {
          const ev = (data.event || "").toLowerCase();
          if (["end", "ended", "finish", "complete"].includes(ev)) {
            finishVideo();
            return;
          }

          if (data.event === "timeupdate" && typeof data.duration === "number" && data.duration > 0 && typeof data.seconds === "number") {
            if (data.seconds >= data.duration - 1) {
              finishVideo();
            }
            return;
          }
        }

        if (data.event === "onStateChange") {
          const state = Number(data.info?.playerState ?? data.playerState);
          if (state === 0) {
            finishVideo();
            return;
          }
        }

        if (data?.event === "ended" || Number(data?.state) === 0) {
          finishVideo();
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isIframe]);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      const s = Number(seconds) || 0;
      if (nativeVideoRef.current) {
        const video = nativeVideoRef.current;
        const applySeek = () => {
          try {
            video.currentTime = s;
          } catch {
            // ignore seek errors
          }
        };
        if (video.readyState >= 1) {
          applySeek();
        } else {
          video.addEventListener("loadedmetadata", applySeek, { once: true });
        }
      } else if (iframeRef.current?.contentWindow) {
        const provider = parsed?.provider;
        const message =
          provider === "youtube"
            ? JSON.stringify({ event: "command", func: "seekTo", args: [s, true] })
            : provider === "vimeo"
              ? JSON.stringify({ method: "seekTo", params: { time: s } })
              : provider === "bunny"
                ? JSON.stringify({ context: "player.js", method: "setCurrentTime", value: s })
                : JSON.stringify({ event: "seek", time: s });
        try {
          iframeRef.current.contentWindow.postMessage(message, "*");
        } catch {
          // ignore postMessage errors
        }
      }
    },
  }), [parsed?.provider]);

  if (isBunny && bunnyPlayUrl && !bunnyFailed) {
    return (
      <div className="w-full rounded-xl border border-[var(--border)] bg-black overflow-hidden">
        <video
          ref={nativeVideoRef}
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
          ref={iframeRef}
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
        <video ref={nativeVideoRef} controls className="w-full aspect-video" src={info.src}>
          Your browser does not support the video tag.
        </video>
        {title && <p className="px-3 py-2 text-xs text-neutral-400 bg-neutral-900">{title}</p>}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <iframe
        ref={iframeRef}
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

export default forwardRef(VideoPlayerInner);
