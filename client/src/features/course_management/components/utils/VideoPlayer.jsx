export default function VideoPlayer({ src, title }) {
  return (
    <div className="w-full rounded-xl border border-[var(--border)] bg-black overflow-hidden">
      <video controls className="w-full aspect-video" src={src}>
        Your browser does not support the video tag.
      </video>
      {title && <p className="px-3 py-2 text-xs text-neutral-400 bg-neutral-900">{title}</p>}
    </div>
  );
}
