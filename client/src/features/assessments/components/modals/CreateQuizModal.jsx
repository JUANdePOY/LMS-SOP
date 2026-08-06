import { useState } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/Toast";
import { useQuizWizard } from "../../hooks/useQuizWizard";
import StepBasics from "../wizard/StepBasics";
import StepQuestions from "../wizard/StepQuestions";
import StepReview from "../wizard/StepReview";
import { CheckCircle2, ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Questions" },
  { id: 3, label: "Review" },
];

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = step > s.id;
        const active = step === s.id;
        return (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center gap-2 ${
                active
                  ? "text-blue-700 dark:text-blue-300"
                  : done
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              <span
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold border shrink-0 ${
                  active
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : done
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-neutral-300 dark:border-neutral-600"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </span>
              <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded ${
                  done ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateQuizModal({ open, courses, loadingCourses, lockCourseId, onCancel, onComplete }) {
  const { toast } = useToast();
  const wizard = useQuizWizard({ toast, onComplete, onCancel, courseId: lockCourseId });
  const [openBuilder, setOpenBuilder] = useState(false);

  if (!open) return null;

  const selectedCourse = courses?.find(
    (c) => String(c.id) === String(wizard.settings.courseId)
  );
  const courseTitle = selectedCourse?.title || selectedCourse?.name;

  const footer = (
    <div className="flex items-center justify-between w-full gap-2">
      <div>
        {wizard.step > 1 ? (
          <Button variant="ghost" size="sm" onClick={() => wizard.setStep(wizard.step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={wizard.cancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {wizard.step === 1 && (
          <Button size="sm" onClick={wizard.submitStep1} disabled={wizard.savingStep === 1}>
            {wizard.savingStep === 1 ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-1" /> Next: Questions
              </>
            )}
          </Button>
        )}
        {wizard.step === 2 && (
          <Button size="sm" onClick={() => wizard.setStep(3)}>
            <ArrowRight className="h-4 w-4 mr-1" /> Next: Review
          </Button>
        )}
        {wizard.step === 3 && (
          <Button
            size="sm"
            onClick={() => wizard.finish(openBuilder)}
            disabled={wizard.savingStep === 3}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Finish
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={wizard.cancel} title="Create Quiz" size="3xl" footer={footer}>
      <Stepper step={wizard.step} />
      <div className="mt-5">
        {wizard.step === 1 && (
          <StepBasics
            settings={wizard.settings}
            setField={wizard.setField}
            errors={wizard.errors}
            courses={courses}
            loadingCourses={loadingCourses}
            disabledCourse={!!lockCourseId}
          />
        )}
        {wizard.step === 2 && (
          <StepQuestions
            quizId={wizard.quizId}
            questions={wizard.questions}
            onAddQuestion={wizard.addQuestion}
            onUpdateQuestion={wizard.updateQuestion}
            onRemoveQuestion={wizard.removeQuestion}
            onReorder={wizard.reorderQuestions}
            onRefresh={wizard.loadQuestions}
          />
        )}
        {wizard.step === 3 && (
          <StepReview
            settings={wizard.settings}
            courseTitle={courseTitle}
            questions={wizard.questions}
            openBuilder={openBuilder}
            setOpenBuilder={setOpenBuilder}
          />
        )}
      </div>
    </Modal>
  );
}
