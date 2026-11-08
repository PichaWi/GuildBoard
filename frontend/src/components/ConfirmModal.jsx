import React from 'react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  subtitle,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
    >
      <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          className="absolute top-4 right-4 p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-title-md">close</span>
        </button>

        <div className="flex items-start gap-space-md mb-space-md">
          <div
            className={`p-3 rounded-full flex-shrink-0 ${
              isDestructive
                ? 'bg-error-container text-on-error-container'
                : 'bg-primary-container text-on-primary'
            }`}
          >
            <span className="material-symbols-outlined text-headline-md">
              {isDestructive ? 'warning' : 'help'}
            </span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
            {subtitle && (
              <span className="font-body-sm text-body-sm text-outline mt-0.5">{subtitle}</span>
            )}
          </div>
        </div>

        <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-lg">
          {message}
        </div>

        <div className="flex items-center justify-end gap-space-xs pt-space-xs border-t border-surface-container">
          <button
            className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm transition-all cursor-pointer"
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`px-space-md py-2 rounded-lg font-title-sm text-title-sm transition-all shadow-sm flex items-center gap-space-2xs cursor-pointer ${
              isDestructive
                ? 'bg-error hover:bg-on-error-container text-on-error'
                : 'bg-primary-container hover:bg-primary text-on-primary'
            }`}
            onClick={onConfirm}
            type="button"
          >
            <span className="material-symbols-outlined text-title-md">check</span>
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

