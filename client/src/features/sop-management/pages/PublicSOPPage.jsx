import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSharedSop,
  getSharedSopModules,
} from "@/features/sop-management/services/sopService";
import SOP_CONTENT_STYLES from "@/features/sop-management/utils/sopContentStyles";
import PublicModuleCard from "@/features/sop-management/components/SOPEditor/PublicModuleCard";
import ImageLightbox from "@/shared/components/ui/ImageLightBox";
import {
  Calendar,
  Clock,
  User,
  Building2,
  Tag,
  Hash,
  FileText,
  ArrowLeft,
  Share2,
  Loader2,
} from "lucide-react";

const STATUS_STYLES = {
  Draft: "bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300",
  "In Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "For Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Archived: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublicSOPPage() {
  const { token } = useParams();
  const [sop, setSop] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxAlt, setLightboxAlt] = useState("");
  const [modulesError, setModulesError] = useState(null);

  useEffect(() => {
    const fetchSop = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: response } = await getSharedSop(token);
        const sopData = response?.data;
        setSop(sopData);
      } catch (err) {
        const message =
          err?.response?.data?.error?.message || "Failed to load SOP";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSop();
    }
  }, [token]);

  useEffect(() => {
    const fetchModules = async () => {
      if (!token || loading || !sop) return;
      try {
        setModulesLoading(true);
        setModulesError(null);
        const { data: modResponse } = await getSharedSopModules(
          token,
          sop?.current_version_id
        );
        setModules(modResponse?.data || []);
      } catch (err) {
        const message =
          err?.response?.data?.error?.message || "Failed to load modules";
        setModulesError(message);
      } finally {
        setModulesLoading(false);
      }
    };

    fetchModules();
  }, [token, sop, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Header skeleton */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-sm animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-3/4 mb-4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-2" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full w-16" />
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full w-20" />
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Modules skeleton */}
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
                </div>
                <div className="space-y-2 pl-10">
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Link Not Found
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm leading-relaxed">
            {error}
          </p>
          <Link
            href="/sops"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to SOP Library
          </Link>
        </div>
      </div>
    );
  }

  const statusClass = STATUS_STYLES[sop?.status] || STATUS_STYLES.Draft;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* SOP Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-6 sm:py-8">
            {/* Title & Actions */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {sop?.code && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-mono font-medium">
                      <Hash size={12} />
                      {sop.code}
                    </span>
                  )}
                  {sop?.status && (
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border border-transparent ${statusClass}`}
                    >
                      {sop.status}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                  {sop?.title}
                </h1>
              </div>
            </div>

            {/* Description */}
            {sop?.description && (
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
                {sop.description}
              </p>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sop?.department_name && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Building2 size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                      Department
                    </p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                      {sop.department_name}
                    </p>
                  </div>
                </div>
              )}
              {sop?.category_name && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Tag size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                      Category
                    </p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                      {sop.category_name}
                    </p>
                  </div>
                </div>
              )}
              {sop?.owner_name && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <User size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                      Owner
                    </p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                      {sop.owner_name}
                    </p>
                  </div>
                </div>
              )}
              {sop?.created_at && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Calendar size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                      Created
                    </p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {formatDate(sop.created_at)}
                    </p>
                  </div>
                </div>
              )}
              {sop?.updated_at && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Clock size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                      Updated
                    </p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {formatDate(sop.updated_at)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                <FileText size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                    Modules
                  </p>
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {modules.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Modules
            </h2>
            {modules.length > 0 && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {modules.length} {modules.length === 1 ? 'module' : 'modules'}
              </span>
            )}
          </div>

          {modulesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
                  </div>
                  <div className="space-y-2 pl-10">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : modulesError ? (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-8 text-center">
              <p className="text-red-600 dark:text-red-400 text-sm">
                {modulesError}
              </p>
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-50 dark:bg-neutral-750 flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-neutral-400 dark:text-neutral-500" />
              </div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                No modules in this SOP yet.
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Check back later for updates.
              </p>
            </div>
          ) : (
            <div
            onClick={(e) =>{
              const img = e.target.closest("img");
              if (img) {
                setLightboxSrc(img.src);
                setLightboxAlt(img.alt || "");
              }
            }}
            >
              {modules.map((module, idx) => (
                <PublicModuleCard key={module.id} module={module} index={idx} />
              ))}
            </div>
          )}
           <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxSrc(null)} />
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Shared via secure link · Last updated{" "}
            {sop?.updated_at ? formatDate(sop.updated_at) : "recently"}
          </p>
        </div>
      </div>
    </div>
  );
}
