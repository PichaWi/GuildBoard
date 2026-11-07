import React, { useEffect } from 'react';

export default function Toast({ message, visible = true, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (visible && onClose && duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose, duration]);

  if (!visible && !onClose) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div
      className={`fixed bottom-space-lg right-space-lg z-50 flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface shadow-xl transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'
      }`}
      role="alert"
    >
      {isSuccess && (
        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {isError && (
        <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      {!isSuccess && !isError && (
        <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )}
      <span className="text-body-md font-body-md">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="ml-2 text-inverse-on-surface/70 hover:text-inverse-on-surface transition-colors cursor-pointer"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}

