'use client';

import React, { useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: (id: string) => void;
}

export default function Toast({
  id,
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const variantStyles = {
    success: 'bg-emerald-500 dark:bg-emerald-600',
    error: 'bg-rose-500 dark:bg-rose-600',
    info: 'bg-blue-500 dark:bg-blue-600',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      className={`toast-item ${variantStyles[variant]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-toast-in`}
    >
      <span className="font-bold text-lg">{icons[variant]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="ml-2 hover:opacity-80 transition-opacity"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
