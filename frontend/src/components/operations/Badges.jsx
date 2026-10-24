import React from 'react';

export function getInitials(name) {
  return name
    .replace(/Aj\.\s*/g, '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function PriorityBadge({ priority }) {
  if (priority === 'High') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-rose-50 text-rose-700">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> High
      </span>
    );
  }
  if (priority === 'Medium') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-slate-100 text-slate-700">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Low
    </span>
  );
}

export function StatusBadge({ status }) {
  if (status === 'Open') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-medium bg-sky-50 text-sky-700">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Open
      </span>
    );
  }
  if (status === 'In-Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-medium bg-emerald-50 text-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> In-Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-medium bg-slate-100 text-slate-500">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Closed
    </span>
  );
}

export function RiskBadge({ student }) {
  if (student.riskType === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full text-label-sm font-label-sm font-semibold bg-error text-on-error shadow-sm">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        OVERDUE ({student.riskDays} Days)
      </span>
    );
  }
  if (student.riskType === 'nearing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full text-label-sm font-label-sm font-semibold bg-amber-200 text-amber-900 shadow-sm">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        NEARING DEADLINE ({student.hoursLeft}h left)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant font-medium">
      <svg className="w-3.5 h-3.5 text-on-surface-variant" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="16" y2="12" />
        <line x1="12" x2="12.01" y1="8" y2="8" />
      </svg>
      Draft Incomplete
    </span>
  );
}

export const EmailIcon = () => (
  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect height="16" rx="2" width="20" x="2" y="4" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export const FlagIcon = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </svg>
);

export const DotsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);
