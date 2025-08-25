'use client';

import { useEffect } from 'react';

type ToastProps = {
  open: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'info';
  autoHideMs?: number;
};

export default function Toast({ open, onClose, message, type = 'info', autoHideMs = 3000 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [open, autoHideMs, onClose]);

  if (!open) return null;

  const palette =
    type === 'success'
      ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
      : type === 'error'
      ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
      : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800';

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className={`hs-toast pointer-events-auto max-w-lg w-full border rounded-lg shadow-sm px-4 py-3 flex items-center justify-between ${palette}`}
        role="status"
        aria-live="polite"
      >
        <span className="text-sm">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ms-4 inline-flex items-center justify-center rounded-md p-1 text-current hover:opacity-80 focus:outline-none"
          aria-label="Close"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}





