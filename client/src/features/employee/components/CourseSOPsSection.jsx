import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCourseSops } from "../api/employeeSop.api";
import { FileText, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";

const LINK_TYPE_STYLES = {
  Prerequisite: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  Reference: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Companion: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
};

export default function CourseSOPsSection({ courseId }) {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    getCourseSops(courseId)
      .then((res) => {
        const data = res?.data || res || [];
        const rows = Array.isArray(data) ? data : [];
        const allowed = rows.filter((sop) => ['Published'].includes(sop.sop_status));
        setSops(allowed);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load SOPs");
        setSops([]);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Course SOPs</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-neutral-200 dark:bg-neutral-700 w-2/3" />
                  <div className="h-3 rounded bg-neutral-200 dark:bg-neutral-700 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-500/10 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      </div>
    );
  }

  if (!sops.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm">
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Course SOPs</h3>
      <div className="space-y-3">
        {sops.map((sop) => (
          <Link
            key={sop.sop_id}
            to={`/my-learning/sops/${sop.sop_id}`}
            className="flex items-start gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {sop.sop_title || sop.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {sop.sop_code && (
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{sop.sop_code}</span>
                )}
                {sop.link_type && (
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${LINK_TYPE_STYLES[sop.link_type] || LINK_TYPE_STYLES.Reference}`}>
                    {sop.link_type}
                  </span>
                )}
              </div>
            </div>
            {sop.is_required && (
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                Required
              </span>
            )}
            <ExternalLink size={14} className="shrink-0 text-neutral-400 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
