import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Loader2 } from 'lucide-react';

import ImageResizable from './ImageResizable';
import EditorBubbleMenu from './EditorBubbleMenu';
import EditorToolbarContent from './EditorToolbarContent';
import TableMenu from './TableMenu';
import { insertImageWithUpload, isImageFile } from './imageUploadHelpers';
import EDITOR_CONTENT_STYLES from '../../utils/sopContentStyles';

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor, onPickImage, uploadEnabled }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border border-neutral-200 dark:border-neutral-700 border-b-0 rounded-t-lg bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1.5">
      <EditorToolbarContent
        editor={editor}
        Button={ToolbarButton}
        onPickImage={onPickImage}
        uploadEnabled={uploadEnabled}
        theme="light"
      />
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.value - HTML content
 * @param {(html: string) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {(file: File) => Promise<string>} [props.onImageUpload] - resolves to a
 *   servable URL. If omitted, the image toolbar button is disabled and
 *   pasted/dropped images are inserted as local-only previews (flagged as
 *   failed so it's obvious they won't survive a reload).
 */
function RichTextEditor({ value, onChange, disabled = false, placeholder = 'Enter module content...', onImageUpload }) {
  const fileInputRef = useRef(null);

  // Keep the latest callbacks in refs. Tiptap's `useEditor` captures the
  // `onUpdate`/`onDrop`/`onPaste` handlers once at editor creation and (in v3)
  // never refreshes them, so reading them from a ref guarantees every editor
  // instance always talks to its OWN current props instead of a stale/shared
  // closure. This is what prevented edits from leaking across instances.
  const onChangeRef = useRef(onChange);
  const onImageUploadRef = useRef(onImageUpload);
  onChangeRef.current = onChange;
  onImageUploadRef.current = onImageUpload;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ImageResizable,
      CharacterCount,
      TextStyle,
      Color,
      FontFamily,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      html = html.replace(/<p>\s*<\/p>/g, '').trim();
      onChangeRef.current?.(html || '');
    },
    editorProps: {
      attributes: {
        class: EDITOR_CONTENT_STYLES,
      },
      // --- Automatic screenshot / clipboard image paste ---
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter((item) => item.kind === 'file' && item.type.startsWith('image/'));
        if (imageItems.length === 0) return false;

        event.preventDefault();
        imageItems.forEach((item) => {
          const file = item.getAsFile();
          if (file) insertImageWithUpload(editor, file, null, onImageUploadRef.current);
        });
        return true;
      },
      // --- Drag-and-drop image support ---
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []).filter(isImageFile);
        if (files.length === 0) return false;

        event.preventDefault();
        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords)?.pos ?? view.state.selection.from;
        files.forEach((file, i) => insertImageWithUpload(editor, file, pos + i, onImageUploadRef.current));
        return true;
      },
    },
  });

  // Keep the editor in sync when `value` changes from outside (e.g. switching lessons,
  // resetting the form) without fighting the user's own typing (which drives onUpdate).
  useEffect(() => {
    if (!editor) return;
    const clean = (html) => html.replace(/<p>\s*<\/p>/g, '').trim();
    if (clean(editor.getHTML()) !== clean(value || '')) {
      // Don't clobber the editor the user is actively editing — only sync when the
      // external value diverges and the field isn't focused, otherwise we'd overwrite
      // the in-progress content/cursor of this instance.
      if (editor.isFocused) return;
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []).filter(isImageFile);
    files.forEach((file) => insertImageWithUpload(editor, file, null, onImageUpload));
    e.target.value = '';
  };

  const charCount = editor?.storage.characterCount?.characters() ?? 0;
  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const showTableMenu = editor?.isActive('table');

  return (
    <div className="rich-text-editor">
      <EditorToolbar
        editor={editor}
        uploadEnabled={!!onImageUpload}
        onPickImage={() => fileInputRef.current?.click()}
      />
      {showTableMenu && <TableMenu editor={editor} />}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div
        className={`border border-neutral-200 dark:border-neutral-700 ${showTableMenu ? '' : 'rounded-b-lg'} bg-white dark:bg-neutral-800`}
      >
        <EditorContent editor={editor} />
      </div>
      {editor && <EditorBubbleMenu editor={editor} uploadEnabled={!!onImageUpload} />}
      <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
        <span className="flex items-center gap-1">
          {disabled && <Loader2 className="w-3 h-3 animate-spin" />}
        </span>
        <span>{wordCount} words · {charCount} characters</span>
      </div>
    </div>
  );
}

export default RichTextEditor;