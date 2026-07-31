import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Globe, Lock, Link2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

function Drawer({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col animate-in slide-in-from-right duration-200 h-full ml-auto">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-4 sm:px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 sm:p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 sm:px-5 py-4 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

function ShareLinkDrawer({ open, onClose, sopId }) {
  const [linkType, setLinkType] = useState("private");
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const publicLink = `${baseUrl}/s/${sopId || "sample-sop-id"}`;
  const privateLink = `${baseUrl}/sops/${sopId || "sample-sop-id"}`;

  const currentLink = linkType === "public" ? publicLink : privateLink;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    // Frontend-only placeholder
    console.log("Download SOP:", sopId);
  };

  useEffect(() => {
    setCopied(false);
  }, [linkType]);

  return (
    <Drawer open={open} onClose={onClose} title="Share SOP">
      <div className="space-y-5">
        <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <button
            onClick={() => setLinkType("private")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
              linkType === "private"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <Lock size={16} />
            Private
          </button>
          <button
            onClick={() => setLinkType("public")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l border-neutral-200 dark:border-neutral-700",
              linkType === "public"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <Globe size={16} />
            Public
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            {linkType === "public" ? "Public Link" : "Private Link"}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2">
              <Link2 size={16} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                readOnly
                value={currentLink}
                className="flex-1 bg-transparent text-sm text-neutral-700 dark:text-neutral-300 outline-none min-w-0 truncate"
              />
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-medium transition-colors shrink-0",
                copied
                  ? "bg-green-600 text-white"
                  : "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={handleDownload}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors w-full",
              "border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <Download size={16} />
            Download SOP
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {linkType === "public"
              ? "Anyone with the link can view this SOP. No login required."
              : "Only users with access to this SOP can open this link. They will need to sign in."}
          </p>
        </div>
      </div>
    </Drawer>
  );
}

export { ShareLinkDrawer, Drawer };
export default ShareLinkDrawer;
