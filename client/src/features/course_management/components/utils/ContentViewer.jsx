import VideoPlayer from "./VideoPlayer";

export default function ContentViewer({ content }) {
  if (!content) return <div className="text-sm text-neutral-500">Select content to view.</div>;
  if (content.type === "video") {
    return <VideoPlayer src={content.url} title={content.title} />;
  }
  if (content.type === "reading") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-6">
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300"
          dangerouslySetInnerHTML={{ __html: content.description || content.content || "" }}
        />
      </div>
    );
  }
  if (content.type === "document") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-6">
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        <p className="text-sm text-neutral-600">{content.description}</p>
        {content.url && <a href={content.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">Open external resource</a>}
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
