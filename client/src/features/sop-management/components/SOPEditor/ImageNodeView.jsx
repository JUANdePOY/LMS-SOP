import { useRef, useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, RefreshCw, AlertTriangle, X } from 'lucide-react';

const SIZE_PRESETS = [
  { label: 'Small', value: '25%' },
  { label: 'Medium', value: '50%' },
  { label: 'Large', value: '100%' },
];

function ImageNodeView({ node, updateAttributes, selected, deleteNode, editor }) {
  const { src, alt, width, align, caption, uploading, error } = node.attrs;
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const dragState = useRef(null);
  const [resizing, setResizing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(caption || '');

  const editable = editor?.isEditable;

  const onDragHandleMouseDown = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current || !editable) return;
    const startWidth = imgRef.current.getBoundingClientRect().width;
    const parentWidth = wrapperRef.current.parentElement?.getBoundingClientRect().width || startWidth;
    dragState.current = { startX: e.clientX, startWidth, parentWidth, direction };
    setResizing(true);

    const onMove = (moveEvent) => {
      if (!dragState.current) return;
      const { startX, startWidth: sw, parentWidth: pw, direction: dir } = dragState.current;
      const delta = dir === 'left' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      const newWidthPx = Math.max(60, Math.min(pw, sw + delta * 2));
      const pct = Math.round((newWidthPx / pw) * 100);
      updateAttributes({ width: `${Math.max(10, Math.min(100, pct))}%` });
    };
    const onUp = () => {
      dragState.current = null;
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editable, updateAttributes]);

  const commitCaption = () => {
    if ((caption || '') !== captionDraft) {
      updateAttributes({ caption: captionDraft });
    }
  };

  const alignClass = align === 'left' ? 'mr-auto' : align === 'right' ? 'ml-auto' : 'mx-auto';

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`sop-image-node group relative my-3 ${alignClass}`}
      style={{ width: width || '60%', maxWidth: '100%' }}
      data-drag-handle
    >
      <div
        className={`relative rounded-lg overflow-hidden border ${
          selected ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/50' : 'border-neutral-200 dark:border-neutral-700'
        }`}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          className={`block w-full h-auto select-none ${uploading ? 'opacity-50' : ''}`}
          draggable={false}
        />

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 dark:bg-neutral-900/60">
            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">Uploading…</span>
          </div>
        )}

        {error && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50/90 dark:bg-red-950/70">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Upload failed</span>
            <button
              type="button"
              onClick={() => deleteNode()}
              className="text-xs underline text-red-700 dark:text-red-300"
            >
              Remove
            </button>
          </div>
        )}

        {editable && !uploading && (
          <>
            {/* Resize handles */}
            <div
              onMouseDown={(e) => onDragHandleMouseDown(e, 'left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-10 -ml-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-indigo-600/80 rounded"
            />
            <div
              onMouseDown={(e) => onDragHandleMouseDown(e, 'right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-10 -mr-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-indigo-600/80 rounded"
            />

            {/* Floating controls */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-neutral-800/95 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 px-1 py-1">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  onClick={() => updateAttributes({ width: preset.value })}
                  className={`px-1.5 py-0.5 text-[11px] rounded ${
                    width === preset.value
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {preset.label[0]}
                </button>
              ))}
              <span className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
              <button type="button" title="Align left" onClick={() => updateAttributes({ align: 'left' })} className={`p-1 rounded ${align === 'left' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Align center" onClick={() => updateAttributes({ align: 'center' })} className={`p-1 rounded ${align === 'center' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Align right" onClick={() => updateAttributes({ align: 'right' })} className={`p-1 rounded ${align === 'right' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
              <button type="button" title="Remove image" onClick={() => deleteNode()} className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {resizing && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-neutral-900/80 text-white text-[11px] px-2 py-0.5 rounded">
                {width || 'auto'}
              </div>
            )}
          </>
        )}
      </div>

      {(editable || caption) && !uploading && (
        <figcaption
          contentEditable={editable}
          suppressContentEditableWarning
          onInput={(e) => setCaptionDraft(e.currentTarget.textContent)}
          onBlur={commitCaption}
          data-placeholder="Add a caption…"
          className="mt-1.5 text-center text-xs text-neutral-500 dark:text-neutral-400 italic outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 dark:empty:before:text-neutral-600"
        >
          {caption}
        </figcaption>
      )}
    </NodeViewWrapper>
  );
}

export default ImageNodeView;
