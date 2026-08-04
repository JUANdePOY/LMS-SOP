import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Globe, Lock, Link2, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/Toast";
import { createShareLink, getShareLinks, revokeShareLink } from "@/features/sop-management/services/sopService";

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
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

  useEffect(() => {
    if (!open || !sopId) return;
    setCopied(false);
    setError(null);

    const loadExistingLink = async () => {
      try {
        const { data: sharesResponse } = await getShareLinks(sopId);
        const shares = sharesResponse?.data || [];
        const existing = shares.find((s) => s.share_type === linkType && !s.is_deleted);
        if (existing && existing.token) {
          setShareUrl(`${baseUrl}/s/${existing.token}`);
        } else {
          setShareUrl("");
        }
      } catch {
        setShareUrl("");
      }
    };

    loadExistingLink();
  }, [open, sopId, linkType]);

  const handleGenerateLink = useCallback(async () => {
    if (!sopId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: response } = await createShareLink(sopId, {
        share_type: linkType,
        permissions: "view",
      });

      const token = response?.data?.token;
      if (token) {
        setShareUrl(`${baseUrl}/s/${token}`);
        toast.success(`${linkType === "public" ? "Public" : "Private"} link generated`);
      }
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.message || "Failed to generate link";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [sopId, linkType, baseUrl, toast]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownload = () => {
    if (!sopId) return;
    const url = `${baseUrl}/sops/${sopId}/export`;
    window.open(url, "_blank");
  };

  const handleRevoke = async () => {
    if (!sopId || !shareUrl) return;
    setLoading(true);
    try {
      const token = shareUrl.split("/s/")[1];
      if (token) {
        const { data: sharesResponse } = await getShareLinks(sopId);
        const shares = sharesResponse?.data || [];
        const share = shares.find((s) => s.token === token);
        if (share) {
          await revokeShareLink(sopId, share.id);
          setShareUrl("");
          toast.success("Link revoked");
        }
      }
    } catch {
      toast.error("Failed to revoke link");
    } finally {
      setLoading(false);
    }
  };

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

        {!shareUrl && (
          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Generate {linkType === "public" ? "Public" : "Private"} Link
          </button>
        )}

        {shareUrl && (
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
                  value={shareUrl}
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
              onClick={handleRevoke}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-white dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              Revoke Link
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleDownload}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          <Download size={16} />
          Download SOP
        </button>

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
