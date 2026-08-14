import { useEffect, useRef } from "react";

const BADGE_COLOR = "#ef4444";
const CANVAS_SIZE = 64;

/**
 * Reflects an unread-notification count on the browser tab by:
 *  - prepending "(n) " to document.title, and
 *  - overlaying a red badge with the count onto the favicon.
 * Pass 0 (or a falsy value) to clear the badge and restore the original state.
 */
export function useTabNotificationBadge(count) {
  const baseTitleRef = useRef(null);
  const originalIconHrefRef = useRef(null);

  useEffect(() => {
    if (baseTitleRef.current === null) {
      baseTitleRef.current = document.title;
    }
    const base = baseTitleRef.current;
    const unread = Number(count) || 0;

    document.title = unread > 0 ? `(${unread}) ${base}` : base;

    const link = document.querySelector('link[rel="icon"]');
    if (!link) return undefined;

    if (originalIconHrefRef.current === null) {
      originalIconHrefRef.current = link.href;
    }
    const originalHref = originalIconHrefRef.current;

    if (unread <= 0) {
      link.href = originalHref;
      return undefined;
    }

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");

    const drawBadge = (img) => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      if (img) {
        ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      } else {
        ctx.fillStyle = "#132f45";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }

      const badgeR = 16;
      const cx = CANVAS_SIZE - badgeR - 2;
      const cy = badgeR + 2;
      ctx.beginPath();
      ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = BADGE_COLOR;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      const label = unread > 99 ? "99+" : String(unread);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${label.length > 2 ? 15 : 20}px -apple-system, Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy + 1);

      link.href = canvas.toDataURL("image/png");
    };

    const img = new Image();
    img.onload = () => drawBadge(img);
    img.onerror = () => drawBadge(null);
    img.src = originalHref;

    return () => {
      document.title = base;
      if (link) link.href = originalHref;
    };
  }, [count]);
}
