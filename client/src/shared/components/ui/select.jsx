import React from 'react';

function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function SelectOption({ value, children, ...props }) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  );
}

export { Select, SelectOption };