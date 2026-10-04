import React from 'react';

export const INITIAL_SUMMARY_CARDS = [
  {
    id: 'active-tickets',
    label: 'Active Tickets',
    value: 14,
    subtitle: '9 completed this week',
    subtitleClass: 'text-label-sm font-label-sm text-secondary font-medium',
    iconBgClass: 'w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-primary',
    progressWidth: '72%',
    progressBarClass: 'bg-primary h-full rounded-full',
    valueClass: 'text-headline-xl font-headline-xl text-on-surface',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
      </svg>
    ),
  },
  {
    id: 'high-priority',
    label: 'High Priority',
    value: 4,
    subtitle: 'Immediate action req.',
    subtitleClass: 'text-label-sm font-label-sm text-on-surface-variant',
    iconBgClass: 'w-9 h-9 rounded-xl bg-error-container/50 flex items-center justify-center text-error',
    progressWidth: '48%',
    progressBarClass: 'bg-error h-full rounded-full',
    valueClass: 'text-headline-xl font-headline-xl text-error',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
    ),
  },
  {
    id: 'at-risk-students',
    label: 'At-Risk Students',
    value: 6,
    subtitle: '4 overdue milestone',
    subtitleClass: 'text-label-sm font-label-sm text-error font-medium',
    iconBgClass: 'w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary',
    progressWidth: '30%',
    progressBarClass: 'bg-secondary h-full rounded-full',
    valueClass: 'text-headline-xl font-headline-xl text-on-surface',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'overdue-submissions',
    label: 'Overdue Submissions',
    value: 3,
    subtitle: '> 48 hours lag',
    subtitleClass: 'text-label-sm font-label-sm text-on-surface-variant',
    iconBgClass: 'w-9 h-9 rounded-xl bg-error-container/40 flex items-center justify-center text-error',
    progressWidth: '25%',
    progressBarClass: 'bg-error h-full rounded-full',
    valueClass: 'text-headline-xl font-headline-xl text-on-surface',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export const INITIAL_TICKETS = [
  { id: 1, title: 'ISP Milestone 2 Code Review', owner: 'Dr. Ryan Gosling', ownerRole: 'Faculty', priority: 'High', status: 'In-Progress', dueDate: 'Oct 24, 2026' },
  { id: 2, title: 'KE Ontology Schema Check', owner: 'Aj. Hutchathai', ownerRole: 'Instructor', priority: 'Medium', status: 'Open', dueDate: 'Oct 26, 2026' },
  { id: 3, title: 'SCS Lab Presentation Rubric', owner: 'Aj. Tem', ownerRole: 'Lecturer', priority: 'Low', status: 'Closed', dueDate: 'Oct 18, 2026' },
  { id: 4, title: 'FM Essay Feedback Sync', owner: 'Aj. Pajee', ownerRole: 'Lecturer', priority: 'High', status: 'Open', dueDate: 'Oct 22, 2026' },
  { id: 5, title: 'Individual Software Architecture Consultation', owner: 'Aj. Milk', ownerRole: 'Teaching Assistant', priority: 'Medium', status: 'In-Progress', dueDate: 'Oct 25, 2026' },
];

export const AT_RISK_STUDENTS = [
  {
    id: 1,
    initials: 'SJ',
    name: 'Sarah Jenkins',
    studentId: '64010892',
    section: 'Sec 01',
    taskTitle: 'ISP: Architecture Submission',
    course: 'Integrated Software Project',
    dueDate: 'Oct 19, 2026 (23:59)',
    dueDateClass: 'py-space-md px-space-md font-medium text-red-950',
    rowClass: 'bg-red-50/80 hover:bg-red-100/70 transition-colors',
    avatarClass: 'w-9 h-9 rounded-full bg-red-200 text-red-900 font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: 'overdue',
    riskDays: 3,
    actions: ['email', 'flag', 'log'],
  },
  {
    id: 2,
    initials: 'AK',
    name: 'Alexei Kozlov',
    studentId: '64010915',
    section: 'Sec 02',
    taskTitle: 'KE: RDF Triplestore Model',
    course: 'Knowledge Engineering',
    dueDate: 'Oct 20, 2026 (17:00)',
    dueDateClass: 'py-space-md px-space-md font-medium text-red-950',
    rowClass: 'bg-red-50/80 hover:bg-red-100/70 transition-colors',
    avatarClass: 'w-9 h-9 rounded-full bg-red-200 text-red-900 font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: 'overdue',
    riskDays: 2,
    actions: ['email', 'flag', 'log'],
  },
  {
    id: 3,
    initials: 'MP',
    name: 'Mayuree Prasert',
    studentId: '64010344',
    section: 'Sec 01',
    taskTitle: 'FM: Formal Verification Essay',
    course: 'Formal Methods in SE',
    dueDate: 'Tomorrow (12:00 PM)',
    dueDateClass: 'py-space-md px-space-md font-medium text-amber-950',
    rowClass: 'bg-amber-50/80 hover:bg-amber-100/70 transition-colors',
    avatarClass: 'w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: 'nearing',
    hoursLeft: 18,
    actions: ['email-reminder', 'assign-ta', 'log'],
  },
  {
    id: 4,
    initials: 'DL',
    name: 'Daniel Lin',
    studentId: '64011029',
    section: 'Sec 01',
    taskTitle: 'SCS: Buffer Overflow Exploits',
    course: 'Security & Cryptographic Systems',
    dueDate: 'Tomorrow (23:59)',
    dueDateClass: 'py-space-md px-space-md font-medium text-amber-950',
    rowClass: 'bg-amber-50/80 hover:bg-amber-100/70 transition-colors',
    avatarClass: 'w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: 'nearing',
    hoursLeft: 22,
    actions: ['email-reminder', 'assign-ta', 'log'],
  },
  {
    id: 5,
    initials: 'KR',
    name: 'Kittisak Ratanapol',
    studentId: '64010771',
    section: 'Sec 01',
    taskTitle: 'ISP: Architecture Submission',
    course: 'Integrated Software Project',
    dueDate: 'Oct 19, 2026 (23:59)',
    dueDateClass: 'py-space-md px-space-md font-medium text-red-950',
    rowClass: 'bg-red-50/80 hover:bg-red-100/70 transition-colors',
    avatarClass: 'w-9 h-9 rounded-full bg-red-200 text-red-900 font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: 'overdue',
    riskDays: 3,
    actions: ['email', 'flag', 'log'],
  },
  {
    id: 6,
    initials: 'TN',
    name: 'Tanawat Narkprom',
    studentId: '64010620',
    section: 'Sec 02',
    taskTitle: 'SCS: Presentation Rubric Check',
    course: 'Lab Presentation Preparation',
    dueDate: 'Oct 26, 2026',
    dueDateClass: 'py-space-md px-space-md font-medium text-on-surface-variant',
    rowClass: 'bg-surface-container-lowest hover:bg-surface-container-low transition-colors',
    avatarClass: 'w-9 h-9 rounded-full bg-surface-container text-on-surface font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: 'warning',
    actions: ['check-in', 'log'],
  },
];
