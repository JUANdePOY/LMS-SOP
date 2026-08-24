// Mirrors the org-management TreeConnector: draws the horizontal "elbow" that
// connects a child sub-task to its parent's vertical guide line, and masks the
// vertical guide below the last child so the line stops cleanly.
export default function TaskTreeConnector({
  isLast = false,
  stubTop = 18,
  maskColor = 'var(--bg-surface)',
  children,
}) {
  return (
    <div className="relative">
      {/* Horizontal branch stub — the "┣"/"┗" corner */}
      <span
        className="absolute -left-3 h-[2px] w-3 bg-[var(--border)]"
        style={{ top: `${stubTop}px` }}
      />
      {/* Mask the continuing vertical guide once we're past the last item's
          branch. Sits at the same x-offset as the parent's border-l-2
          (i.e. -left-3, matching the stub above). */}
      {isLast && (
        <span
          className="absolute -left-3 w-[2px]"
          style={{ top: `${stubTop}px`, bottom: 0, backgroundColor: maskColor }}
        />
      )}
      {children}
    </div>
  );
}
