export default function ContentViewer({ content }) {
  if (!content) return <div className="text-sm text-neutral-500">Select content to view.</div>;
  if (content.type === "video") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-black overflow-hidden">
        <video controls className="w-full aspect-video" src={content.url}>
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
  if (content.type === "document" || content.type === "reading") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-6">
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        <p className="text-sm text-neutral-600">{content.description}</p>
        {content.url && <a href={content.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Open external resource</a>}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-6">
      <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
      <p className="text-sm text-neutral-600">{content.description}</p>
    </div>
  );
}
