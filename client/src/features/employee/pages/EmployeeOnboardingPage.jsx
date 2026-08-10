import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { BookOpen, CheckCircle2, ArrowRight, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useEmployeeOnboarding } from "../hooks/useEmployeeOnboarding";
import EDITOR_CONTENT_STYLES from "@/features/sop-management/utils/sopContentStyles";
import ImageLightbox from "@/shared/components/ui/ImageLightbox";

export default function EmployeeOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, error, refetch, acknowledge } = useEmployeeOnboarding();
  const [currentModuleIndex, setCurrentModuleIndex] = useState({});
  const [acknowledgingIds, setAcknowledgingIds] = useState(new Set());
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  useEffect(() => {
    if (error) toast.error(error);
  }, [error, toast]);

  const goToModule = (ackId, direction) => {
    setCurrentModuleIndex(prev => {
      const current = prev[ackId] || 0;
      const modules = data?.items?.find(s => s.acknowledgement_id === ackId)?.modules || [];
      const next = Math.max(0, Math.min(modules.length - 1, current + direction));
      return { ...prev, [ackId]: next };
    });
  };

  const handleAcknowledge = async (ackId) => {
    if (acknowledgingIds.has(ackId)) return;
    setAcknowledgingIds(prev => new Set(prev).add(ackId));
    try {
      await acknowledge(ackId);
      toast.success("SOP completed");
      refetch();
    } catch {
      toast.error("Failed to complete SOP");
    } finally {
      setAcknowledgingIds(prev => {
        const next = new Set(prev);
        next.delete(ackId);
        return next;
      });
    }
  };

  // Auto-complete a SOP when the user reaches the last module

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const isComplete = data?.is_complete;

  if (isComplete) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          <h2 className="mt-4 text-xl font-bold text-emerald-900 dark:text-emerald-100">Onboarding Complete</h2>
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            You have acknowledged all required SOPs. You can now access all employee features.
          </p>
          <button
            onClick={() => navigate("/my-learning")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-10 sm:pt-14">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Required Reading</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Please read and acknowledge the following SOPs before accessing employee features.
        </p>
      </div>

      <div className="space-y-4">
        {data?.items?.map((sop) => {
          const currentIdx = currentModuleIndex[sop.acknowledgement_id] || 0;
          const hasModules = Array.isArray(sop.modules) && sop.modules.length > 0;
          const currentModule = hasModules ? sop.modules[currentIdx] : null;
          const isFirstModule = currentIdx === 0;
          const isLastModule = currentIdx === (sop.modules?.length || 0) - 1;

          return (
            <div key={sop.acknowledgement_id} className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 rounded-lg bg-blue-50 p-2 dark:bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{sop.title}</h3>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        v{sop.version}
                      </span>
                    </div>
                    {sop.sop_code && <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{sop.sop_code}</p>}
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {sop.description || "No description available."}
                    </p>
                  </div>
                </div>

                {hasModules && (
                  <div className="mt-4">
                    <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Module {currentIdx + 1} of {sop.modules.length}
                        </span>
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          {Math.round(((currentIdx + 1) / sop.modules.length) * 100)}%
                        </span>
                      </div>

                      <div className="p-4">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                          {currentModule?.title}
                        </h4>
                        {currentModule?.content && (
                          <div
                            className={EDITOR_CONTENT_STYLES}
                            onClick={(e) => {
                              const img = e.target.closest("img");
                              if (img) {
                                setLightboxSrc(img.src);
                                setLightboxAlt(img.alt || "");
                              }
                            }}
                            dangerouslySetInnerHTML={{ __html: currentModule.content }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                        <button
                          onClick={() => goToModule(sop.acknowledgement_id, -1)}
                          disabled={isFirstModule}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={14} />
                          Previous
                        </button>

                        <div className="flex items-center gap-1">
                          {sop.modules.map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 rounded-full transition-colors ${
                                idx <= currentIdx
                                  ? 'bg-blue-600 dark:bg-blue-400'
                                  : 'bg-neutral-200 dark:bg-neutral-700'
                              }`}
                              style={{ width: '16px' }}
                            />
                          ))}
                        </div>

                        {isLastModule ? (
                          <button
                            onClick={async () => {
                              await handleAcknowledge(sop.acknowledgement_id);
                              navigate('/my-learning');
                            }}
                            disabled={acknowledgingIds.has(sop.acknowledgement_id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Proceed to Dashboard
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => goToModule(sop.acknowledgement_id, 1)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                          >
                            Next
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!hasModules && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                    <FileText size={14} />
                    No content modules available for this SOP
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data?.items?.length === 0 && !isComplete && (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No pending SOPs. Redirecting...</p>
        </div>
      )}
      <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}