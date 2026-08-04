import { FileText } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

export default function ContentViewer({ content }) {
  if (!content) return <div className="text-sm text-neutral-500">Select content to view.</div>;
  if (content.type === "video") {
    return <VideoPlayer src={content.url} title={content.title} />;
  }
  if (content.type === "sop") {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
        <div className="flex items-start gap-3">
          <FileText size={24} className="text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{content.title || "SOP Lesson"}</h3>
            {content.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{content.description}</p>
            )}
            {content.url && (
              <a
                href={`/sops/${content.url}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                View SOP document
              </a>
            )}
          </div>
        </div>
      </div>
    );
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
