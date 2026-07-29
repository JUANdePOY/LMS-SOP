import { useRef, useEffect } from "react";

export default function RichTextEditor({ value = "", onChange, placeholder = "Write something...", rows = 4 }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const current = editorRef.current.innerHTML;
      if (current !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleChange = () => {
    if (!editorRef.current || !onChange) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || "";
    if (text.trim() === "" || html === "<br>") {
      onChange("");
    } else {
      onChange(html);
    }
    editorRef.current.dir = "ltr";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      editorRef.current?.blur();
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        dir="ltr"
        lang="en"
        className="w-full px-3 py-2 text-sm outline-none min-h-[60px] text-left"
        style={{ direction: 'ltr !important', textAlign: 'left !important', unicodeBidi: 'plaintext' }}
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #a3a3a3;
          pointer-events: none;
        }
        [contenteditable] p { margin: 0 0 0.5rem; }
        [contenteditable] ul { margin: 0.25rem 0; padding-left: 1.25rem; }
        [contenteditable] ol { margin: 0.25rem 0; padding-left: 1.25rem; }
        [contenteditable] blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 0.75rem;
          margin: 0.5rem 0;
          color: #4b5563;
        }
        [contenteditable] a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}
