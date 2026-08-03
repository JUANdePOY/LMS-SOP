import { CheckIcon } from '@/features/certificate-management/utils/icons';

/**
 * Horizontal step indicator for the certificate template wizard.
 * Navigation is not gated — clicking any pill jumps straight there so the
 * user can freely move between editing and checking the live preview.
 */
export default function CertificateStepper({ steps, currentStep, stepComplete, onStepClick }) {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isDone = stepComplete[step.key] && index !== currentStep;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => onStepClick(index)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : isDone
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10'
                    : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                }`}
              >
                {isDone ? <CheckIcon /> : index + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`mx-3 h-px flex-1 ${
                  index < currentStep ? 'bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
