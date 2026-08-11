export default function TreeConnector({
  isLast = false,
  stubTop = 19,
  maskColor = 'var(--bg-surface)',
  children,
}) {
  return (
    <div className="relative">
      {/* Horizontal branch stub — the "┣"/"┗" corner */}
      <span
        className="absolute -left-4 h-[2px] w-4 bg-[var(--border)]"
        style={{ top: `${stubTop}px` }}
      />
      {/* Mask the continuing vertical guide once we're past the last item's branch.
          Must sit at the SAME x-offset as the parent's border-l-2 (i.e. -left-4,
          matching the stub above) — NOT -left-2. This mask spans the entire
          remaining height of this node's content (top: stubTop to bottom: 0),
          which includes any nested Categories block and the department's own
          SOPs block below it. If this offset drifts from -left-4, the parent's
          vertical guide line keeps running straight down, uninterrupted,
          through that expanded content — which is what caused the stray line
          under department-level SOPs when a department had no sub-categories. */}
      {isLast && (
        <span
          className="absolute -left-4 w-[2px]"
          style={{ top: `${stubTop}px`, bottom: 0, backgroundColor: maskColor }}
        />
      )}
      {children}
    </div>
  );
}