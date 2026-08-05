import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, UnderlineIcon, Strikethrough, Link as LinkIcon, Highlighter } from 'lucide-react';

const HIGHLIGHT_COLORS = [
  { label: 'Warning', color: '#fef08a' }, // yellow
  { label: 'Danger', color: '#fecaca' },  // red
  { label: 'Note', color: '#bbf7d0' },    // green
];

function BubbleButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-neutral-200 hover:bg-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

function EditorBubbleMenu({ editor }) {
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

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ state }) => {
        const { from, to } = state.selection;
        return from !== to && !editor.isActive('image');
      }}
      className="flex items-center gap-0.5 bg-neutral-800 rounded-lg shadow-lg px-1 py-1"
    >
      <BubbleButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="w-4 h-4" />
      </BubbleButton>
      <BubbleButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="w-4 h-4" />
      </BubbleButton>
      <BubbleButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="w-4 h-4" />
      </BubbleButton>
      <BubbleButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="w-4 h-4" />
      </BubbleButton>
      <BubbleButton title="Link" active={editor.isActive('link')} onClick={setLink}>
        <LinkIcon className="w-4 h-4" />
      </BubbleButton>

      <span className="w-px h-5 bg-neutral-600 mx-0.5" />

      {HIGHLIGHT_COLORS.map((h) => (
        <button
          key={h.color}
          type="button"
          title={h.label}
          onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}
          className={`w-5 h-5 rounded-full border-2 ${
            editor.isActive('highlight', { color: h.color }) ? 'border-white' : 'border-transparent'
          }`}
          style={{ backgroundColor: h.color }}
        />
      ))}
      <BubbleButton
        title="Highlight (default)"
        active={editor.isActive('highlight') && !HIGHLIGHT_COLORS.some((h) => editor.isActive('highlight', { color: h.color }))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="w-4 h-4" />
      </BubbleButton>
    </BubbleMenu>
  );
}

export default EditorBubbleMenu;
