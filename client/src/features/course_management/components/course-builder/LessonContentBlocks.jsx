import { useState, useCallback, useId, useRef } from "react";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Image as ImageIcon,
  Plus,
  Type,
  Quote,
  Minus,
  MessageSquare,
  Copy,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

let blockSeq = 0;
const newBlockId = () => `blk-${Date.now()}-${blockSeq++}`;

const BLOCK_LABELS = {
  text: "Text",
  image: "Image",
  callout: "Callout",
  quote: "Quote",
  divider: "Divider",
  heading: "Heading",
  code: "Code",
};

/**
 * Parse a serialized HTML string (produced by serializeBlocks) back into blocks.
 * Best-effort: unknown markup is kept as a single text block so content is never lost.
 */
export function parseBlocks(html) {
  if (!html || typeof html !== "string") return [];
  const container = document.createElement("div");
  container.innerHTML = html;
  const children = Array.from(container.children);
  if (!children.length) {
    const text = container.textContent?.trim();
    return text ? [{ id: newBlockId(), kind: "text", html }] : [];
  }
  return children
    .map((el) => {
      const cls = el.getAttribute("class") || "";
      const tag = el.tagName.toLowerCase();
      if (tag === "figure" && el.querySelector("img")) {
        const img = el.querySelector("img");
        const caption = el.querySelector("figcaption")?.innerHTML || "";
        return { id: newBlockId(), kind: "image", src: img.getAttribute("src") || "", caption };
      }
      if (tag === "hr" || cls.includes("lb-divider")) return { id: newBlockId(), kind: "divider" };
      if (tag === "blockquote" || cls.includes("lb-quote")) return { id: newBlockId(), kind: "quote", html: el.innerHTML };
      if (cls.includes("lb-callout")) return { id: newBlockId(), kind: "callout", variant: el.getAttribute("data-variant") || "info", html: el.innerHTML };
      if (tag === "pre" || cls.includes("lb-code")) return { id: newBlockId(), kind: "code", html: el.textContent || "" };
      if (tag === "h2" || cls.includes("lb-heading")) return { id: newBlockId(), kind: "heading", html: el.textContent || "" };
      return { id: newBlockId(), kind: "text", html: el.innerHTML };
    })
    .filter(Boolean);
}

export function serializeBlocks(blocks) {
  return blocks
    .map((b) => {
      switch (b.kind) {
        case "image":
          return `<figure class="lb-image">${b.src ? `<img src="${b.src}" alt="${(b.caption || "").replace(/"/g, "&quot;")}" />` : ""}${b.caption?.trim() ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
        case "divider":
          return `<hr class="lb-divider" />`;
        case "quote":
          return `<blockquote class="lb-quote">${b.html || ""}</blockquote>`;
        case "callout":
          return `<div class="lb-callout" data-variant="${b.variant || "info"}">${b.html || ""}</div>`;
        case "code":
          return `<pre class="lb-code"><code>${escapeHtml(b.html || "")}</code></pre>`;
        case "heading":
          return `<h2 class="lb-heading">${escapeHtml(b.html || "")}</h2>`;
        default:
          return `<div class="lb-text">${b.html || ""}</div>`;
      }
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Extract outline entries (headings) from the current blocks. */
export function extractOutline(blocks) {
  return blocks
    .filter((b) => (b.kind === "heading" || b.kind === "text") && (b.html || "").match(/<h[12][^>]*>/i))
    .map((b) => {
      const m = (b.html || "").match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
      const text = m ? m[1].replace(/<[^>]+>/g, "") : "";
      return { id: b.id, text };
    })
    .filter((o) => o.text.trim());
}

export default function LessonContentBlocks({ value, onChange, onImageUpload }) {
  const listId = useId();
  const [blocks, setBlocks] = useState(() => parseBlocks(value));
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const blockRefs = useRef({});

  const sync = useCallback(
    (next) => {
      setBlocks(next);
      onChange(serializeBlocks(next));
    },
    [onChange]
  );

  const addBlock = (kind, atIndex) => {
    const block = { id: newBlockId(), kind, html: "", src: "", caption: "", variant: "info" };
    const next = [...blocks];
    if (atIndex == null) next.push(block);
    else next.splice(atIndex + 1, 0, block);
    sync(next);
    requestAnimationFrame(() => blockRefs.current[block.id]?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const updateBlock = (id, patch) => sync(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id) => sync(blocks.filter((b) => b.id !== id));
  const duplicateBlock = (id) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const copy = { ...blocks[idx], id: newBlockId() };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    sync(next);
  };

  const move = (from, to) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    sync(next);
  };

  const onDrop = (to) => {
    if (dragIndex !== null && dragIndex !== to) move(dragIndex, to);
    setDragIndex(null);
    setOverIndex(null);
  };

  // Keyboard reorder: Cmd/Ctrl + ArrowUp/Down on a block wrapper.
  const onBlockKeyDown = (e, index) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      move(index, e.key === "ArrowUp" ? index - 1 : index + 1);
    }
  };

  const scrollTo = (id) => {
    const el = blockRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!blocks.length) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-neutral-500">No content blocks yet.</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => addBlock("text")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <Type size={14} /> Add text
          </button>
          <button
            type="button"
            onClick={() => addBlock("image")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <ImageIcon size={14} /> Add image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul role="list" className="space-y-3" aria-label="Content blocks">
        {blocks.map((block, index) => (
          <BlockRow
            key={block.id}
            innerRef={(el) => (blockRefs.current[block.id] = el)}
            block={block}
            index={index}
            total={blocks.length}
            focused={focusedId === block.id}
            dragIndex={dragIndex}
            overIndex={overIndex}
            onFocus={() => setFocusedId(block.id)}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={() => onDrop(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onKeyDown={(e) => onBlockKeyDown(e, index)}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => removeBlock(block.id)}
            onDuplicate={() => duplicateBlock(block.id)}
            onAddAfter={(kind) => addBlock(kind, index)}
            onUpdate={(patch) => updateBlock(block.id, patch)}
            onImageUpload={onImageUpload}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <BlockAddMenu onAdd={(kind) => addBlock(kind)} />
      </div>
    </div>
  );
}

const BlockRow = ({ innerRef, ...props }) => {
  const {
    block, index, total, focused, dragIndex, overIndex,
    onFocus, onDragStart, onDragOver, onDrop, onDragEnd, onKeyDown,
    onMoveUp, onMoveDown, onRemove, onDuplicate, onUpdate, onImageUpload, onAddAfter,
  } = props;

  const isDragging = dragIndex === index;
  const isOver = overIndex === index && dragIndex !== null;

  return (
    <li
      ref={innerRef}
      role="listitem"
      aria-roledescription="lesson block"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      tabIndex={0}
      className={`group relative rounded-xl border bg-white transition-shadow dark:bg-neutral-900 ${
        isOver ? "border-blue-400 shadow-md" : "border-neutral-200 dark:border-neutral-700"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Block chip + actions header */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-2 py-1 dark:border-neutral-800">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {BLOCK_LABELS[block.kind] || "Block"}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <ActionButton title="Duplicate block" onClick={onDuplicate}>
            <Copy size={13} />
          </ActionButton>
          <ActionButton title="Move block up" disabled={index === 0} onClick={onMoveUp}>
            <ArrowUp size={13} />
          </ActionButton>
          <ActionButton title="Move block down" disabled={index === total - 1} onClick={onMoveDown}>
            <ArrowDown size={13} />
          </ActionButton>
          <ActionButton title="Remove block" danger onClick={onRemove}>
            <Trash2 size={13} />
          </ActionButton>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        <BlockBody
          block={block}
          focused={focused}
          onFocus={onFocus}
          onUpdate={onUpdate}
          onImageUpload={onImageUpload}
          onAddAfter={onAddAfter}
        />
      </div>
    </li>
  );
};

function BlockBody({ block, focused, onFocus, onUpdate, onImageUpload, onAddAfter }) {
  switch (block.kind) {
    case "divider":
      return <hr className="my-2 border-neutral-200 dark:border-neutral-700" />;
    case "image":
      return <ImageBlock block={block} onUpdate={onUpdate} onImageUpload={onImageUpload} />;
    case "heading":
    case "code":
      return (
        <input
          value={block.html || ""}
          onChange={(e) => onUpdate({ html: e.target.value })}
          onFocus={onFocus}
          placeholder={block.kind === "heading" ? "Section heading" : "Code snippet"}
          className={`w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 ${
            block.kind === "code" ? "font-mono" : "font-semibold"
          }`}
        />
      );
    case "quote":
    case "callout":
      return (
        <div className={block.kind === "callout" ? "space-y-2" : ""}>
          {block.kind === "callout" && (
            <select
              value={block.variant || "info"}
              onChange={(e) => onUpdate({ variant: e.target.value })}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
            </select>
          )}
          <RichTextEditor
            value={block.html}
            onChange={(html) => onUpdate({ html })}
            placeholder={block.kind === "quote" ? "Quote…" : "Callout text…"}
          />
        </div>
      );
    default:
      return (
        <div onFocus={onFocus} className="px-1">
          <RichTextEditor
            value={block.html}
            onChange={(html) => onUpdate({ html })}
            onImageUpload={onImageUpload}
            placeholder="Write this section…"
          />
        </div>
      );
  }
}

function ImageBlock({ block, onUpdate, onImageUpload }) {
  const [tab, setTab] = useState("url");
  const [localError, setLocalError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file");
      return;
    }
    if (!onImageUpload) {
      setLocalError("Save the module first to upload images");
      return;
    }
    setLocalError(null);
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      if (url) onUpdate({ src: url });
    } catch (err) {
      setLocalError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs font-medium text-neutral-500">
        <ImageIcon size={14} /> Image block
      </div>
      {block.src ? (
        <img src={block.src} alt={block.caption || ""} className="max-h-56 rounded-md border border-neutral-200 dark:border-neutral-700" />
      ) : (
        <div className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-400 dark:border-neutral-600">
          No image set
        </div>
      )}

      <div className="flex gap-1">
        <button type="button" onClick={() => setTab("url")} className={`rounded-md px-2 py-1 text-xs ${tab === "url" ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"}`}>
          URL
        </button>
        <button type="button" onClick={() => setTab("upload")} className={`rounded-md px-2 py-1 text-xs ${tab === "upload" ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"}`}>
          Upload
        </button>
      </div>

      {tab === "url" ? (
        <input
          type="url"
          value={block.src}
          onChange={(e) => onUpdate({ src: e.target.value })}
          placeholder="Image URL"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
      ) : (
        <div className="space-y-2">
          <label className="relative block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              disabled={uploading}
            />
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 py-2 text-sm text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-600">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? `Uploading ${progress}%` : "Choose image"}
            </div>
          </label>
          {uploading && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 size={14} className="animate-spin" /> Uploading…
            </div>
          )}
        </div>
      )}

      <input
        value={block.caption || ""}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
      />

      {localError && (
        <p className="inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {localError}
        </p>
      )}
    </div>
  );
}

function ActionButton({ children, onClick, title, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-20 ${
        danger ? "text-neutral-400 hover:bg-red-50 hover:text-red-600" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function BlockAddMenu({ onAdd }) {
  const [open, setOpen] = useState(false);
  const options = [
    { kind: "text", label: "Text", Icon: Type },
    { kind: "heading", label: "Heading", Icon: Type },
    { kind: "callout", label: "Callout", Icon: MessageSquare },
    { kind: "quote", label: "Quote", Icon: Quote },
    { kind: "image", label: "Image", Icon: ImageIcon },
    { kind: "divider", label: "Divider", Icon: Minus },
    { kind: "code", label: "Code", Icon: Type },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      >
        <Plus size={14} /> Add block
      </button>
      {open && (
        <div className="absolute bottom-full z-20 mb-1 grid w-44 grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {options.map((o) => (
            <button
              key={o.kind}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onAdd(o.kind);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <o.Icon size={13} /> {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
