import { useEffect } from "react";

export function useIntegrityMonitor({ active, containerRef, onEvent }) {
  useEffect(() => {
    if (!active || !containerRef?.current) return undefined;
    const container = containerRef.current;

    const emit = (type, metadata = {}) => {
      if (typeof onEvent === "function") onEvent(type, metadata);
    };

    let hiddenAt = 0;

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        emit("tab_switch", { awayAt: hiddenAt });
      } else if (hiddenAt) {
        emit("tab_switch", { backAfterMs: Date.now() - hiddenAt });
        hiddenAt = 0;
      }
    };

    const onBlur = () => emit("tab_switch", { blurredAt: Date.now() });

    const onCopy = (e) => {
      e.preventDefault();
      emit("copy_attempt", { timestamp: Date.now() });
    };
    const onCut = (e) => {
      e.preventDefault();
      emit("copy_attempt", { action: "cut", timestamp: Date.now() });
    };
    const onContextMenu = (e) => {
      e.preventDefault();
      emit("right_click", { timestamp: Date.now() });
    };

    const onKeyDown = (e) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        emit("screenshot_attempt", { timestamp: Date.now() });
      }
      const isDevTools =
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "i" ||
          e.key.toLowerCase() === "j" ||
          (e.shiftKey && ["i", "j"].includes(e.key.toLowerCase())));
      if (isDevTools) {
        emit("devtools_opened", { key: e.key, timestamp: Date.now() });
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        emit("fullscreen_exit", { timestamp: Date.now() });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    container.addEventListener("copy", onCopy, true);
    container.addEventListener("cut", onCut, true);
    container.addEventListener("contextmenu", onContextMenu, true);
    container.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      container.removeEventListener("copy", onCopy, true);
      container.removeEventListener("cut", onCut, true);
      container.removeEventListener("contextmenu", onContextMenu, true);
      container.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [active, containerRef, onEvent]);

  return null;
}
