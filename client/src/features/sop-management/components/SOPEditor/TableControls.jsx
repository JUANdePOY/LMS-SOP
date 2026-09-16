import { useRef, useEffect, useState } from 'react';
import { Plus, ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';

function TableControls({ editor, show }) {
  const controlsRef = useRef(null);
  const [position, setPosition] = useState({ bottom: 0, right: 0 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!show || !editor) return;

    const table = editor.view.dom.querySelector('table');
    if (!table) return;

    const updatePosition = () => {
      if (!controlsRef.current) return;
      const tableRect = table.getBoundingClientRect();
      const wrapperRect = controlsRef.current.parentElement.getBoundingClientRect();

      setPosition({
        bottom: wrapperRect.bottom - tableRect.bottom,
        right: wrapperRect.right - tableRect.right,
      });
    };

    updatePosition();

    const onMouseEnter = () => setHovered(true);
    const onMouseLeave = () => setHovered(false);

    table.addEventListener('mouseenter', onMouseEnter);
    table.addEventListener('mouseleave', onMouseLeave);

    editor.on('transaction', updatePosition);

    return () => {
      table.removeEventListener('mouseenter', onMouseEnter);
      table.removeEventListener('mouseleave', onMouseLeave);
      editor.off('transaction', updatePosition);
    };
  }, [show, editor]);

  if (!show) return null;

  return (
    <div
      ref={controlsRef}
      className="absolute z-20 flex items-center gap-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg px-1 py-0.5 transition-opacity pointer-events-auto"
      style={{
        bottom: position.bottom + 4,
        right: position.right + 4,
        opacity: hovered ? 1 : 0,
      }}
    >
      <button
        type="button"
        title="Add row below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <ArrowDownToLine className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Add row above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <ArrowUpToLine className="w-3.5 h-3.5" />
      </button>
      <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-600 mx-0.5" />
      <button
        type="button"
        title="Add column right"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <ArrowRightToLine className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Add column left"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <ArrowLeftToLine className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default TableControls;
