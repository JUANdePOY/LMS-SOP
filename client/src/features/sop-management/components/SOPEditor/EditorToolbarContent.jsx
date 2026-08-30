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
} from 'lucide-react';

const HIGHLIGHT_SWATCHES = [
  { label: 'Warning', color: '#fef08a' },
  { label: 'Danger', color: '#fecaca' },
  { label: 'Note', color: '#bbf7d0' },
];

/**
 * Single source of truth for the rich-text toolbar. Rendered both in the
 * static top toolbar and in the floating BubbleMenu (selection) so a
 * highlighted selection gets the exact same tools. `Button` is the themed
 * button component (light for the toolbar, dark for the bubble), `theme`
 * controls raw controls (color picker / font select).
 */
export default function EditorToolbarContent({ editor, Button, onPickImage, uploadEnabled, theme = 'light' }) {
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

  const sepClass = theme === 'dark'
    ? 'w-px h-5 bg-neutral-600 mx-0.5'
    : 'w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1';
  const inputClass = theme === 'dark'
    ? 'w-6 h-6 rounded cursor-pointer border border-neutral-600 bg-transparent p-0'
    : 'w-6 h-6 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700 bg-transparent p-0';
  const selectClass = theme === 'dark'
    ? 'text-xs border border-neutral-600 rounded-md bg-neutral-800 text-neutral-200 px-1 py-1'
    : 'text-xs border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-1';
  const swatchActive = theme === 'dark' ? 'border-white' : 'border-neutral-900 dark:border-white scale-110';
  const swatchIdle = theme === 'dark' ? 'border-transparent' : 'border-neutral-300 dark:border-neutral-600';

  return (
    <>
      <Button
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="w-4 h-4" />
      </Button>
      <Button
        title="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="w-4 h-4" />
      </Button>

      <span className={sepClass} />

      <Button
        title="Heading"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-4 h-4" />
      </Button>
      <Button
        title="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        title="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </Button>
      <Button
        title="Checklist"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks className="w-4 h-4" />
      </Button>
      <Button
        title="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-4 h-4" />
      </Button>
      <Button title="Link" active={editor.isActive('link')} onClick={setLink}>
        <LinkIcon className="w-4 h-4" />
      </Button>

      <span className={sepClass} />

      <Button
        title="Highlight"
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="w-4 h-4" />
      </Button>
      {HIGHLIGHT_SWATCHES.map((h) => (
        <button
          key={h.color}
          type="button"
          title={`Highlight: ${h.label}`}
          onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}
          className={`w-4 h-4 rounded-full border transition-transform ${
            editor.isActive('highlight', { color: h.color }) ? swatchActive : swatchIdle
          }`}
          style={{ backgroundColor: h.color }}
        />
      ))}

      <span className={sepClass} />

      <Button
        title={uploadEnabled ? 'Insert image' : 'Save the module first to add images'}
        disabled={!uploadEnabled}
        onClick={onPickImage}
      >
        <ImagePlus className="w-4 h-4" />
      </Button>
      <Button title="Insert table" active={editor.isActive('table')} onClick={insertTable}>
        <TableIcon className="w-4 h-4" />
      </Button>

      <span className={sepClass} />

      <Button
        title="Align left"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="w-4 h-4" />
      </Button>
      <Button
        title="Align center"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="w-4 h-4" />
      </Button>
      <Button
        title="Align right"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="w-4 h-4" />
      </Button>
      <Button
        title="Justify"
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify className="w-4 h-4" />
      </Button>

      <span className={sepClass} />

      <input
        type="color"
        title="Text color"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        className={inputClass}
      />
      <select
        title="Font family"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) editor.chain().focus().unsetFontFamily().run();
          else editor.chain().focus().setFontFamily(v).run();
        }}
        className={selectClass}
      >
        <option value="">Default font</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="'Courier New', monospace">Courier New</option>
      </select>

      <span className={sepClass} />

      <Button
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="w-4 h-4" />
      </Button>
    </>
  );
}
