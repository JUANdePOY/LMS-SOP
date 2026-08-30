import { Link } from 'react-router-dom';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable breadcrumb. Every segment is muted except the current one.
 * Use `chip` for compact inline variants (e.g. a task's Client › Project trail).
 */
export default function Breadcrumb({ items, chip = false, className }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('ppm-breadcrumb', chip && 'ppm-breadcrumb--chip', className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <span className="ppm-breadcrumb__sep" aria-hidden="true">/</span>}
            {item.onClick && !isLast ? (
              <button type="button" onClick={item.onClick} className="ppm-breadcrumb__link">
                {item.label}
              </button>
            ) : item.to && !isLast ? (
              <Link to={item.to} className="ppm-breadcrumb__link">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'ppm-breadcrumb__current' : 'ppm-breadcrumb__link'}>
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
