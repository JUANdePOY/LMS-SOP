import React from 'react';

function Input({ className = '', type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={`flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export { Input };