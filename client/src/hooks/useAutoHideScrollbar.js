import { useEffect, useRef } from "react";

/**
 * Keeps a scroll container's scrollbar hidden while idle and reveals it only
 * while the user is actively scrolling.
 *
 * The hook itself owns no React state — it toggles a `data-scrolling`
 * attribute directly on the DOM node, so an active scroll never re-renders
 * the subtree it is attached to. Pair it with the `.scrollbar-fade` class in
 * index.css, which fades the thumb in and out based on that attribute.
 *
 * Usage:
 *   const scrollRef = useAutoHideScrollbar();
 *   <div ref={scrollRef} className="overflow-y-auto scrollbar-fade">…</div>
 *
 * @param {object}  [options]
 * @param {number}  [options.idleDelay=800] Milliseconds of no scroll activity before the thumb fades out.
 * @param {boolean} [options.enabled=true]  Set false to leave the scrollbar in its default state.
 * @returns {React.RefObject<HTMLElement>}  Ref to attach to the scroll container.
 */
export function useAutoHideScrollbar({ idleDelay = 800, enabled = true } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let idleTimer;

    const markIdle = () => {
      element.removeAttribute("data-scrolling");
    };

    const handleScroll = () => {
      element.setAttribute("data-scrolling", "true");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(markIdle, idleDelay);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(idleTimer);
      element.removeEventListener("scroll", handleScroll);
      markIdle();
    };
  }, [idleDelay, enabled]);

  return ref;
}

export default useAutoHideScrollbar;
