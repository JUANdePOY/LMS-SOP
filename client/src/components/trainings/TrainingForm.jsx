import { useState, useRef } from 'react';
import { X, Upload, FileText, Image, File, Trash2 } from 'lucide-react';
import { createInternalTraining, createExternalTraining, updateInternalTraining, updateExternalTraining, uploadLetterOrder } from '@/services/trainingsService';
import { useToast } from '@/components/ui/Toast';
import RegistrationBuilder from './RegistrationBuilder';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TRAINING_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};

const INTERNAL_STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'ongoing',   label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EXTERNAL_STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'open',      label: 'Open' },
  { value: 'closed',    label: 'Closed' },
  { value: 'completed', label: 'Completed' },
];

const ACTIVITY_TYPES = [
  { value: 'physical',   label: 'Physical' },
  { value: 'classroom',  label: 'Classroom' },
  { value: 'field',      label: 'Field' },
  { value: 'simulation', label: 'Simulation' },
];

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp',
];
const MAX_FILE_MB = 10;

// ─── Shared input style ────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all';

// ─── Safe string helper — converts null/undefined/number → string ──────────────
const str = (v) => (v == null ? '' : String(v));

// ─── Helper: extract YYYY-MM-DD from a datetime value ─────────────────────────
function toDateString(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return String(value).slice(0, 10);
}

// ─── FormGroup ─────────────────────────────────────────────────────────────────
function FormGroup({ label, required, hint, children, error }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Letter Order Upload ────────────────────────────────────────────────────────
function LetterOrderUpload({ file, onFileChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  const processFile = (f) => {
    setFileError('');
    if (!ACCEPTED_MIME.includes(f.type)) {
      setFileError('Only PDF, Word documents, or images are accepted.');
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File must be under ${MAX_FILE_MB}MB.`);
      return;
    }
    onFileChange(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };

  const getFileIcon = (f) => {
    if (!f) return null;
    if (f.type === 'application/pdf')  return <FileText size={16} className="text-red-500" />;
    if (f.type.startsWith('image/'))   return <Image    size={16} className="text-indigo-500" />;
    return <File size={16} className="text-blue-500" />;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Letter Order
        </label>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          PDF, DOCX, or Image — max {MAX_FILE_MB}MB
        </span>
      </div>

      {file ? (
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center shrink-0">
            {getFileIcon(file)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{file.name}</p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{formatSize(file.size)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              title="Replace file"
            >
              <Upload size={13} />
            </button>
            <button
              type="button"
              onClick={() => { onFileChange(null); setFileError(''); }}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Remove file"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/5 dark:border-indigo-500'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            dragOver ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-neutral-100 dark:bg-neutral-800'
          }`}>
            <Upload size={16} className={dragOver ? 'text-indigo-500' : 'text-neutral-400 dark:text-neutral-500'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {dragOver ? 'Drop to attach' : 'Attach Letter Order'}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Drag & drop or{' '}
              <span className="text-indigo-500 dark:text-indigo-400 font-semibold">browse files</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {['PDF', 'DOCX', 'JPG', 'PNG'].map(ext => (
              <span key={ext} className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 font-mono font-bold">
                {ext}
              </span>
            ))}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
      />
      {fileError && <p className="mt-1 text-xs text-red-500">{fileError}</p>}
    </div>
  );
}

// ─── Internal Training Fields ──────────────────────────────────────────────────
function InternalFields({ form, onChange, onFileChange, errors }) {
  return (
    <div className="space-y-4">
      <FormGroup label="Training Title" required error={errors.title}>
        <input type="text" value={form.title} onChange={e => onChange('title', e.target.value)}
          className={inputCls} placeholder="Enter training title..." />
      </FormGroup>

      <FormGroup label="Description">
        <textarea value={form.description} onChange={e => onChange('description', e.target.value)}
          rows={3} className={`${inputCls} resize-none`}
          placeholder="Training objectives, agenda, or notes..." />
      </FormGroup>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Start Date" required error={errors.startDate}>
          <input type="date" value={form.startDate} onChange={e => onChange('startDate', e.target.value)} className={inputCls} />
        </FormGroup>
        <FormGroup label="End Date">
          <input type="date" value={form.endDate} onChange={e => onChange('endDate', e.target.value)} className={inputCls} />
        </FormGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Activity Type">
          <select value={form.activityType} onChange={e => onChange('activityType', e.target.value)} className={inputCls}>
            <option value="">Select type...</option>
            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Status" required>
          <select value={form.status} onChange={e => onChange('status', e.target.value)} className={inputCls}>
            {INTERNAL_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Location">
          <input type="text" value={form.location} onChange={e => onChange('location', e.target.value)}
            className={inputCls} placeholder="Training venue..." />
        </FormGroup>
        <FormGroup label="Instructor">
          <input type="text" value={form.instructor} onChange={e => onChange('instructor', e.target.value)}
            className={inputCls} placeholder="Instructor name..." />
        </FormGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Max Participants">
          <input type="number" value={form.maxParticipants} onChange={e => onChange('maxParticipants', e.target.value)}
            className={inputCls} placeholder="e.g. 50" min={1} />
        </FormGroup>
        <FormGroup label="Duration (hours)">
          <input type="number" value={form.durationHours} onChange={e => onChange('durationHours', e.target.value)}
            className={inputCls} placeholder="e.g. 8" min={0} step={0.5} />
        </FormGroup>
      </div>

      <div className="flex flex-col gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.isMandatory}
            onChange={(e) => onChange('isMandatory', e.target.checked)}
            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Mandatory for all participants (training record)</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.activityMandatory}
            onChange={(e) => onChange('activityMandatory', e.target.checked)}
            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Primary activity session is mandatory</span>
        </label>
      </div>

      <FormGroup label="Requirements">
        <textarea value={form.requirements} onChange={e => onChange('requirements', e.target.value)}
          rows={2} className={`${inputCls} resize-none`} placeholder="Prerequisites or requirements..." />
      </FormGroup>

      <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
        <LetterOrderUpload
          file={form.letterOrderFile}
          onFileChange={(f) => onFileChange('letterOrderFile', f)}
        />
      </div>
    </div>
  );
}

// ─── External Training Fields ──────────────────────────────────────────────────
function ExternalFields({ form, onChange, errors }) {
  return (
    <div className="space-y-4">
      <FormGroup label="Training Title" required error={errors.title}>
        <input type="text" value={form.title} onChange={e => onChange('title', e.target.value)}
          className={inputCls} placeholder="Enter training title..." />
      </FormGroup>

      <FormGroup label="Description">
        <textarea value={form.description} onChange={e => onChange('description', e.target.value)}
          rows={3} className={`${inputCls} resize-none`}
          placeholder="Training details, objectives, or notes..." />
      </FormGroup>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Start Date" required error={errors.startDate}>
          <input type="date" value={form.startDate} onChange={e => onChange('startDate', e.target.value)} className={inputCls} />
        </FormGroup>
        <FormGroup label="Start Time">
          <input type="time" value={form.startTime} onChange={e => onChange('startTime', e.target.value)} className={inputCls} />
        </FormGroup>
      </div>

      <FormGroup label="Venue">
        <input type="text" value={form.venue} onChange={e => onChange('venue', e.target.value)}
          className={inputCls} placeholder="Training venue or address..." />
      </FormGroup>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Status" required>
          <select value={form.status} onChange={e => onChange('status', e.target.value)} className={inputCls}>
            {EXTERNAL_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Capacity" hint="Optional">
          <input type="number" value={form.capacity} onChange={e => onChange('capacity', e.target.value)}
            className={inputCls} placeholder="Max participants" min={1} />
        </FormGroup>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!form.isMandatory}
          onChange={(e) => onChange('isMandatory', e.target.checked)}
          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>Mandatory for all registrants</span>
      </label>
    </div>
  );
}

// ─── Default States ────────────────────────────────────────────────────────────
const defaultInternal = {
  title: '', description: '', startDate: '', endDate: '',
  activityType: '', status: 'published', location: '',
  instructor: '', maxParticipants: '', durationHours: '',
  requirements: '', letterOrderFile: null,
  isMandatory: false,
  activityMandatory: true,
};
const defaultExternal = {
  title: '', description: '', startDate: '', startTime: '',
  venue: '', status: 'draft', capacity: '',
  isMandatory: false,
};

// ─── Main TrainingForm ─────────────────────────────────────────────────────────
export default function TrainingForm({ training, onClose, onSubmit, initialKind = 'internal' }) {
  const initialType = training
    ? training._source === 'external' || training?.source === 'external' || training?.trainingType === 'external'
      ? TRAINING_TYPES.EXTERNAL
      : TRAINING_TYPES.INTERNAL
    : initialKind === TRAINING_TYPES.EXTERNAL || initialKind === 'external'
      ? TRAINING_TYPES.EXTERNAL
      : TRAINING_TYPES.INTERNAL;

  const trainingType = initialType;
  const [activeTab, setActiveTab]       = useState('details');
  const [submitting, setSubmitting]     = useState(false);
  const [errors, setErrors]             = useState({});
  const [registrationFields, setRegistrationFields] = useState(
    Array.isArray(training?.registration_fields) ? training.registration_fields : []
  );

  // BUG FIX: use str() helper so null values from DB never crash .trim() or
  // controlled-input warnings. ?? '' keeps 0 and false but converts null/undefined.
  const [internalForm, setInternalForm] = useState({
    ...defaultInternal,
    ...(training && initialType === TRAINING_TYPES.INTERNAL ? {
      title:           str(training.title),
      description:     str(training.description),
      // start_datetime is what the backend SELECT returns for internal trainings
      startDate:       toDateString(training.start_datetime || training.start_date),
      endDate:         toDateString(training.end_datetime   || training.end_date),
      // backend aliases activity_type -> type in the SELECT
      activityType:    str(training.type),
      // map legacy 'upcoming' -> 'published' so the select doesn't show blank
      status:          training.status === 'upcoming' ? 'published' : (training.status || 'published'),
      // backend aliases venue -> location in the SELECT
      location:        str(training.location || training.venue),
      instructor:      str(training.instructor),
      // backend stores capacity, not max_participants
      maxParticipants: str(training.capacity ?? training.max_participants ?? ''),
      durationHours:   str(training.duration_hours ?? ''),
      requirements:    str(training.requirements),
      letterOrderFile: null,
      isMandatory:     !!(training.is_mandatory === 1 || training.is_mandatory === true),
      activityMandatory: (() => {
        const a = training.activities?.[0];
        return a ? !!a.is_mandatory : true;
      })(),
    } : {}),
  });

  const [externalForm, setExternalForm] = useState({
    ...defaultExternal,
    ...(training && initialType === TRAINING_TYPES.EXTERNAL ? {
      title:       str(training.title),
      description: str(training.description),
      startDate:   toDateString(training.start_date || training.start_datetime),
      startTime:   str(training.start_time),
      venue:       str(training.venue || training.location),
      status:      training.status || 'draft',
      capacity:    str(training.capacity ?? training.max_participants ?? ''),
      isMandatory: !!(training.is_mandatory === 1 || training.is_mandatory === true),
    } : {}),
  });

  const handleInternalChange = (key, value) => {
    setInternalForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleExternalChange = (key, value) => {
    setExternalForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (trainingType === TRAINING_TYPES.INTERNAL) {
      if (!internalForm.title?.trim()) errs.title     = 'Title is required.';
      if (!internalForm.startDate)     errs.startDate = 'Start date is required.';
    } else {
      if (!externalForm.title?.trim()) errs.title     = 'Title is required.';
      if (!externalForm.startDate)     errs.startDate = 'Start date is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      let payload;

      if (trainingType === TRAINING_TYPES.INTERNAL) {
        payload = {
          title:          internalForm.title.trim(),
          // BUG FIX: use str() so .trim() never crashes on null
          description:    str(internalForm.description).trim() || null,
          start_datetime: internalForm.startDate,
          end_datetime:   internalForm.endDate || internalForm.startDate,
          // BUG FIX: str() guard so null venue doesn't crash .trim()
          venue:          str(internalForm.location).trim() || null,
          status:         internalForm.status,
          capacity:       internalForm.maxParticipants ? Number(internalForm.maxParticipants) : null,
          is_mandatory:   !!internalForm.isMandatory,
          activity_is_mandatory: internalForm.activityMandatory !== false,
          activity_type:  internalForm.activityType || null,
          duration_hours: internalForm.durationHours ? Number(internalForm.durationHours) : null,
          instructor:     str(internalForm.instructor).trim() || null,
          requirements:   str(internalForm.requirements).trim() || null,
        };
      } else {
        payload = {
          title:       externalForm.title.trim(),
          description: str(externalForm.description).trim() || null,
          start_date:  externalForm.startDate,
          start_time:  externalForm.startTime || null,
          // BUG FIX: str() guard so null venue doesn't crash .trim()
          venue:       str(externalForm.venue).trim() || null,
          status:      externalForm.status,
          capacity:    externalForm.capacity ? Number(externalForm.capacity) : null,
          is_mandatory: !!externalForm.isMandatory,
          registration_fields: registrationFields,
        };
      }

      let result;
      if (trainingType === TRAINING_TYPES.INTERNAL) {
        result = training?.id
          ? await updateInternalTraining(training.id, payload)
          : await createInternalTraining(payload);
      } else {
        result = training?.id
          ? await updateExternalTraining(training.id, payload)
          : await createExternalTraining(payload);
      }

      if (!result?.success) {
        setErrors({ submit: result?.message || 'Failed to save training. Please try again.' });
        return;
      }

      if (trainingType === TRAINING_TYPES.INTERNAL && internalForm.letterOrderFile) {
        const trainingId = result.data?.id ?? training?.id;
        if (trainingId) {
          const uploadResult = await uploadLetterOrder(internalForm.letterOrderFile, trainingId);
          if (!uploadResult?.success) {
            setErrors({
              submit:
                uploadResult?.message ||
                'Training was saved, but the letter order upload failed. You can try again from edit.',
            });
            return;
          }
        }
      }

      onSubmit?.();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to save training. Please try again.';
      console.error('Failed to save training:', error);
      setErrors({ submit: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const isExternal = trainingType === TRAINING_TYPES.EXTERNAL;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
              {training ? 'Edit Training' : 'Schedule Training'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              {training ? 'Update the training details below.' : 'Fill in the details to create a new training.'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* ── Tab Bar (External only) ── */}
        {isExternal && (
          <div className="flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800 shrink-0 gap-0.5">
            {[
              { id: 'details',      label: 'Details' },
              { id: 'registration', label: 'Registration Form', count: registrationFields.length },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Scrollable Form Body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isExternal && (
              <InternalFields
                form={internalForm}
                onChange={handleInternalChange}
                onFileChange={handleInternalChange}
                errors={errors}
              />
            )}

            {isExternal && activeTab === 'details' && (
              <ExternalFields form={externalForm} onChange={handleExternalChange} errors={errors} />
            )}

            {isExternal && activeTab === 'registration' && (
              <div className="min-h-[420px] w-full">
                <RegistrationBuilder
                  initialFields={registrationFields}
                  trainingTitle={externalForm.title || 'Training Registration'}
                  onChange={setRegistrationFields}
                />
              </div>
            )}

            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                {errors.submit}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
              {submitting ? 'Saving...' : training ? 'Update Training' : 'Create Training'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}