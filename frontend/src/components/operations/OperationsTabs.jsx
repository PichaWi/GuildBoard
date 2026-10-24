import React from 'react';

export default function OperationsTabs({
  effectiveTab,
  isLecturer,
  ticketCount,
  atRiskCount,
  onTabChange,
}) {
  return (
    <div className="inline-flex p-1.5 bg-surface-container rounded-xl self-start md:self-auto shadow-sm">
      <button
        aria-selected={effectiveTab === 'tickets'}
        className={`flex items-center gap-space-xs px-space-md py-space-xs rounded-lg text-title-sm font-title-sm transition-all duration-200 ${
          effectiveTab === 'tickets'
            ? 'bg-surface-container-lowest text-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
        id="tab-btn-tickets"
        onClick={() => onTabChange('tickets')}
      >
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect height="4" rx="1" ry="1" width="8" x="8" y="2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
        <span>TA Ticket Tracking</span>
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant">
          {ticketCount}
        </span>
      </button>

      {isLecturer && (
        <button
          aria-selected={effectiveTab === 'atrisk'}
          className={`flex items-center gap-space-xs px-space-md py-space-xs rounded-lg text-title-sm font-title-sm transition-all duration-200 ${
            effectiveTab === 'atrisk'
              ? 'bg-surface-container-lowest text-error shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          id="tab-btn-atrisk"
          onClick={() => onTabChange('atrisk')}
        >
          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
          <span>Lecturer At-Risk Monitor</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-error-container text-on-error-container font-semibold">
            {atRiskCount}
          </span>
        </button>
      )}
    </div>
  );
}
