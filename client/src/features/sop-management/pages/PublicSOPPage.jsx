import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getSharedSop, getSharedSopModules } from "@/features/sop-management/services/sopService";
import SOP_CONTENT_STYLES from "@/features/sop-management/utils/sopContentStyles";

function ModuleCard({ module }) {
  const statusColors = {
    Draft: "bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300",
    "In Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="module-card border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-2 bg-white dark:bg-neutral-800">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">
              {module.title}
            </h4>
            {module.status && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${statusColors[module.status] || "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"}`}
              >
                {module.status}
              </span>
            )}
          </div>
          {module.content && module.content.replace(/<[^>]*>/g, "").trim() ? (
            <div
              className={`mt-2 break-words [&_img]:max-w-full [&_img]:h-auto ${SOP_CONTENT_STYLES}`}
              dangerouslySetInnerHTML={{ __html: module.content }}
            />
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No content</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400">
              Sort: {module.sort_order}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicSOPPage() {
  const { token } = useParams();
  const [sop, setSop] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [error, setError] = useState(null);
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
        const message = err?.response?.data?.error?.message || "Failed to load SOP";
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
        const { data: modResponse } = await getSharedSopModules(token, sop?.current_version_id);
        setModules(modResponse?.data || []);
      } catch (err) {
        const message = err?.response?.data?.error?.message || "Failed to load modules";
        setModulesError(message);
      } finally {
        setModulesLoading(false);
      }
    };

    fetchModules();
  }, [token, sop, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Link Not Found
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">{error}</p>
          <a
            href="/sops"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Back to SOP Library
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {sop?.title}
          </h1>
          {sop?.description && (
            <p className="text-neutral-600 dark:text-neutral-400 mt-2">{sop.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {sop?.status && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {sop.status}
              </span>
            )}
            {sop?.code && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                {sop.code}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {modulesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 animate-pulse bg-white dark:bg-neutral-800"
                >
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-1"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : modulesError ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 text-sm">
                {modulesError}
              </p>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400">
                No modules in this SOP yet.
              </p>
            </div>
          ) : (
            <div className="module-list space-y-0">
              {modules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
