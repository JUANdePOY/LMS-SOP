import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSharedSop,
  getSharedSopModules,
} from "@/features/sop-management/services/sopService";
import PublicModuleCard from "@/features/sop-management/components/SOPEditor/PublicModuleCard";
import ImageLightbox from "@/shared/components/ui/ImageLightbox";
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
  Lock,
  PlayCircle,
  CheckCircle2,
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

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
}

function getCompletedFromStorage(token) {
  try {
    const raw = sessionStorage.getItem(`sop:module-order:${token}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCompleted(token, order) {
  try {
    sessionStorage.setItem(`sop:module-order:${token}`, JSON.stringify(order));
  } catch {
    // ignore
  }
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
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState(() => getCompletedFromStorage(token));
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerEnd, setTimerEnd] = useState(null);
  const timerRef = useRef(null);

  const isOnboarding = !!sop?.is_default_onboarding;

  const completedRef = useRef(completedModules);
  useEffect(() => {
    completedRef.current = completedModules;
  }, [completedModules]);

  const markModuleComplete = (index) => {
    const next = Array.from(new Set([...completedRef.current, index]));
    completedRef.current = next;
    setCompletedModules(next);
    persistCompleted(token, next);
  };

  const isModuleCompleted = (index) => completedRef.current.includes(index);
  const isModuleUnlocked = (index) => {
    if (index === 0) return true;
    return completedRef.current.includes(index - 1);
  };

  useEffect(() => {
    setCompletedModules(getCompletedFromStorage(token));
    setActiveModuleIndex(0);
    setTimeRemaining(null);
    setTimerEnd(null);
  }, [token]);

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
        setActiveModuleIndex(0);
        setTimeRemaining(null);
        setTimerEnd(null);
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

  const currentModule = modules[activeModuleIndex];
  const currentTimeLimit = currentModule?.time_limit ? Number(currentModule.time_limit) : null;

  const startTimer = (seconds) => {
    const end = Date.now() + seconds * 1000;
    setTimerEnd(end);
    setTimeRemaining(seconds);
  };

  const completeTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeRemaining(0);
    setTimerEnd(null);
  };

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isOnboarding) {
      setTimeRemaining(null);
      setTimerEnd(null);
      return;
    }

    if (activeModuleIndex === null || activeModuleIndex === undefined) {
      setTimeRemaining(null);
      setTimerEnd(null);
      return;
    }

    const module = modules[activeModuleIndex];
    if (!module || !module.time_limit) {
      setTimeRemaining(null);
      setTimerEnd(null);
      return;
    }

    const limitSeconds = Number(module.time_limit);
    if (isModuleCompleted(activeModuleIndex)) {
      setTimeRemaining(0);
      setTimerEnd(null);
      return;
    }

    startTimer(limitSeconds);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimerEnd(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeModuleIndex, modules, isOnboarding]);

  const handleModuleActivate = (index) => {
    if (index === activeModuleIndex) return;
    if (isOnboarding && index > activeModuleIndex) {
      if (timeRemaining > 0) return;
    }
    setActiveModuleIndex(index);
  };

  const handleModuleComplete = () => {
    if (activeModuleIndex === null || activeModuleIndex === undefined) return;
    if (isOnboarding && timeRemaining > 0) return;
    markModuleComplete(activeModuleIndex);
    const nextIndex = activeModuleIndex + 1;
    if (nextIndex < modules.length) {
      setActiveModuleIndex(nextIndex);
    }
  };

  const handleNext = () => {
    if (isOnboarding && timeRemaining > 0) return;
    const nextIndex = activeModuleIndex + 1;
    if (nextIndex < modules.length) {
      markModuleComplete(activeModuleIndex);
      setActiveModuleIndex(nextIndex);
    } else if (nextIndex === modules.length) {
      markModuleComplete(activeModuleIndex);
    }
  };

  const handlePrevious = () => {
    const prevIndex = activeModuleIndex - 1;
    if (prevIndex >= 0) {
      setActiveModuleIndex(prevIndex);
    }
  };

  const activeModuleCompleted = useMemo(() => isModuleCompleted(activeModuleIndex), [activeModuleIndex, completedModules]);
  const canProceed = useMemo(() => {
    if (activeModuleIndex === null || activeModuleIndex === undefined) return false;
    if (!isOnboarding) return true;
    if (timeRemaining === null) return true;
    return timeRemaining <= 0;
  }, [timeRemaining, activeModuleIndex, isOnboarding]);

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

        {/* Timer Banner */}
        {isOnboarding && currentModule && currentTimeLimit > 0 && (
          <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Module {activeModuleIndex + 1} Timer
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {timeRemaining > 0
                      ? `Please spend at least ${Math.ceil(currentTimeLimit / 60)} minute(s) on this module.`
                      : "You may proceed to the next module."}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${timeRemaining > 0 ? 'text-blue-900 dark:text-blue-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          </div>
        )}

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
              onClick={(e) => {
                const img = e.target.closest("img");
                if (img) {
                  setLightboxSrc(img.src);
                  setLightboxAlt(img.alt || "");
                }
              }}
            >
              <StaggerList>
                {modules.map((module, idx) => {
                  const isActive = idx === activeModuleIndex;
                  const isLocked = isOnboarding && idx > activeModuleIndex && !isModuleUnlocked(idx);
                  const isCompletedModule = isModuleCompleted(idx);

                  return (
                    <MotionItem key={module.id}>
                      <div className="relative">
                        {isOnboarding && isActive && currentTimeLimit > 0 && (
                          <div className="absolute -top-3 left-4 z-10">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 text-white text-[11px] font-medium">
                              <Clock size={12} />
                              {timeRemaining > 0 ? `Timer: ${formatTime(timeRemaining)}` : 'Ready to proceed'}
                            </span>
                          </div>
                        )}
                        <PublicModuleCard
                          module={module}
                          index={idx}
                          isActive={isActive}
                          isLocked={isLocked}
                          isCompleted={isOnboarding ? isCompletedModule : false}
                          onActivate={() => handleModuleActivate(idx)}
                        />
                      </div>
                    </MotionItem>
                  );
                })}
              </StaggerList>
            </div>
          )}
          <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxSrc(null)} />
        </div>

        {/* Navigation */}
        {modules.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={activeModuleIndex <= 0}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {modules.map((module, idx) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => handleModuleActivate(idx)}
                  disabled={isOnboarding && idx > activeModuleIndex && !isModuleUnlocked(idx)}
                  className={`h-2.5 rounded-full transition-colors ${
                    idx === activeModuleIndex
                      ? 'w-6 bg-blue-600'
                      : isModuleCompleted(idx)
                        ? 'w-2.5 bg-emerald-500'
                        : 'w-2.5 bg-neutral-300 dark:bg-neutral-700'
                  } ${isOnboarding && idx > activeModuleIndex && !isModuleUnlocked(idx) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  aria-label={`Go to module ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={(!canProceed && isOnboarding) || (activeModuleIndex >= modules.length - 1 && activeModuleCompleted)}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {activeModuleCompleted ? 'Completed' : 'Next'}
            </button>
          </div>
        )}

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
