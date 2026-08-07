import { useEffect, useState } from "react";
import { Award, ExternalLink, AlertTriangle, ImageOff, Loader2 } from "lucide-react";
import api from "@/services/api";

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-600",
  draft: "bg-amber-50 text-amber-600",
  archived: "bg-neutral-100 text-neutral-600",
};

function statusLabel(status) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

/** Count the sections that actually carry content, for an at-a-glance summary. */
function countFilledSections(sections) {
  if (!sections || typeof sections !== "object") return 0;
  return Object.values(sections).reduce((total, data) => {
    if (!data || typeof data !== "object") return total;
    if (Array.isArray(data.items)) return total + (data.items.length > 0 ? 1 : 0);
    return total + (data.text ? 1 : 0);
  }, 0);
}

/**
 * Live preview card for a certificate lesson.
 * Shows the template frame artwork, name, status, orientation, and ownership
 * context so authors can confirm they attached the right certificate.
 */
export default function CertificatePreview({ template, onOpen }) {
  const [framePreview, setFramePreview] = useState(null);
  const [frameError, setFrameError] = useState(false);
  const [frameLoading, setFrameLoading] = useState(false);

  const templateId = template?.id;

  useEffect(() => {
    if (!templateId) {
      setFramePreview(null);
      setFrameError(false);
      return;
    }

    let cancelled = false;
    let objectUrl = null;
    setFrameLoading(true);
    setFrameError(false);

    api
      .get(`/certificate-templates/${templateId}/frame`, {
        responseType: "blob",
        headers: { Accept: "image/png, image/jpeg, image/jpg, image/webp, */*" },
      })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setFramePreview(objectUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setFrameError(true);
        setFramePreview(null);
      })
      .finally(() => {
        if (!cancelled) setFrameLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [templateId]);

  if (!template) {
    return (
      <div className="flex aspect-[2.4/1] w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center">
        <div className="space-y-2 px-4">
          <Award size={28} className="mx-auto text-neutral-300" />
          <p className="text-sm text-neutral-500">Select a certificate template to preview it here</p>
        </div>
      </div>
    );
  }

  const status = (template.status || "draft").toLowerCase();
  const isProblematic = status !== "active";
  const orientation = (template.orientation || "landscape").toLowerCase();
  const filledSections = countFilledSections(template.sections);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {/* Frame artwork */}
        <div
          className={`relative flex w-full items-center justify-center bg-neutral-50 ${
            orientation === "portrait" ? "aspect-[1/1.414]" : "aspect-[1.414/1]"
          } max-h-64`}
        >
          {frameLoading ? (
            <Loader2 size={20} className="animate-spin text-neutral-400" />
          ) : framePreview ? (
            <img
              src={framePreview}
              alt={`${template.name || "Certificate"} frame preview`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-neutral-400">
              <ImageOff size={22} />
              <span className="text-xs">{frameError ? "Preview unavailable" : "No frame image"}</span>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 border-t border-neutral-100 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Award size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
                  {statusLabel(status)}
                </span>
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {orientation}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {template.name || "Untitled template"}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                {template.department_name && <span>{template.department_name}</span>}
                {template.width_px && template.height_px && (
                  <span>
                    {template.width_px}×{template.height_px}px
                  </span>
                )}
                {filledSections > 0 && (
                  <span>
                    {filledSections} section{filledSections === 1 ? "" : "s"}
                  </span>
                )}
                {template.created_by_name && <span>By {template.created_by_name}</span>}
              </div>
            </div>
          </div>
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              title="Open certificate template"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <ExternalLink size={13} /> Open
            </button>
          )}
        </div>
      </div>

      {isProblematic && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            This template is <span className="font-medium">{statusLabel(status).toLowerCase()}</span>. Learners may not
            receive a certificate until it is set to active.
          </span>
        </div>
      )}
    </div>
  );
}
