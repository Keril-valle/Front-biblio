import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastProps {
  toast: ToastItem | null;
  durationMs?: number;
  onClose: () => void;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-[var(--una-blue-40)]',
  info: 'border-[var(--border-gray)]',
  error: 'border-[var(--una-red-30)]',
};

const TONE_ICON: Record<ToastTone, string> = {
  success: 'bg-[var(--una-blue-10)] text-[var(--una-blue)]',
  info: 'bg-[var(--una-blue-10)] text-[var(--una-blue)]',
  error: 'bg-[var(--una-red-10)] text-[var(--una-red-dark)]',
};

const TONE_TITLE: Record<ToastTone, string> = {
  success: 'Operación exitosa',
  info: 'Información',
  error: 'No se pudo completar la acción',
};

export const Toast: React.FC<ToastProps> = ({ toast, durationMs = 3500, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [toast, durationMs, onClose]);

  if (!toast) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] sm:right-6 sm:top-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        key={toast.id}
        className={`toast-in pointer-events-auto flex w-[calc(100vw-2rem)] max-w-md items-start gap-3 rounded-xl border bg-[var(--surface-white)] p-4 text-sm text-[var(--text-primary)] shadow-md ${TONE_STYLES[toast.tone]}`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[toast.tone]}`}>
        {toast.tone === 'success' && (
          <svg
            aria-hidden
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {toast.tone === 'info' && (
          <svg
            aria-hidden
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        )}
        {toast.tone === 'error' && (
          <svg
            aria-hidden
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-5">{TONE_TITLE[toast.tone]}</p>
          <p className="mt-1 break-words leading-5 text-[var(--una-gray-digital)]">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-gray-50)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--una-blue)]"
        >
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
};
