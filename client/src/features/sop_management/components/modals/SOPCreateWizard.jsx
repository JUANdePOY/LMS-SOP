import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FileText, Layout, ListOrdered, Users, ClipboardList, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useCreateSOP } from '../../hooks/useCreateSOP';
import { useDepartmentList } from '../../hooks/useDepartmentList';
import { useCategoryList } from '../../hooks/useCategoryList';
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
  const { departments } = useDepartmentList();
  const { categories } = useCategoryList();
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
          <div className={'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ' + (active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : done ? 'bg-[var(--status-green)] text-white' : 'bg-muted text-muted-foreground')}>
            {done ? <Check className="h-3 w-3" /> : n}
          </div>
          <span className={'hidden text-[11px] font-medium sm:inline ' + (active ? 'text-primary' : done ? 'text-[var(--status-green)]' : 'text-muted-foreground')}>{s.label}</span>
        </div>
        {i < 4 && <div className={'mx-1.5 h-px w-6 sm:w-10 ' + (done ? 'bg-[var(--status-green)]/40' : 'bg-muted')} />}
      </div>
    );
  };

  const renderBody = () => {
if (step === 1) {
       return <div><h3 className="text-lg font-semibold text-foreground mb-1">Basic Information</h3><p className="text-sm text-muted-foreground mb-5">Start by giving your SOP a title and description.</p><SOPBasicInfoForm formData={sop} onChange={setSop} errors={errors} departments={departments} categories={categories} /></div>;
    }
    if (step === 2) {
      return <div><h3 className="text-lg font-semibold text-foreground mb-1">Sections</h3><p className="text-sm text-muted-foreground mb-5">Add structured sections to organize your SOP content.</p><SOPSectionForm sections={sections} onCreate={(s) => setSections((p) => [...p, { ...s, _tempId: Date.now() }])} onUpdate={(id, d) => setSections((p) => p.map((x) => (x._tempId === id || x.id === id ? { ...x, ...d } : x)))} onRemove={(id) => setSections((p) => p.filter((x) => x._tempId !== id && x.id !== id))} saving={false} /></div>;
    }
    if (step === 3) {
      return <div><h3 className="text-lg font-semibold text-foreground mb-1">Procedure Steps</h3><p className="text-sm text-muted-foreground mb-5">Define the ordered procedural steps for this SOP.</p><SOPStepForm steps={steps} onCreate={(s) => setSteps((p) => [...p, { ...s, _tempId: Date.now() }])} onUpdate={(id, d) => setSteps((p) => p.map((x) => (x._tempId === id || x.id === id ? { ...x, ...d } : x)))} onRemove={(id) => setSteps((p) => p.filter((x) => x._tempId !== id && x.id !== id))} saving={false} /></div>;
    }
    if (step === 4) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Assignments</h3>
          <p className="text-sm text-muted-foreground mb-5">Assign this SOP to departments, positions, or users.</p>
          {assignments.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Target</th><th className="w-20 px-4 py-2">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {assignments.map((a) => (
                    <tr key={a._tempId} className="hover:bg-muted">
                      <td className="px-4 py-2 font-medium text-foreground">{a.assignment_type}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {a.assignment_type === 'Department' ? 'Department #' + a.department_id : a.assignment_type === 'Position' ? a.position_title : 'User #' + a.user_id}
                      </td>
                      <td className="px-4 py-2"><button type="button" onClick={() => setAssignments((p) => p.filter((x) => x._tempId !== a._tempId))} className="text-xs font-medium text-destructive hover:text-destructive/80">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <SOPAssignmentForm onSubmit={(v) => setAssignments((p) => [...p, { ...v, _tempId: Date.now() }])} saving={false} departments={departments} />
        </div>
      );
    }

    // Step 5 — Review
    return (
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Review &amp; Create</h3>
        <p className="text-sm text-muted-foreground mb-5">Review everything below before creating the SOP.</p>

        {isPartialFailure && (
          <div className="mb-4 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-[var(--accent-gold)] mt-0.5" />
              <p className="text-sm font-medium text-[var(--accent-gold)]">
                The SOP was created, but {failures.length} item{failures.length > 1 ? 's' : ''} failed to save:
              </p>
            </div>
            <ul className="list-disc pl-9 text-sm text-[var(--accent-gold)] space-y-0.5">
              {failures.map((f, i) => <li key={i}>{f.label}</li>)}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-muted p-4">
            <div className="flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">Basic Information</h4></div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><dt className="text-muted-foreground">Title</dt><dd className="font-medium text-foreground">{sop.title || '-'}</dd></div>
              <div><dt className="text-muted-foreground">Code</dt><dd className="font-medium text-foreground">{sop.code || 'Auto-generated'}</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Description</dt><dd className="text-foreground">{sop.description || '-'}</dd></div>
              <div><dt className="text-muted-foreground">Dept</dt><dd className="font-medium text-foreground">{sop.department_id || '-'}</dd></div>
              <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium text-foreground">{sop.category_id || '-'}</dd></div>
            </dl>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-muted p-4">
            <div className="flex items-center gap-2 mb-3"><Layout className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">Sections ({sections.length})</h4></div>
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sections added.</p>
            ) : (
              <ul className="space-y-1 text-sm text-foreground">
                {sections.map((s) => <li key={s._tempId || s.id}>• {s.title || 'Untitled section'}</li>)}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-muted p-4">
            <div className="flex items-center gap-2 mb-3"><ListOrdered className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">Procedure Steps ({steps.length})</h4></div>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No steps added.</p>
            ) : (
              <ol className="space-y-1 text-sm text-foreground list-decimal pl-5">
                {steps.map((s) => <li key={s._tempId || s.id}>{s.title || s.instruction}</li>)}
              </ol>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-muted p-4">
            <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">Assignments ({assignments.length})</h4></div>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments added.</p>
            ) : (
              <ul className="space-y-1 text-sm text-foreground">
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
      <div className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl bg-[var(--bg-surface)] shadow-2xl max-h-[90vh]">
        <button onClick={handleClose} className="absolute right-4 top-4 z-20 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        <div className="flex items-center justify-center border-b border-[var(--border)] bg-muted/50 px-6 py-2">{STEPS.map((s, i) => renderBadge(s, i))}</div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
          {renderBody()}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-muted/50 px-6 py-4">
          <div>{step > 1 && !isPartialFailure && <Button variant="outline" onClick={prev} disabled={isBusy}><ArrowLeft className="h-4 w-4" /> Back</Button>}</div>
          <div className="flex items-center gap-3">
            {!isPartialFailure && <span className="text-xs text-muted-foreground">Step {step} of 5</span>}
            {step < 5 && !isPartialFailure ? (
              <Button variant="default" onClick={next}>Next <ArrowRight className="h-4 w-4" /></Button>
            ) : isPartialFailure ? (
              <>
                <Button variant="outline" onClick={handleContinueAnyway} disabled={isBusy}>
                  Continue to SOP anyway
                </Button>
                <Button variant="default" onClick={handleSubmit} disabled={isBusy}>
                  {isBusy ? 'Retrying…' : `Retry Failed (${failures.length})`}
                </Button>
              </>
            ) : (
              <Button variant="default" onClick={handleSubmit} disabled={isBusy}>
                {isBusy ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Creating...</> : <><Check className="h-4 w-4" /> Create SOP</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}