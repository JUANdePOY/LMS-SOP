import { useState, useEffect } from "react";
import { Calendar, MapPin, X, ChevronDown, Paperclip, Users, ClipboardList } from "lucide-react";
import { shortDate, formatFileSize, formatDateShort, formatTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import {
  getTrainingSlotAvailability,
  createRegistration,
  getExternalTrainingAttachments,
  downloadExternalAttachment,
} from "@/services/trainingsService";
import AttachmentIcon from "@/components/ui/AttachmentIcon";
import ViewAttachmentModal from "@/components/ui/ViewAttachmentModal";
import { searchSquadrons } from "@/services/organizationService";

// ─── SquadronSelect ──────────────────────────────────────────────────────────

function SquadronSelect({ squadrons, selectedId, onChange, disabled, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = squadrons.find((s) => String(s.id) === String(selectedId));

  return (
    <div className="relative">
      <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
        Select Your Squadron
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-left text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
      >
        <span className={selected ? "" : "text-neutral-400"}>
          {selected
            ? `${selected.name}${selected.code ? ` (${selected.code})` : ""}`
            : "Choose a squadron..."}
        </span>
        <ChevronDown
          size={16}
          className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50">
          {squadrons.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-400">
              No squadrons available for this event
            </div>
          ) : (
            squadrons.map((squadron) => (
              <button
                key={squadron.id}
                type="button"
                onClick={() => {
                  onChange(squadron.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-indigo-50 dark:hover:bg-neutral-800 first:rounded-t-lg last:rounded-b-lg"
              >
                {squadron.name}
                {squadron.code ? ` (${squadron.code})` : ""}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── SlotDisplay ─────────────────────────────────────────────────────────────

function SlotDisplay({ squadron, registration, isSelected, mode }) {
  const remaining = registration.remaining;
  const registered = registration.registered;
  const limit = registration.slot_limit;
  const isUnlimited = limit === null || limit === 0;
  const isUnknown = registered === null;

  const isFull = mode === "full";
  const isClosed = mode === "closed";

  const bgClass = isSelected
    ? isFull
      ? "border-red-300 bg-red-100/50 dark:border-red-700/50 dark:bg-red-950/50"
      : isClosed
        ? "border-neutral-300 bg-neutral-100/50 dark:border-neutral-700/50 dark:bg-neutral-950/30"
        : "border-indigo-300 bg-indigo-50/50 dark:border-indigo-600/50 dark:bg-indigo-950/30"
    : isFull
      ? "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
      : isClosed
        ? "border-neutral-300 bg-neutral-100/50 dark:border-neutral-700/50 dark:bg-neutral-950/30"
        : "border-neutral-200 dark:border-neutral-700";

  const pillClass = isUnlimited
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
    : isFull
      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
      : isClosed
        ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300"
        : isUnknown
          ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          : typeof remaining === "number" && remaining > 5
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";

  const remainingNum = typeof remaining === "number" ? remaining : 0;
  const registeredDisplay = isUnknown ? "—" : registered;
  const limitDisplay = isUnlimited ? "∞" : (limit ?? "—");

  return (
    <div className={`p-3 rounded-lg border ${bgClass} transition-all`}>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Squadron: {squadron.name}
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pillClass}`}>
          {isUnlimited
            ? "Unlimited slots"
            : isClosed
              ? "Registration closed"
              : isFull
                ? "Full"
                : isUnknown
                  ? "Loading…"
                  : `${remainingNum} slot${remainingNum !== 1 ? "s" : ""} left`}
        </span>
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {registeredDisplay} / {limitDisplay} registered
      </span>
    </div>
  );
}

// ─── RegistrationForm ─────────────────────────────────────────────────────────

function RegistrationForm({ fields, submitting }) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {field.label || "Field"}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              name={field.id}
              placeholder={field.placeholder}
              rows={3}
              disabled={submitting}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          ) : field.type === "select" ? (
            <select
              name={field.id}
              disabled={submitting}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">Choose an option...</option>
              {(field.options || []).map((opt, idx) => {
                const isObj = opt !== null && typeof opt === "object";
                const optionKey = isObj ? (opt.id ?? opt.value ?? opt.label ?? idx) : (opt ?? idx);
                const optionValue = isObj ? (opt.value ?? opt.label ?? "") : (opt ?? "");
                const optionLabel = isObj ? (opt.label ?? opt.value ?? "") : (opt ?? "");
                return <option key={optionKey} value={optionValue}>{optionLabel}</option>;
              })}
            </select>
          ) : field.type === "radio" ? (
            <div className="space-y-2 pt-0.5">
              {(field.options || []).map((opt) => {
                const isObj = opt !== null && typeof opt === "object";
                const optionValue = isObj ? (opt.value ?? opt.label ?? "") : (opt ?? "");
                const optionLabel = isObj ? (opt.label ?? opt.value ?? "") : (opt ?? "");
                return (
                  <label key={opt.id ?? optionLabel} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="radio" name={field.id} value={optionValue} disabled={submitting} className="w-4 h-4 text-indigo-600 border-neutral-300 dark:border-neutral-600 focus:ring-indigo-500/30" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">{optionLabel}</span>
                  </label>
                );
              })}
            </div>
          ) : field.type === "checkbox" ? (
            <div className="space-y-2 pt-0.5">
              {(field.options || []).map((opt) => {
                const isObj = opt !== null && typeof opt === "object";
                const optionValue = isObj ? (opt.value ?? opt.label ?? "") : (opt ?? "");
                const optionLabel = isObj ? (opt.label ?? opt.value ?? "") : (opt ?? "");
                return (
                  <label key={opt.id ?? optionLabel} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" name={`${field.id}_${opt.id ?? optionValue}`} value={optionValue} disabled={submitting} className="w-4 h-4 text-indigo-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-indigo-500/30" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">{optionLabel}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type}
              name={field.id}
              placeholder={field.placeholder}
              disabled={submitting}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10">
        <Icon size={13} className="text-indigo-500 dark:text-indigo-400" />
      </div>
      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function RegistrationModal({ training, isOpen, onClose, currentUser }) {
  const [selectedSquadronId, setSelectedSquadronId] = useState(null);
  const [squadrons, setSquadrons] = useState([]);
  const [squadronError, setSquadronError] = useState("");
  const [squadronLoading, setSquadronLoading] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotInfoError, setSlotInfoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [viewModal, setViewModal] = useState({ isOpen: false, file: null, fileName: '', fileType: '' });

  useEffect(() => {
    if (isOpen) {
      loadSquadrons();
      loadSlotAvailability();
      loadAttachments();
    }
  }, [isOpen, training?.id]);

  const loadSquadrons = async () => {
    if (!training?.id) { setSquadrons([]); return; }
    setSquadronLoading(true);
    setSquadronError("");
    try {
      const result = await searchSquadrons("", 100);
      if (result.success) {
        setSquadrons(result.squadrons ?? []);
      } else {
        setSquadronError(result.message || "Failed to load squadrons");
        setSquadrons([]);
      }
    } catch (err) {
      setSquadronError(err.message || "Failed to load squadrons");
      setSquadrons([]);
    } finally {
      setSquadronLoading(false);
    }
  };

  const loadSlotAvailability = async () => {
    if (!training?.id) return;
    setLoadingSlots(true);
    setSlotInfoError("");
    try {
      const result = await getTrainingSlotAvailability(training.id);
      if (result.success) {
        setSlotAvailability(result.data);
      } else {
        setSlotInfoError(result.message || "Failed to load slot availability");
      }
    } catch (err) {
      setSlotInfoError(err.message || "Failed to load slot availability");
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadAttachments = async () => {
    if (!training?.id) return;
    setLoadingAttachments(true);
    setAttachmentError("");
    try {
      const result = await getExternalTrainingAttachments(training.id);
      if (result.success) {
        setAttachments(result.data || []);
      } else {
        setAttachmentError(result.message);
      }
    } catch (err) {
      setAttachmentError(err.message || "Failed to load attachments");
    } finally {
      setLoadingAttachments(false);
    }
  };

  if (!isOpen) return null;

  const squadronLimits = training.squadron_limits || [];
  const registrationFields = training.registration_fields || [];

  const allowedSquadronIds = squadronLimits.reduce((set, s) => {
    set.add(Number(s.squadron_id || s.id));
    return set;
  }, new Set());

  const availableSquadrons = (squadrons ?? []).filter((sq) => {
    const sqId = sq.id ?? sq.squadron_id;
    return allowedSquadronIds.size === 0 ? true : allowedSquadronIds.has(Number(sqId));
  });

  const selectedSlotData =
    slotAvailability?.hasSquadronLimits && slotAvailability.squads
      ? slotAvailability.squads.find((s) => Number(s.squadron_id) === Number(selectedSquadronId))
      : null;

  const interpretSlotState = (slotData) => {
    if (!slotData) return { registered: null, slotLimit: null, remaining: null, isUnlimited: false, isFull: false };
    const registered = Number(slotData.registered ?? 0);
    const slotLimitRaw = slotData.slot_limit ?? slotData.slotLimit ?? null;
    const slotLimit = slotLimitRaw === null ? null : Number(slotLimitRaw);
    const isUnlimited = typeof slotData.isUnlimited === "boolean" ? slotData.isUnlimited : slotLimit === null || slotLimit === 0;
    const remainingRaw = slotData.remaining;
    const remaining = remainingRaw == null ? null : Number(remainingRaw);
    const isFull = typeof slotData.isFull === "boolean" ? slotData.isFull : !isUnlimited && typeof remaining === "number" && remaining <= 0;
    return { registered, slotLimit, remaining, isUnlimited, isFull };
  };

  const isRegistrationClosed = training?.status != null ? String(training.status).toLowerCase() !== "open" : false;

  const getSquadronMode = (slotData) => {
    if (isRegistrationClosed) return "closed";
    const state = interpretSlotState(slotData);
    if (state.isUnlimited) return "open";
    if (state.isFull) return "full";
    return "open";
  };

  const selectedSquadronMode = getSquadronMode(selectedSlotData);
  const isSelectedSquadronFull = selectedSquadronMode === "full";
  const isSubmitBlocked = isRegistrationClosed || isSelectedSquadronFull;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!selectedSquadronId) { setSubmitError("Please select your squadron"); return; }
    if (isRegistrationClosed) { setSubmitError("Registration is closed for this event"); return; }
    if (squadronLimits && squadronLimits.length > 0) {
      const mode = getSquadronMode(selectedSlotData);
      if (mode === "full") { setSubmitError("Selected squadron is full"); return; }
    }

    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const participantData = { squadron_id: Number(selectedSquadronId) };
      if (currentUser?.reservist_id) {
        participantData.reservist_id = currentUser.reservist_id;
      }
      registrationFields.forEach((field) => {
        const value = formData.get(field.id);
        if (value != null && value !== '') participantData[field.id] = value;
      });

      const result = await createRegistration(training.id, participantData);
      if (result.success) {
        setSubmitSuccess(true);
        await loadSlotAvailability();
        setTimeout(() => { onClose(); setSubmitSuccess(false); }, 2000);
      } else {
        throw new Error(result.message || "Registration failed");
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasAttachments = attachments.length > 0 || loadingAttachments || attachmentError;
  const hasSlots = squadronLimits && squadronLimits.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal shell — flex column so footer stays anchored */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 leading-snug">
              {training.title || "Untitled Event"}
            </h2>
            {/* Meta row directly under title */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
<Calendar size={12} className="text-indigo-400" />
                 {shortDate(training.start_datetime || training.start_date)}{formatTime(training.start_time || training.start_datetime) && ` · ${formatTime(training.start_time || training.start_datetime)}`}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <MapPin size={12} className="text-indigo-400" />
                {training.location || training.venue || "Location not set"}
              </span>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex items-center gap-2">
            {/* Status badge */}
            <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide whitespace-nowrap">
              External Event
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* ── Description ── */}
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {training.description || "No description available."}
              </p>
            </div>

            {/* ── Slot Availability ── */}
            {(hasSlots || loadingSlots || slotInfoError) && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/30 p-4">
                <SectionHeader icon={Users} label="Squadron Slot Availability" />
                {loadingSlots ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading slot availability…</p>
                ) : slotInfoError ? (
                  <p className="text-xs text-red-500">{slotInfoError}</p>
                ) : hasSlots ? (
                  <div className="space-y-2">
                    {squadronLimits.map((squadron) => {
                      const squadId = squadron.squadron_id || squadron.id;
                      const slotData =
                        slotAvailability?.hasSquadronLimits && slotAvailability.squads
                          ? slotAvailability.squads.find((s) => Number(s.squadron_id) === Number(squadId))
                          : null;
                      const serverState = interpretSlotState(slotData);
                      const isSelected = Number(selectedSquadronId) === Number(squadId);
                      const mode = getSquadronMode(slotData);
                      return (
                        <SlotDisplay
                          key={squadId}
                          squadron={{ id: squadId, name: squadron.name }}
                          registration={{ registered: serverState.registered, slot_limit: serverState.slotLimit, remaining: serverState.remaining }}
                          isSelected={isSelected}
                          mode={mode}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No squadron slot limits configured.</p>
                )}
              </div>
            )}

            {/* ── Attachments ── */}
            {hasAttachments && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/30 p-4">
                <SectionHeader icon={Paperclip} label="Event Attachments" />
                {loadingAttachments ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading attachments…</p>
                ) : attachmentError ? (
                  <p className="text-xs text-red-500">{attachmentError}</p>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No attachments available.</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => {
                      const fileExt = (attachment.original_filename || attachment.name || '').split('.').pop() || '';
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                        >
                          <div className="flex-shrink-0">
                            <AttachmentIcon fileType={fileExt} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={attachment.original_filename || attachment.name}>
                              {attachment.original_filename || attachment.name}
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                              {formatFileSize(attachment.size_bytes)}
                              {attachment.created_at && ` · ${formatDateShort(attachment.created_at)}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const blob = await downloadExternalAttachment(training.id, attachment.id);
                              setViewModal({ isOpen: true, file: blob, fileName: attachment.original_filename || attachment.name, fileType: fileExt });
                            }}
                            className="flex-shrink-0 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Registration Form ── */}
            {!submitSuccess && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/30 p-4">
                <SectionHeader icon={ClipboardList} label="Complete Your Registration" />
                <form id="registration-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Squadron picker */}
                  <SquadronSelect
                    squadrons={availableSquadrons}
                    selectedId={selectedSquadronId}
                    onChange={setSelectedSquadronId}
                    disabled={submitting || squadronLoading}
                    error={undefined}
                  />

                  {/* Squadron loader / error states */}
                  {squadronLoading && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Loading squadrons…</p>
                  )}
                  {squadronError && (
                    <p className="text-xs text-red-500">{squadronError}</p>
                  )}
                  {!squadronLoading && !squadronError && availableSquadrons.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No squadrons are configured for this event. Please contact the event administrator.
                    </p>
                  )}

                  {/* Additional fields */}
                  {registrationFields.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
                        Additional Information
                      </p>
                      <RegistrationForm fields={registrationFields} submitting={submitting} />
                    </div>
                  )}

                  {/* Inline status messages */}
                  {submitError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-3 py-2.5">
                      <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                    </div>
                  )}
                  {!submitError && selectedSquadronId && isRegistrationClosed && (
                    <div className="flex items-start gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Registration is currently closed for this event.</p>
                    </div>
                  )}
                  {!submitError && selectedSquadronId && !isRegistrationClosed && isSelectedSquadronFull && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-3 py-2.5">
                      <p className="text-sm text-red-600 dark:text-red-400">This squadron has reached its slot limit. No more registrations can be accepted.</p>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ── Success state ── */}
            {submitSuccess && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Registration Successful!
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  You have been registered for this event. This window will close shortly.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky Footer ── */}
        {!submitSuccess && (
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-2xl">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="registration-form"
              disabled={submitting || !selectedSquadronId || isSubmitBlocked}
            >
              {submitting ? "Registering…" : "Complete Registration"}
            </Button>
          </div>
        )}
      </div>

      <ViewAttachmentModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, file: null, fileName: '', fileType: '' })}
        file={viewModal.file}
        fileName={viewModal.fileName}
        fileType={viewModal.fileType}
      />
    </div>
  );
}