import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getEmployeeSop } from "../api/employeeSop.api";
import {
  ArrowLeft,
  FileText,
  Hash,
  Building2,
  Tag,
  User,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { StaggerList, MotionItem } from "@/shared/motion";

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

export default function EmployeeSOPView() {
  const { id } = useParams();
  const [sop, setSop] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getEmployeeSop(id)
      .then((res) => {
        const data = res?.data || res;
        setSop(data);
        setModules(Array.isArray(data.modules) ? data.modules : []);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load SOP");
        setSop(null);
        setModules([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-sm animate-pulse">
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-3/4 mb-4" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-2" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !sop) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Unable to Load SOP
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm leading-relaxed">
            {error || "SOP not found"}
          </p>
          <Link
            to="/my-learning"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to My Learning
          </Link>
        </div>
      </div>
    );
  }

  const statusClass = STATUS_STYLES[sop.status] || STATUS_STYLES.Draft;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link
          to="/my-learning"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to My Learning
        </Link>

        {/* SOP Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden mb-6">
          <div className="px-6 sm:px-8 py-6 sm:py-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {sop.code && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-mono font-medium">
                      <Hash size={12} />
                      {sop.code}
                    </span>
                  )}
                  {sop.status && (
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border border-transparent ${statusClass}`}>
                      {sop.status}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                  {sop.title}
                </h1>
              </div>
            </div>

            {sop.description && (
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
                {sop.description}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sop.department_name && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Building2 size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">Department</p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{sop.department_name}</p>
                  </div>
                </div>
              )}
              {sop.category_name && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Tag size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">Category</p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{sop.category_name}</p>
                  </div>
                </div>
              )}
              {sop.owner_name && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <User size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">Owner</p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{sop.owner_name}</p>
                  </div>
                </div>
              )}
              {sop.created_at && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Calendar size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">Created</p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{formatDate(sop.created_at)}</p>
                  </div>
                </div>
              )}
              {sop.updated_at && (
                <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                  <Clock size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">Updated</p>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{formatDate(sop.updated_at)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-750 px-3 py-2.5">
                <BookOpen size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">Modules</p>
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{modules.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">SOP Modules</h2>
          </div>
          <div className="p-5 sm:p-6">
            {modules.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-neutral-50 dark:bg-neutral-750 flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} className="text-neutral-400 dark:text-neutral-500" />
                </div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No modules yet</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">This SOP has no published modules.</p>
              </div>
            ) : (
              <StaggerList className="space-y-4">
                {modules.map((mod, idx) => (
                  <MotionItem key={mod.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        {idx + 1}
                      </span>
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{mod.title}</h3>
                    </div>
                     {mod.content && (
                        <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed ml-8" dangerouslySetInnerHTML={{ __html: mod.content }} />
                      )}
                  </MotionItem>
                ))}
              </StaggerList>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Employee view &middot; Last updated {sop.updated_at ? formatDate(sop.updated_at) : "recently"}
          </p>
        </div>
      </div>
    </div>
  );
}
