import React from 'react';

function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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