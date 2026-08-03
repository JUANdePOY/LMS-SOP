// Minimal inline icons used across the certificate wizard. Swap these for
// <Check /> / <ChevronDown /> from lucide-react if it's already a dependency.

export function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ open, className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`${className} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
