import React from 'react';

export default function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-space-lg right-space-lg z-50 flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface shadow-xl transition-all duration-300 pointer-events-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <svg className="w-4 h-4 text-tertiary-fixed" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="text-body-md font-body-md">{message}</span>
    </div>
  );
}
