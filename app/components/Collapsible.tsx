'use client';

import { useState } from 'react';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: string;
}

export default function Collapsible({
  title,
  children,
  defaultOpen = true,
  icon = '📋',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-650 dark:hover:to-gray-550 transition font-semibold text-gray-900 dark:text-gray-100"
      >
        <div className="flex items-center gap-3">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <span className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600">
          {children}
        </div>
      )}
    </div>
  );
}
