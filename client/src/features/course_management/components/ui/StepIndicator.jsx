export default function StepIndicator({ currentStep, totalSteps = 3, labels = ['Basics', 'Settings', 'Review'] }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, idx) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                currentStep >= step
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                  : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {currentStep > step ? '✓' : step}
            </div>
            {labels[idx] && (
              <span className={`text-[10px] mt-1 font-medium ${currentStep >= step ? 'text-[var(--color-primary-hover)] dark:text-[var(--color-primary)]' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {labels[idx]}
              </span>
            )}
          </div>
          {idx < totalSteps - 1 && (
            <div className={`flex-1 h-0.5 mx-2 rounded-full ${currentStep > step ? 'bg-[var(--color-primary)]' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
