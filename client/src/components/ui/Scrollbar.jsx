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
  };

  const classes = `${variantClasses[variant] || variantClasses.default} ${className}`.trim();

  return (
    <div className={classes}>
      {children}
    </div>
  );
}