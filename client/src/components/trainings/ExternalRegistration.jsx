import { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle2, Loader, UserPlus, X, ShieldCheck, ArrowLeft, Clock } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getTrainingSlotAvailability, verifyReservist } from '@/services/trainingsService';

const inputCls =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

function SquadronOption({ squad, selected, onSelect }) {
  const disabled = squad.isFull;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(squad)}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
        selected
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600'
          : disabled
            ? 'border-neutral-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
            : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
    >
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {squad.name || `Squadron #${squad.squadron_id}`}
      </span>
      <span className={`text-xs font-semibold ${disabled ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
        {squad.isUnlimited ? 'Open' : disabled ? 'Full' : `${squad.remaining} slot${squad.remaining !== 1 ? 's' : ''} left`}
      </span>
    </button>
  );
}

export default function ExternalRegistration({ training, onRegister, loading = false }) {
  const trainingId = training?.id;

  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(null);

  const [step, setStep] = useState('squadron'); // 'squadron' | 'service_number' | 'confirm'
  const [selectedSquad, setSelectedSquad] = useState(null);

  const [serviceNumber, setServiceNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [reservist, setReservist] = useState(null);

  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!trainingId) return;
    setLoadingAvailability(true);
    getTrainingSlotAvailability(trainingId).then((result) => {
      if (result.success) {
        setAvailability(result.data);
      } else {
        setAvailabilityError(result.message || 'Failed to load slot availability');
      }
      setLoadingAvailability(false);
    });
  }, [trainingId]);

  const squads = availability?.hasSquadronLimits ? (availability.squads || []) : [];
  const isOverridingSquadron = reservist && selectedSquad && Number(reservist.squadron_id) !== Number(selectedSquad.squadron_id);

  const resetVerification = () => {
    setReservist(null);
    setVerifyError(null);
    setServiceNumber('');
  };

  const selectSquadron = (squad) => {
    setSelectedSquad(squad);
    resetVerification();
    setStep('service_number');
  };

  const handleVerify = async () => {
    if (!serviceNumber.trim()) {
      setVerifyError('Enter a service number.');
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    const result = await verifyReservist(trainingId, serviceNumber.trim());
    setVerifying(false);

    if (!result.success) {
      setVerifyError(result.message || 'Incorrect service number.');
      return;
    }
    if (result.data.already_registered) {
      setVerifyError('This service number is already registered for this training.');
      return;
    }

    setReservist(result.data);

    const belongsToSelectedSquadron = Number(result.data.squadron_id) === Number(selectedSquad.squadron_id);
    if (belongsToSelectedSquadron) {
      setStep('confirm');
    } else {
      setShowOverrideDialog(true);
    }
  };

  const proceedToConfirm = () => {
    setShowOverrideDialog(false);
    setStep('confirm');
  };

  const cancelOverride = () => {
    setShowOverrideDialog(false);
    resetVerification();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onRegister({
        service_number: reservist.service_number,
        chosen_squadron_id: selectedSquad.squadron_id,
      });
      setSuccess('Registration submitted successfully!');
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAvailability) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (availabilityError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-800 dark:text-red-200">{availabilityError}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">{success}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          External Training Registration
        </h3>
        {step !== 'squadron' && (
          <button
            type="button"
            onClick={() => {
              if (step === 'confirm') { setStep('service_number'); resetVerification(); }
              else { setStep('squadron'); setSelectedSquad(null); resetVerification(); }
            }}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
      </div>

      {/* Step 1: Squadron selection */}
      {step === 'squadron' && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Select your squadron to check available slots.</p>
          {squads.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">No squadron slots configured for this training.</p>
          ) : (
            squads.map((squad) => (
              <SquadronOption
                key={squad.squadron_id}
                squad={squad}
                selected={selectedSquad?.squadron_id === squad.squadron_id}
                onSelect={selectSquadron}
              />
            ))
          )}
        </div>
      )}

      {/* Step 2: Service number */}
      {step === 'service_number' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Users className="h-3.5 w-3.5" />
            Registering under: {selectedSquad.name || `Squadron #${selectedSquad.squadron_id}`}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Service Number
            </label>
            <input
              type="text"
              value={serviceNumber}
              onChange={(e) => setServiceNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="Enter your service number..."
              className={inputCls}
              disabled={verifying}
            />
          </div>

          {verifyError && (
            <p className="text-xs text-red-600 dark:text-red-400">{verifyError}</p>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {verifying ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && reservist && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {reservist.rank ? `${reservist.rank} ` : ''}{reservist.first_name} {reservist.last_name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{reservist.service_number}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Registering under: <span className="font-medium">{selectedSquad.name}</span>
              {isOverridingSquadron && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">(different from home squadron: {reservist.squadron_name})</span>
              )}
            </p>
          </div>

          {submitError && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200 flex-1">{submitError}</p>
              <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? 'Submitting...' : 'Confirm & Register'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showOverrideDialog}
        title="Register under a different squadron?"
        description={
          reservist
            ? `Service number ${reservist.service_number} belongs to ${reservist.squadron_name || 'a different squadron'}, not ${selectedSquad?.name}. Do you want to register anyway?`
            : ''
        }
        confirmLabel="Register Anyway"
        cancelLabel="Cancel"
        onConfirm={proceedToConfirm}
        onCancel={cancelOverride}
      />
    </div>
  );
}

// ─── Admin registration list (unchanged from the original file) ───────────────
export function RegistrationManager({ registrations = [], onApprove, onReject, loading = false }) {
  const [filter, setFilter] = useState('all');

  const filtered = registrations.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Registrations ({registrations.length})
        </h3>
        <div className="flex gap-1">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((reg) => {
            const data = typeof reg.participant_data === 'string'
              ? (() => { try { return JSON.parse(reg.participant_data); } catch { return {}; } })()
              : reg.participant_data || {};

            return (
              <div
                key={reg.id}
                className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {data.rank ? `${data.rank} ` : ''}{data.first_name} {data.last_name}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-neutral-500">
                      {data.service_number && <span>{data.service_number}</span>}
                      {data.squadron_name && <span>{data.squadron_name}</span>}
                      {data.is_squadron_override && (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          Override
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Registered: {new Date(reg.registered_at).toLocaleString()}
                    </p>
                  </div>
                  {onApprove && onReject && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onApprove(reg.id)}
                        className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        title="Approve"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onReject(reg.id)}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-neutral-500">
          {filter === 'all' ? 'No registrations yet' : `No ${filter} registrations`}
        </div>
      )}
    </div>
  );
}