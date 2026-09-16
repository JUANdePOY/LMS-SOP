import {
  Rows3,
  Columns3,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Plus,
  Table,
} from 'lucide-react';

function TableMenuButton({ onClick, title, children, variant = 'default' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        variant === 'danger'
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
      {children}
    </span>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-neutral-300 dark:bg-neutral-600 mx-1" />;
}

function TableMenu({ editor }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border border-neutral-200 dark:border-neutral-700 border-t-0 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-1.5">
      <div className="flex items-center gap-1">
        <SectionLabel>Row</SectionLabel>
        <TableMenuButton title="Insert row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
          <ArrowUpToLine className="w-3.5 h-3.5" />
        </TableMenuButton>
        <TableMenuButton title="Insert row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
          <ArrowDownToLine className="w-3.5 h-3.5" />
        </TableMenuButton>
        <TableMenuButton title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()} variant="danger">
          <Rows3 className="w-3.5 h-3.5" />
        </TableMenuButton>
      </div>

      <Divider />

      <div className="flex items-center gap-1">
        <SectionLabel>Column</SectionLabel>
        <TableMenuButton title="Insert column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>
          <ArrowLeftToLine className="w-3.5 h-3.5" />
        </TableMenuButton>
        <TableMenuButton title="Insert column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <ArrowRightToLine className="w-3.5 h-3.5" />
        </TableMenuButton>
        <TableMenuButton title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()} variant="danger">
          <Columns3 className="w-3.5 h-3.5" />
        </TableMenuButton>
      </div>

      <Divider />

      <div className="flex items-center gap-1">
        <TableMenuButton title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
          <span className="text-xs font-bold leading-none">H</span>
        </TableMenuButton>
        <TableMenuButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()} variant="danger">
          <Trash2 className="w-3.5 h-3.5" />
        </TableMenuButton>
      </div>
    </div>
  );
}

export default TableMenu;
