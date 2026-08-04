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
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ImagePlus,
  Table as TableIcon,
  Highlighter,
  Loader2,
} from 'lucide-react';

import ImageResizable from './ImageResizable';
import EditorBubbleMenu from './EditorBubbleMenu';
import TableMenu from './TableMenu';
import { insertImageWithUpload, isImageFile } from './imageUploadHelpers';

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

const HIGHLIGHT_SWATCHES = [
  { label: 'Warning', color: '#fef08a' },
  { label: 'Danger', color: '#fecaca' },
  { label: 'Note', color: '#bbf7d0' },
];

function EditorToolbar({ editor, onPickImage, uploadEnabled }) {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border border-neutral-200 dark:border-neutral-700 border-b-0 rounded-t-lg bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1.5">
      <ToolbarButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      <ToolbarButton
        title="Heading"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Checklist"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* Highlight: quick default toggle + a couple of preset colors for warnings/notes */}
      <ToolbarButton
        title="Highlight"
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="w-4 h-4" />
      </ToolbarButton>
      {HIGHLIGHT_SWATCHES.map((h) => (
        <button
          key={h.color}
          type="button"
          title={`Highlight: ${h.label}`}
          onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}
          className={`w-4 h-4 rounded-full border transition-transform ${
            editor.isActive('highlight', { color: h.color })
              ? 'border-neutral-900 dark:border-white scale-110'
              : 'border-neutral-300 dark:border-neutral-600'
          }`}
          style={{ backgroundColor: h.color }}
        />
      ))}

      <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      <ToolbarButton
        title={uploadEnabled ? 'Insert image' : 'Save the module first to add images'}
        disabled={!uploadEnabled}
        onClick={onPickImage}
      >
        <ImagePlus className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert table" active={editor.isActive('table')} onClick={insertTable}>
        <TableIcon className="w-4 h-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      <ToolbarButton
        title="Align left"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Align center"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Align right"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Justify"
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify className="w-4 h-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* Text color - uses @tiptap/extension-color + text-style */}
      <input
        type="color"
        title="Text color"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        className="w-6 h-6 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700 bg-transparent p-0"
      />
      <select
        title="Font family"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) editor.chain().focus().unsetFontFamily().run();
          else editor.chain().focus().setFontFamily(v).run();
        }}
        className="text-xs border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-1"
      >
        <option value="">Default font</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="'Courier New', monospace">Courier New</option>
      </select>

      <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

// Styles the editor's content directly (headings, lists, quote, links, tables,
// checklists, images) instead of depending on @tailwindcss/typography's `prose`
// class, which may not be installed.
const EDITOR_CONTENT_STYLES = [
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
].join(' ');

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
      onChange(html || '');
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
          if (file) insertImageWithUpload(editor, file, null, onImageUpload);
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
        files.forEach((file, i) => insertImageWithUpload(editor, file, pos + i, onImageUpload));
        return true;
      },
    },
  });

  // Keep the editor in sync when `value` changes from outside (e.g. switching modules,
  // resetting the form) without fighting the user's own typing (which drives onUpdate).
  useEffect(() => {
    if (!editor) return;
    const clean = (html) => html.replace(/<p>\s*<\/p>/g, '').trim();
    if (clean(editor.getHTML()) !== clean(value || '')) {
      editor.commands.setContent(value || '', false);
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
      {editor && <EditorBubbleMenu editor={editor} />}
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