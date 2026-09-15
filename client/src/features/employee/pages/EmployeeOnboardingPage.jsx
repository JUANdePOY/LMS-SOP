import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { BookOpen, CheckCircle2, ArrowRight, FileText, ChevronLeft, ChevronRight, Clock, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { useEmployeeOnboarding } from "../hooks/useEmployeeOnboarding";
import EDITOR_CONTENT_STYLES from "@/features/sop-management/utils/sopContentStyles";
import ImageLightbox from "@/shared/components/ui/ImageLightbox";
import { StaggerList, MotionItem } from "@/shared/motion";
import { resolveFileUrl } from "@/lib/fileUrl";

function formatSeconds(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function EmployeeOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, error, refetch, acknowledge, fetchSession, heartbeat } = useEmployeeOnboarding();
  const [currentModuleIndex, setCurrentModuleIndex] = useState({});
  const [acknowledgingIds, setAcknowledgingIds] = useState(new Set());
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxAlt, setLightboxAlt] = useState("");
  const [sessions, setSessions] = useState({});
  const [activeAckId, setActiveAckId] = useState(null);
  const [moduleTimers, setModuleTimers] = useState({});
  const heartbeatIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error, toast]);

  const ensureSession = async (ackId) => {
    if (sessions[ackId]) return sessions[ackId];
    try {
      const status = await fetchSession(ackId);
      setSessions(prev => ({ ...prev, [ackId]: status }));
      return status;
    } catch {
      return null;
    }
  };

  const loadSession = async (ackId) => {
    const status = await ensureSession(ackId);
    if (status) {
      setSessions(prev => ({ ...prev, [ackId]: status }));
    }
    return status;
  };

  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const startHeartbeat = (ackId) => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    setActiveAckId(ackId);

    const tick = async () => {
      const status = sessionsRef.current[ackId];
      if (!status || status.completed_at) return;
      try {
        const res = await heartbeat(status.session_id, 1);
        const data = res?.data || res;
        if (data && data.session_id === status.session_id) {
          setSessions(prev => ({ ...prev, [ackId]: { ...status, ...data } }));
        }
      } catch {
        // ignore heartbeat errors
      }
    };

    tick();
    heartbeatIntervalRef.current = setInterval(tick, 1000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    setActiveAckId(null);
  };

  const stopModuleTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!data?.items?.length) return;

    const firstSopId = data.items[0].acknowledgement_id;
    setActiveAckId(firstSopId);
    loadSession(firstSopId);
    startHeartbeat(firstSopId);
  }, [data?.items]);

  useEffect(() => {
    if (!activeAckId || !data?.items?.length) {
      stopModuleTimer();
      return;
    }

    const sop = data.items.find(item => item.acknowledgement_id === activeAckId);
    if (!sop) {
      stopModuleTimer();
      return;
    }

    const currentIdx = currentModuleIndex[activeAckId] || 0;
    const currentModule = sop.modules[currentIdx];
    const timeLimit = currentModule?.time_limit || null;

    if (!timeLimit) {
      stopModuleTimer();
      return;
    }

    const key = `${activeAckId}-${currentIdx}`;
    setModuleTimers(prev => {
      if (prev[key] === undefined) {
        return { ...prev, [key]: timeLimit };
      }
      return prev;
    });

    stopModuleTimer();
    timerIntervalRef.current = setInterval(() => {
      setModuleTimers(prev => {
        const current = prev[key];
        if (current === undefined || current <= 0) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          return { ...prev, [key]: Math.max(0, current || 0) };
        }
        return { ...prev, [key]: current - 1 };
      });
    }, 1000);

    return stopModuleTimer;
  }, [activeAckId, currentModuleIndex, data?.items]);

  const goToModule = (ackId, direction) => {
    setCurrentModuleIndex(prev => {
      const current = prev[ackId] || 0;
      const modules = data?.items?.find(s => s.acknowledgement_id === ackId)?.modules || [];
      const next = Math.max(0, Math.min(modules.length - 1, current + direction));
      return { ...prev, [ackId]: next };
    });
  };

  const handleModuleChange = (ackId) => {
    setActiveAckId(ackId);
  };

  const handleAcknowledge = async (ackId) => {
    if (acknowledgingIds.has(ackId)) return;
    const session = sessions[ackId];
    if (session?.min_time_limit && !session?.min_time_met && !session?.can_acknowledge) {
      toast.error(`Please spend at least ${formatSeconds(session.min_time_limit)} on this SOP before proceeding`);
      return;
    }

    setAcknowledgingIds(prev => new Set(prev).add(ackId));
    try {
      await acknowledge(ackId);
      toast.success("SOP completed");
      stopHeartbeat();
      stopModuleTimer();
      refetch();
    } catch (err) {
      toast.error(err?.message || "Failed to complete SOP");
    } finally {
      setAcknowledgingIds(prev => {
        const next = new Set(prev);
        next.delete(ackId);
        return next;
      });
    }
  };

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

      <StaggerList className="space-y-4">
        {data?.items?.map((sop) => {
          const currentIdx = currentModuleIndex[sop.acknowledgement_id] || 0;
          const hasModules = Array.isArray(sop.modules) && sop.modules.length > 0;
          const currentModule = hasModules ? sop.modules[currentIdx] : null;
          const isFirstModule = currentIdx === 0;
          const isLastModule = currentIdx === (sop.modules?.length || 0) - 1;
          const session = sessions[sop.acknowledgement_id];
          const minTime = sop.min_time_limit || null;
          const remaining = minTime ? Math.max(0, minTime - (session?.total_seconds || 0)) : 0;
          const canAcknowledge = !minTime || session?.can_acknowledge || session?.min_time_met;
          const moduleTimeLimit = currentModule?.time_limit || null;
          const key = `${sop.acknowledgement_id}-${currentIdx}`;
          const modRemaining = moduleTimeLimit ? (moduleTimers[key] ?? moduleTimeLimit) : null;
          const isModuleTimeExpired = modRemaining !== null && modRemaining <= 0;
          const moduleTimeComplete = moduleTimeLimit === null || modRemaining <= 0;

          return (
            <MotionItem
              key={sop.acknowledgement_id}
              className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 overflow-hidden"
            >
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
                      {minTime ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          <Clock size={12} />
                          {formatSeconds(minTime)}
                        </span>
                      ) : null}
                    </div>
                    {sop.sop_code && <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{sop.sop_code}</p>}
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {sop.description || "No description available."}
                    </p>
                    {minTime && session ? (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Time spent: {formatSeconds(session.total_seconds || 0)}
                        {!canAcknowledge ? ` • ${formatSeconds(remaining)} remaining` : ' • requirement met'}
                      </p>
                    ) : null}
                  </div>
                </div>

                {hasModules && (
                  <div className="mt-4">
                    <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Module {currentIdx + 1} of {sop.modules.length}
                        </span>
                        <div className="flex items-center gap-3">
                          {moduleTimeLimit ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              isModuleTimeExpired
                                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                            }`}>
                              {isModuleTimeExpired ? <AlertTriangle size={12} /> : <Clock size={12} />}
                               {isModuleTimeExpired ? 'Time finished' : `${formatSeconds(modRemaining)} left`}
                            </span>
                          ) : null}
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                            {Math.round(((currentIdx + 1) / sop.modules.length) * 100)}%
                          </span>
                        </div>
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
                        {currentModule?.attachments?.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Attachments</p>
                            <div className="space-y-2">
                              {currentModule.attachments.map((att) => {
                                const isLink = !!att.link_url;
                                const fileUrl = isLink ? att.link_url : resolveFileUrl(att.file_name, { download: true });
                                const label = att.original_name || att.file_name || (isLink ? 'Link' : 'File');
                                return (
                                  <a
                                    key={att.id}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={!isLink ? true : undefined}
                                    className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    {isLink ? <ExternalLink size={14} className="text-blue-600 dark:text-blue-400" /> : <Download size={14} className="text-amber-600 dark:text-amber-400" />}
                                    <span className="flex-1 truncate">{label}</span>
                                    {!isLink && att.file_extension && (
                                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase">{att.file_extension}</span>
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
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
                              }}
                              disabled={acknowledgingIds.has(sop.acknowledgement_id) || !moduleTimeComplete}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {acknowledgingIds.has(sop.acknowledgement_id) ? 'Saving...' : 'Proceed to Dashboard'}
                              <ArrowRight size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                handleModuleChange(sop.acknowledgement_id);
                                goToModule(sop.acknowledgement_id, 1);
                              }}
                              disabled={moduleTimeLimit !== null && modRemaining > 0}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {moduleTimeLimit !== null && modRemaining > 0 ? `${formatSeconds(modRemaining)} left` : 'Next'}
                              {moduleTimeLimit === null || modRemaining <= 0 ? <ChevronRight size={14} /> : null}
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
            </MotionItem>
          );
        })}
      </StaggerList>

      {data?.items?.length === 0 && !isComplete && (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No pending SOPs. Redirecting...</p>
        </div>
      )}
      <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
