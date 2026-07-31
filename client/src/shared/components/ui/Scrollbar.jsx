import { useEffect } from "react";

/**
 * Scrollbar utility component
 * Uses globally defined scrollbar styles from index.css
 */
export function Scrollbar({ children, className = '', variant = 'default' }) {
  const variantClasses = {
    default: 'scrollbar-custom',
    thin: 'scrollbar-custom scrollbar-thin',
    'auto-hide': 'scrollbar-custom scrollbar-auto-hide',
    'no-scrollbar': 'scrollbar-none',
    viewport: 'scrollbar-viewport',
  };

  useEffect(() => {
    if (variant !== 'viewport') return;

    const root = document.documentElement;
    root.classList.add('scrollbar-viewport');

    return () => {
      root.classList.remove('scrollbar-viewport');
    };
  }, [variant]);

  const classes = `${variantClasses[variant] || variantClasses.default} ${className}`.trim();

  if (variant === 'viewport') {
    return <>{children}</>;
  }

  return (
    <div className={classes}>
      {children}
    </div>
  );
}