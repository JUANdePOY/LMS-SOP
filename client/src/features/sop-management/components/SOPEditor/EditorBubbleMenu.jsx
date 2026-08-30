import { BubbleMenu } from '@tiptap/react/menus';
import EditorToolbarContent from './EditorToolbarContent';

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

function EditorBubbleMenu({ editor, uploadEnabled }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ state }) => {
        const { from, to } = state.selection;
        return from !== to && !editor.isActive('image');
      }}
      className="z-[1000] flex flex-wrap items-center gap-0.5 bg-neutral-800 rounded-lg shadow-lg px-1 py-1 max-w-[min(92vw,440px)]"
    >
      <EditorToolbarContent
        editor={editor}
        Button={BubbleButton}
        uploadEnabled={uploadEnabled}
        theme="dark"
      />
    </BubbleMenu>
  );
}

export default EditorBubbleMenu;
