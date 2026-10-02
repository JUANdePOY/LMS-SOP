import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Highlighter,
  Undo2,
  Redo2,
} from 'lucide-react';

const TASK_CONTENT_STYLES = `
.task-rich-text-editor .tiptap {
  max-width: none;
  padding: 0.5rem 0.75rem;
  min-height: 120px;
  outline: none;
  font-size: 0.875rem;
  color: var(--text-primary);
}
.task-rich-text-editor .tiptap h2 {
  font-size: 1rem;
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
.task-rich-text-editor .tiptap p {
  margin-bottom: 0.5rem;
}
.task-rich-text-editor .tiptap p:last-child {
  margin-bottom: 0;
}
.task-rich-text-editor .tiptap ul {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.task-rich-text-editor .tiptap ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.task-rich-text-editor .tiptap li {
  margin-bottom: 0.25rem;
}
.task-rich-text-editor .tiptap blockquote {
  border-left: 4px solid var(--border);
  padding-left: 0.75rem;
  font-style: italic;
  color: var(--text-muted);
}
.task-rich-text-editor .tiptap a {
  color: #2563eb;
  text-decoration: underline;
}
.dark .task-rich-text-editor .tiptap a {
  color: #60a5fa;
}
.task-rich-text-editor .tiptap strong {
  font-weight: bold;
}
.task-rich-text-editor .tiptap em {
  font-style: italic;
}
.task-rich-text-editor .tiptap mark {
  border-radius: 0.125rem;
  padding-left: 0.125rem;
  padding-right: 0.125rem;
}
`;

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }`}
    >
      {children}
    </button>
  );
}

export default function TaskRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Add a description...',
  minHeight = '120px',
  onBlur,
}) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      html = html.replace(/<p>\s*<\/p>/g, '').trim();
      onChangeRef.current?.(html || '');
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
  });

  useEffect(() => {
    if (!editor) return;
    const clean = (html) => html.replace(/<p>\s*<\/p>/g, '').trim();
    if (clean(editor.getHTML()) !== clean(value || '')) {
      if (editor.isFocused) return;
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const selectedText = editor.state.selection.empty
      ? ''
      : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
    let url = selectedText.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="task-rich-text-editor">
      <div className="flex flex-wrap items-center gap-1 border border-[var(--border)] border-b-0 rounded-t-lg bg-[var(--bg-surface)] px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>

        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />

        <ToolbarButton
          title="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />

        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Justify"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarButton>

        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />

        <ToolbarButton
          title="Highlight"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          active={editor.isActive('link')}
          onClick={toggleLink}
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>

        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />

        <ToolbarButton
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
      <div
        className="border border-[var(--border)] rounded-b-lg bg-[var(--bg-page)]"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
      <style>{`
        ${TASK_CONTENT_STYLES}
        .task-rich-text-editor .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
