import {
  Rows3,
  Columns3,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
} from 'lucide-react';

function TableMenuButton({ onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
    >
      {children}
    </button>
  );
}

/** Only rendered while `editor.isActive('table')` — see RichTextEditor.jsx. */
function TableMenu({ editor }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border border-neutral-200 dark:border-neutral-700 border-t-0 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-1.5">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 pr-1">Table:</span>
      <TableMenuButton title="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
        <ArrowUpToLine className="w-3.5 h-3.5" />
      </TableMenuButton>
      <TableMenuButton title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
        <ArrowDownToLine className="w-3.5 h-3.5" />
      </TableMenuButton>
      <TableMenuButton title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
        <Rows3 className="w-3.5 h-3.5" />
      </TableMenuButton>
      <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-600 mx-1" />
      <TableMenuButton title="Add column before" onClick={() => editor.chain().focus().addColumnBefore().run()}>
        <ArrowLeftToLine className="w-3.5 h-3.5" />
      </TableMenuButton>
      <TableMenuButton title="Add column after" onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <ArrowRightToLine className="w-3.5 h-3.5" />
      </TableMenuButton>
      <TableMenuButton title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
        <Columns3 className="w-3.5 h-3.5" />
      </TableMenuButton>
      <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-600 mx-1" />
      <TableMenuButton title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
        <span className="text-xs font-semibold">H</span>
      </TableMenuButton>
      <TableMenuButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      </TableMenuButton>
    </div>
  );
}

export default TableMenu;
