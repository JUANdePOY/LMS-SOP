import { cn } from '@/lib/utils';

/**
 * View-type switcher (List / Board / Timeline / ...). This is the *how* a task
 * set is displayed — deliberately separate from saved filter presets, which live
 * in their own `SavedViewChips` control. Reused by the admin Tasks page and the
 * per-project workspace.
 */
export default function ViewTabs({ views = [], active, onChange, className }) {
  if (!views.length) return null;
  return (
    <div className={cn('ppm-tabs', className)} role="tablist" aria-label="Task views">
      {views.map((v) => {
        const Icon = v.icon;
        const isActive = active === v.key;
        return (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(v.key)}
            className={cn('ppm-tab', isActive && 'ppm-tab--active')}
          >
            {Icon && <Icon size={15} />}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
