// Shared content-rendering styles for course lesson reading content (block model).
// Single source of truth so the authoring surface and the learner LessonPage
// render identical HTML. Blue-accented to match the course builder theme.

const LB_PROSE = [
  'max-w-none text-[15px] leading-7 text-neutral-800 dark:text-neutral-200',
  '[&_.lb-text]:mb-4 [&_.lb-text:last-child]:mb-0',
  '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-neutral-900 dark:[&_h2]:text-neutral-100',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
  '[&_p]:mb-2 [&_p:last-child]:mb-0',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2',
  '[&_li]:mb-1',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 dark:[&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-600 dark:[&_blockquote]:text-neutral-400',
  '[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline',
  '[&_strong]:font-bold [&_em]:italic',
  '[&_mark]:rounded [&_mark]:px-0.5',
  '[&_pre]:bg-neutral-900 [&_pre]:text-neutral-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:mb-4',
  // Callout blocks (semantic div with data-variant)
  '[&_.lb-callout]:rounded-lg [&_.lb-callout]:border [&_.lb-callout]:p-3 [&_.lb-callout]:mb-4 [&_.lb-callout]:text-sm',
  '[&_.lb-callout[data-variant=info]]:border-blue-200 [&_.lb-callout]:bg-blue-50 dark:[&_.lb-callout[data-variant=info]]:bg-blue-900/20 [&_.lb-callout[data-variant=info]]:text-blue-800 dark:[&_.lb-callout[data-variant=info]]:text-blue-200',
  '[&_.lb-callout[data-variant=warning]]:border-amber-200 [&_.lb-callout]:bg-amber-50 dark:[&_.lb-callout[data-variant=warning]]:bg-amber-900/20 [&_.lb-callout[data-variant=warning]]:text-amber-800 dark:[&_.lb-callout[data-variant=warning]]:text-amber-200',
  // Image blocks
  '[&_.lb-image]:mb-4',
  '[&_.lb-image_img]:rounded-lg [&_.lb-image_img]:border [&_.lb-image_img]:border-neutral-200 dark:[&_.lb-image_img]:border-neutral-700 [&_.lb-image_img]:max-w-full',
  '[&_.lb-image_figcaption]:text-xs [&_.lb-image_figcaption]:text-neutral-500 dark:[&_.lb-image_figcaption]:text-neutral-400 [&_.lb-image_figcaption]:mt-1 [&_.lb-image_figcaption]:text-center',
  // Divider
  '[&_.lb-divider]:border-0 [&_.lb-divider]:border-t [&_.lb-divider]:border-neutral-200 dark:[&_.lb-divider]:border-neutral-700 [&_.lb-divider]:my-4',
  // Tables
  '[&_.tableWrapper]:overflow-x-auto [&_.tableWrapper]:my-3',
  '[&_table]:w-full [&_table]:border-collapse',
  '[&_table_td]:relative [&_table_td]:border [&_table_td]:border-neutral-300 dark:[&_table_td]:border-neutral-600 [&_table_td]:p-2 [&_table_td]:align-top',
  '[&_table_th]:relative [&_table_th]:border [&_table_th]:border-neutral-300 dark:[&_table_th]:border-neutral-600 [&_table_th]:p-2 [&_table_th]:bg-neutral-100 dark:[&_table_th]:bg-neutral-700 [&_table_th]:font-semibold [&_table_th]:text-left',
].join(' ');

export default LB_PROSE;
