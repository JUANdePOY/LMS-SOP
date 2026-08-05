// Shared content-rendering styles for SOP module body HTML.
// Single source of truth for how module content is laid out. Consumed by both
// the editable RichTextEditor and the read-only PublicSOPPage so the same HTML
// renders with an identical arrangement in the editor and on a public share link.

const SOP_CONTENT_STYLES = [
  'max-w-none px-3 py-2 min-h-[180px] focus:outline-none',
  'text-neutral-800 dark:text-neutral-200',
  '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
  '[&_p]:mb-2 [&_p:last-child]:mb-0',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2',
  '[&_li]:mb-1',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 dark:[&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-600 dark:[&_blockquote]:text-neutral-400',
  '[&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline',
  '[&_strong]:font-bold [&_em]:italic',
  '[&_mark]:rounded [&_mark]:px-0.5',
  // Checklists
  '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0',
  '[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2',
  '[&_ul[data-type=taskList]_li>label]:mt-0.5 [&_ul[data-type=taskList]_li>label]:shrink-0',
  '[&_ul[data-type=taskList]_li[data-checked=true]>div]:text-neutral-400 [&_ul[data-type=taskList]_li[data-checked=true]>div]:line-through',
  // Tables (Table.configure({ resizable: true }) needs the wrapper to scroll
  // and the resize-handle decoration to have something to render against)
  '[&_.tableWrapper]:overflow-x-auto [&_.tableWrapper]:my-3',
  '[&_table]:w-full [&_table]:border-collapse',
  '[&_table_td]:relative [&_table_td]:border [&_table_td]:border-neutral-300 dark:[&_table_td]:border-neutral-600 [&_table_td]:p-2 [&_table_td]:align-top',
  '[&_table_th]:relative [&_table_th]:border [&_table_th]:border-neutral-300 dark:[&_table_th]:border-neutral-600 [&_table_th]:p-2 [&_table_th]:bg-neutral-100 dark:[&_table_th]:bg-neutral-700 [&_table_th]:font-semibold [&_table_th]:text-left',
  '[&_table_.selectedCell]:bg-indigo-50 dark:[&_table_.selectedCell]:bg-indigo-900/30',
  '[&_.column-resize-handle]:absolute [&_.column-resize-handle]:right-[-2px] [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:bottom-[-2px] [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:bg-indigo-500 [&_.column-resize-handle]:pointer-events-none [&_.column-resize-handle]:z-10',
  // Images (from ImageResizable renderHTML)
  '[&_figure.sop-image-figure]:my-3',
  '[&_figure.sop-image-figure[data-align=center]]:mx-auto',
  '[&_figure.sop-image-figure[data-align=left]]:mr-auto',
  '[&_figure.sop-image-figure[data-align=right]]:ml-auto',
  '[&_figure.sop-image-figure_img]:block [&_figure.sop-image-figure_img]:max-w-full [&_figure.sop-image-figure_img]:h-auto',
  '[&_figure.sop-image-figure_figcaption]:mt-1.5 [&_figure.sop-image-figure_figcaption]:text-center [&_figure.sop-image-figure_figcaption]:text-xs [&_figure.sop-image-figure_figcaption]:text-neutral-500 dark:[&_figure.sop-image-figure_figcaption]:text-neutral-400 [&_figure.sop-image-figure_figcaption]:italic',
].join(' ');

export default SOP_CONTENT_STYLES;
