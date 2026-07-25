import React from 'react';

function Table({ className = '', children, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ className = '', children, ...props }) {
  return (
    <thead className={`[&_tr]:border-b ${className}`} {...props}>
      {children}
    </thead>
  );
}

function TableBody({ className = '', children, ...props }) {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

function TableRow({ className = '', children, ...props }) {
  return (
    <tr className={`border-b border-gray-200 transition-colors hover:bg-gray-50 ${className}`} {...props}>
      {children}
    </tr>
  );
}

function TableHead({ className = '', children, ...props }) {
  return (
    <th
      className={`h-10 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

function TableCell({ className = '', children, ...props }) {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };