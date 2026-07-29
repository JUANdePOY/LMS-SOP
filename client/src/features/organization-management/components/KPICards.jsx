import { Building2, Layers } from 'lucide-react';

const iconMap = { Building2, Layers };

const colorMap = {
  blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

function KPICard({ label, value, sub, color }) {
  const Icon = iconMap[sub.icon];
  const c = colorMap[color];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c}`}>
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-none">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[var(--text-muted)] leading-snug">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function KPICards({ cards }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <KPICard key={c.label} {...c} />
      ))}
    </div>
  );
}