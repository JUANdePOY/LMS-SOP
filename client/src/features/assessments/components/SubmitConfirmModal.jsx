import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export default function SubmitConfirmModal({ open, onClose, onConfirm, onReview, questionCount, answeredCount, flaggedCount, timeElapsed, isSubmitting }) {
  return (
    <Modal open={open} onClose={onClose} title="Submit quiz?" size="md" footer={
      <>
        <Button variant="outline" onClick={onReview}>Review</Button>
        <Button variant="outline" onClick={onClose}>Back</Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit"}
        </Button>
      </>
    }>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          You’ve answered <strong>{answeredCount}</strong> of <strong>{questionCount}</strong> questions.
          {flaggedCount > 0 && <span className="text-amber-700 dark:text-amber-300"> You have {flaggedCount} flagged questions.</span>}
        </p>
        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Time spent: {formatDuration(timeElapsed)}</span>
          <span>Unanswered: {Math.max(0, questionCount - answeredCount)}</span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Once submitted, your answers are locked and will be recorded for review.
        </p>
      </div>
    </Modal>
  );
}
