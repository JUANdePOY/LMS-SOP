import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FileText, Layout, ListOrdered, Users, ClipboardList, X, AlertTriangle } from 'lucide-react';
import { useCreateSOP } from '../../hooks/useCreateSOP';
import SOPBasicInfoForm from '../forms/SOPBasicInfoForm';
import SOPSectionForm from '../forms/SOPSectionForm';
import SOPStepForm from '../forms/SOPStepForm';
import SOPAssignmentForm from '../forms/SOPAssignmentForm';
import { createSection } from '../../api/section.api';
import { createStep } from '../../api/step.api';
import { createAssignment } from '../../api/assignment.api';

const STEPS = [
  { id: 1, label: 'Basic Info', icon: FileText },
  { id: 2, label: 'Sections', icon: Layout },
  { id: 3, label: 'Steps', icon: ListOrdered },
  { id: 4, label: 'Assignments', icon: Users },
  { id: 5, label: 'Review', icon: ClipboardList },
];

const INIT = { title: '', code: '', description: '', department_id: '', category_id: '' };

export default function SOPCreateWizard({ open, onClose, onCreated }) {
  const navigate = useNavigate();
  const { create, loading: creating } = useCreateSOP();
  const [step, setStep] = useState(1);
  const [sop, setSop] = useState({ ...INIT });
  const [sections, setSections] = useState([]);
  const [steps, setSteps] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Set once the SOP record itself has been created — lets us retry only the
  // child items (sections/steps/assignments) that failed, without re-creating the SOP.
  const [createdSopId, setCreatedSopId] = useState(null);
  const [failures, setFailures] = useState([]); // [{ kind, label, run }]

  if (!open) return null;

  const isPartialFailure = createdSopId && failures.length > 0;

  const resetState = () => {
    setStep(1); setSop({ ...INIT }); setSections([]);
    setSteps([]); setAssignments([]); setErrors({}); setSubmitError(null);
    setCreatedSopId(null); setFailures([]);
  };

  // If a SOP record already exists server-side (partial failure case), closing
  // shouldn't discard that — send the user to the real record instead of losing it.
  const handleClose = () => {
    if (createdSopId) {
      const id = createdSopId;
      resetState();
      onClose?.();
      onCreated?.({ id });
      navigate('/sops/' + id);
      return;
    }
    resetState();
    onClose?.();
  };

  const validate = () => {
    if (!sop.title.trim() || sop.title.trim().length < 2) {
      setErrors({ title: 'Title must be at least 2 characters' });
      return false;
    }
    setErrors({});
    return true;
  };

  const buildChildTasks = () => {
    const tasks = [];
    sections.forEach((s) => {
      tasks.push({
        kind: 'section',
        label: `Section: ${s.title || 'Untitled section'}`,
        run: (sopId) => createSection(sopId, {
          section_type: s.section_type || 'custom',
          title: s.title,
          content: s.content || '',
          sort_order: s.sort_order || 0,
        }),
      });
    });
    steps.forEach((s, i) => {
      tasks.push({
        kind: 'step',
        label: `Step ${i + 1}: ${s.title || (s.instruction || '').slice(0, 40) || 'Untitled step'}`,
        run: (sopId) => createStep(sopId, {
          title: s.title || null,
          instruction: s.instruction,
          estimated_minutes: s.estimated_minutes || null,
          sort_order: i + 1,
        }),
      });
    });
    assignments.forEach((a) => {
      const target = a.assignment_type === 'Department'
        ? `Department #${a.department_id}`
        : a.assignment_type === 'Position'
          ? a.position_title
          : `User #${a.user_id}`;
      tasks.push({
        kind: 'assignment',
        label: `Assignment (${a.assignment_type}): ${target}`,
        run: (sopId) => createAssignment(sopId, {
          assignment_type: a.assignment_type,
          department_id: a.department_id ? parseInt(a.department_id, 10) : undefined,
          position_title: a.position_title || undefined,
          user_id: a.user_id ? parseInt(a.user_id, 10) : undefined,
        }),
      });
    });
    return tasks;
  };

  const runTasks = async (tasks, sopId) => {
    const results = await Promise.allSettled(tasks.map((t) => t.run(sopId)));
    return tasks.filter((_, i) => results[i].status === 'rejected');
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      let sopId = createdSopId;

      if (!sopId) {
        const created = await create({
          title: sop.title.trim(),
          code: sop.code.trim() || undefined,
          description: sop.description.trim() || undefined,
          department_id: sop.department_id ? parseInt(sop.department_id, 10) : undefined,
          category_id: sop.category_id ? parseInt(sop.category_id, 10) : undefined,
        });
        sopId = created?.id;
        if (!sopId) throw new Error('Failed to create SOP - no ID returned');
        setCreatedSopId(sopId);
      }

      // On retry, only re-run what previously failed. On first run, run everything.
      const tasksToRun = failures.length > 0 ? failures : buildChildTasks();
      const failed = await runTasks(tasksToRun, sopId);

      if (failed.length > 0) {
        setFailures(failed);
        setSubmitError(
          `${failed.length} item${failed.length > 1 ? 's' : ''} failed to save. The SOP itself was created — ` +
          `you can retry the failed items below, or continue to the SOP and add them there.`
        );
        return;
      }

      setFailures([]);
      const finalId = sopId;
      resetState();
      onClose?.();
      onCreated?.({ id: finalId });
      navigate('/sops/' + finalId);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to create SOP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueAnyway = () => {
    const id = createdSopId;
    resetState();
    onClose?.();
    onCreated?.({ id });
    navigate('/sops/' + id);
  };

  const next = () => { if (step === 1 && !validate()) return; setStep((s) => Math.min(s + 1, 5)); };
  const prev = () => { setErrors({}); setStep((s) => Math.max(s - 1, 1)); };
  const isBusy = submitting || creating;

  const renderBadge = (s, i) => {
    const n = i + 1; const active = step === n; const done = step > n;
    return (
      <div key={s.id} className="flex items-center">
        <div className="flex items-center gap-1.5">
          <div className={'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ' + (active ? 'bg-blue-600 text-white ring-2 ring-blue-200' : done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500')}>
            {done ? <Check className="h-3 w-3" /> : n}
          </div>
          <span className={'hidden text-[11px] font-medium sm:inline ' + (active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-gray-500')}>{s.label}</span>
        </div>
        {i < 4 && <div className={'mx-1.5 h-px w-6 sm:w-10 ' + (done ? 'bg-emerald-300' : 'bg-gray-200')} />}
      </div>
    );
  };

  const renderBody = () => {
    if (step === 1) {
      return <div><h3 className="text-lg font-semibold text-gray-900 mb-1">Basic Information</h3><p className="text-sm text-gray-500 mb-5">Start by giving your SOP a title and description.</p><SOPBasicInfoForm formData={sop} onChange={setSop} errors={errors} /></div>;
    }
    if (step === 2) {
      return <div><h3 className="text-lg font-semibold text-gray-900 mb-1">Sections</h3><p className="text-sm text-gray-500 mb-5">Add structured sections to organize your SOP content.</p><SOPSectionForm sections={sections} onCreate={(s) => setSections((p) => [...p, { ...s, _tempId: Date.now() }])} onUpdate={(id, d) => setSections((p) => p.map((x) => (x._tempId === id || x.id === id ? { ...x, ...d } : x)))} onRemove={(id) => setSections((p) => p.filter((x) => x._tempId !== id && x.id !== id))} saving={false} /></div>;
    }
    if (step === 3) {
      return <div><h3 className="text-lg font-semibold text-gray-900 mb-1">Procedure Steps</h3><p className="text-sm text-gray-500 mb-5">Define the ordered procedural steps for this SOP.</p><SOPStepForm steps={steps} onCreate={(s) => setSteps((p) => [...p, { ...s, _tempId: Date.now() }])} onUpdate={(id, d) => setSteps((p) => p.map((x) => (x._tempId === id || x.id === id ? { ...x, ...d } : x)))} onRemove={(id) => setSteps((p) => p.filter((x) => x._tempId !== id && x.id !== id))} saving={false} /></div>;
    }
    if (step === 4) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Assignments</h3>
          <p className="text-sm text-gray-500 mb-5">Assign this SOP to departments, positions, or users.</p>
          {assignments.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Target</th><th className="w-20 px-4 py-2">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignments.map((a) => (
                    <tr key={a._tempId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{a.assignment_type}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {a.assignment_type === 'Department' ? 'Department #' + a.department_id : a.assignment_type === 'Position' ? a.position_title : 'User #' + a.user_id}
                      </td>
                      <td className="px-4 py-2"><button type="button" onClick={() => setAssignments((p) => p.filter((x) => x._tempId !== a._tempId))} className="text-xs font-medium text-red-600 hover:text-red-800">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <SOPAssignmentForm onSubmit={(v) => setAssignments((p) => [...p, { ...v, _tempId: Date.now() }])} saving={false} />
        </div>
      );
    }

    // Step 5 — Review
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Review &amp; Create</h3>
        <p className="text-sm text-gray-500 mb-5">Review everything below before creating the SOP.</p>

        {isPartialFailure && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-sm font-medium text-amber-800">
                The SOP was created, but {failures.length} item{failures.length > 1 ? 's' : ''} failed to save:
              </p>
            </div>
            <ul className="list-disc pl-9 text-sm text-amber-700 space-y-0.5">
              {failures.map((f, i) => <li key={i}>{f.label}</li>)}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-semibold text-gray-800">Basic Information</h4></div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><dt className="text-gray-500">Title</dt><dd className="font-medium text-gray-900">{sop.title || '-'}</dd></div>
              <div><dt className="text-gray-500">Code</dt><dd className="font-medium text-gray-900">{sop.code || 'Auto-generated'}</dd></div>
              <div className="col-span-2"><dt className="text-gray-500">Description</dt><dd className="text-gray-700">{sop.description || '-'}</dd></div>
              <div><dt className="text-gray-500">Dept</dt><dd className="font-medium text-gray-900">{sop.department_id || '-'}</dd></div>
              <div><dt className="text-gray-500">Category</dt><dd className="font-medium text-gray-900">{sop.category_id || '-'}</dd></div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3"><Layout className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-semibold text-gray-800">Sections ({sections.length})</h4></div>
            {sections.length === 0 ? (
              <p className="text-sm text-gray-500">No sections added.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {sections.map((s) => <li key={s._tempId || s.id}>• {s.title || 'Untitled section'}</li>)}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3"><ListOrdered className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-semibold text-gray-800">Procedure Steps ({steps.length})</h4></div>
            {steps.length === 0 ? (
              <p className="text-sm text-gray-500">No steps added.</p>
            ) : (
              <ol className="space-y-1 text-sm text-gray-700 list-decimal pl-5">
                {steps.map((s) => <li key={s._tempId || s.id}>{s.title || s.instruction}</li>)}
              </ol>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-semibold text-gray-800">Assignments ({assignments.length})</h4></div>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500">No assignments added.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {assignments.map((a) => (
                  <li key={a._tempId}>
                    • {a.assignment_type}: {a.assignment_type === 'Department' ? 'Department #' + a.department_id : a.assignment_type === 'Position' ? a.position_title : 'User #' + a.user_id}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl max-h-[90vh]">
        <button onClick={handleClose} className="absolute right-4 top-4 z-20 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
        <div className="flex items-center justify-center border-b border-gray-200 bg-gray-50/50 px-6 py-2">{STEPS.map((s, i) => renderBadge(s, i))}</div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {renderBody()}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-6 py-4">
          <div>{step > 1 && !isPartialFailure && <button type="button" onClick={prev} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><ArrowLeft className="h-4 w-4" /> Back</button>}</div>
          <div className="flex items-center gap-3">
            {!isPartialFailure && <span className="text-xs text-gray-400">Step {step} of 5</span>}
            {step < 5 && !isPartialFailure ? (
              <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Next <ArrowRight className="h-4 w-4" /></button>
            ) : isPartialFailure ? (
              <>
                <button type="button" onClick={handleContinueAnyway} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Continue to SOP anyway
                </button>
                <button type="button" onClick={handleSubmit} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                  {isBusy ? 'Retrying…' : `Retry Failed (${failures.length})`}
                </button>
              </>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {isBusy ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Creating...</> : <><Check className="h-4 w-4" /> Create SOP</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}