import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

import { INITIAL_SUMMARY_CARDS, INITIAL_TICKETS, AT_RISK_STUDENTS } from '../mock/operationsData';

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function getInitials(name) {
  return name
    .replace(/Aj\.\s*/g, '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function PriorityBadge({ priority }) {
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

function StatusBadge({ status }) {
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

function RiskBadge({ student }) {
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

// ─── SVG Icon Components ──────────────────────────────────────────────────────

const EmailIcon = () => (
  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect height="16" rx="2" width="20" x="2" y="4" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const FlagIcon = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </svg>
);

const DotsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }) {
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

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

const FORM_OWNERS = [
  { value: 'Dr. Ryan Gosling', label: 'Dr. Ryan Gosling (Faculty)' },
  { value: 'Aj. Hutchathai', label: 'Aj. Hutchathai' },
  { value: 'Aj. Tem', label: 'Aj. Tem' },
  { value: 'Aj. Pajee', label: 'Aj. Pajee' },
  { value: 'Aj. Milk', label: 'Aj. Milk' },
  { value: 'Alex Chen (TA)', label: 'Alex Chen (TA)' },
];

function CreateTicketModal({ isOpen, onClose, onSave }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const rawDue = form['form-task-due'].value;
    const formattedDate = new Date(rawDue).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const owner = form['form-task-owner'].value;
    const newTicket = {
      id: Date.now(),
      title: form['form-task-title'].value,
      owner,
      ownerRole: owner.includes('TA') ? 'Teaching Assistant' : 'Faculty Instructor',
      priority: form['form-task-priority'].value,
      status: form['form-task-status'].value,
      dueDate: formattedDate || 'Mar 28, 2025',
    };
    onSave(newTicket);
    form.reset();
  };

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
    >
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <h3 className="text-title-md font-title-md text-primary">Create Teaching Task Ticket</h3>
              <p className="text-label-sm font-label-sm text-on-surface-variant">Assign and track instructional workflows</p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={onClose}
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Form */}
        <form className="p-space-lg space-y-space-md" onSubmit={handleSubmit}>
          {/* Task Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md font-label-md text-on-surface" htmlFor="form-task-title">
              Task Title <span className="text-error">*</span>
            </label>
            <input
              className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest transition-colors"
              id="form-task-title"
              name="form-task-title"
              placeholder="e.g. ISP Milestone 3 Design Doc Review"
              required
              type="text"
            />
          </div>

          {/* Owner & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-label-md text-on-surface" htmlFor="form-task-owner">
                Assigned Owner <span className="text-error">*</span>
              </label>
              <select
                className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface focus:outline-none"
                id="form-task-owner"
                name="form-task-owner"
                required
              >
                {FORM_OWNERS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-label-md text-on-surface" htmlFor="form-task-due">
                Due Date <span className="text-error">*</span>
              </label>
              <input
                className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface focus:outline-none"
                defaultValue="2025-03-28"
                id="form-task-due"
                name="form-task-due"
                required
                type="date"
              />
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-label-md text-on-surface" htmlFor="form-task-priority">
                Priority
              </label>
              <select
                className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface focus:outline-none"
                id="form-task-priority"
                name="form-task-priority"
              >
                <option value="High">High (Immediate)</option>
                <option defaultValue value="Medium">Medium (Standard)</option>
                <option value="Low">Low (Backlog)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-label-md text-on-surface" htmlFor="form-task-status">
                Initial Status
              </label>
              <select
                className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface focus:outline-none"
                id="form-task-status"
                name="form-task-status"
              >
                <option defaultValue value="Open">Open</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md font-label-md text-on-surface" htmlFor="form-task-notes">
              Description &amp; Rubric Notes
            </label>
            <textarea
              className="p-space-sm rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest transition-colors"
              id="form-task-notes"
              name="form-task-notes"
              placeholder="Specify grading expectations, meeting times, or cohort specifics..."
              rows="3"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-space-xs pt-space-xs">
            <button
              className="px-space-md h-[38px] rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-title-sm font-title-sm transition-colors"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="px-space-lg h-[38px] rounded-lg bg-primary-container text-on-primary hover:bg-primary text-title-sm font-title-sm shadow-sm transition-colors flex items-center gap-1.5"
              type="submit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── OperationsDashboard (default export) ─────────────────────────────────────

export default function OperationsDashboard() {
  const { user } = useAuth();
  const userRole = user?.role || 'lecturer';

  // Tab state: 'tickets' | 'atrisk'
  const [activeTab, setActiveTab] = useState('tickets');

  // If user is TA, keep activeTab on 'tickets'
  React.useEffect(() => {
    if (userRole === 'ta' && activeTab !== 'tickets') {
      setActiveTab('tickets');
    }
  }, [userRole, activeTab]);

  const isLecturer = userRole === 'lecturer';
  const effectiveTab = isLecturer ? activeTab : 'tickets';

  // Ticket data state (decoupled for easy backend swap)
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [summaryCards] = useState(INITIAL_SUMMARY_CARDS);
  const [atRiskStudents] = useState(AT_RISK_STUDENTS);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3200);
  };

  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const activeTicketCount = tickets.filter((t) => t.status !== 'Closed').length;
  const highPriorityCount = tickets.filter((t) => t.priority === 'High' && t.status !== 'Closed').length;

  const handleToggleStatus = (id) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = t.status === 'Open' ? 'In-Progress' : t.status === 'In-Progress' ? 'Closed' : 'Open';
        showToast(`Ticket status changed to ${next}`);
        return { ...t, status: next };
      })
    );
  };

  const handleDeleteTicket = (id) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    showToast('Ticket removed from tracking register');
  };

  const handleCreateTicket = (newTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setIsModalOpen(false);
    showToast('New instructional ticket created successfully');
  };

  const handleAtRiskAction = (type, studentName) => {
    if (type === 'email') showToast(`Automated reminder & extension notice dispatched to ${studentName}`);
    else if (type === 'flag') showToast(`${studentName} assigned to Lead TA 1-on-1 breakout clinic`);
    else if (type === 'email-reminder') showToast(`Reminder sent to ${studentName}`);
    else if (type === 'assign-ta') showToast(`TA assigned for ${studentName}`);
    else if (type === 'check-in') showToast(`Opening check-in flow for ${studentName}`);
    else showToast(`Opening complete LMS submission log for ${studentName}`);
  };

  const handleBatchReminder = () => {
    showToast('Notified 6 students via LMS Urgent Push & University Email');
  };

  // ── Derived display values (update KPI cards dynamically) ──────────────────
  const displayCards = summaryCards.map((card) => {
    if (card.id === 'active-tickets') return { ...card, value: activeTicketCount };
    if (card.id === 'high-priority') return { ...card, value: highPriorityCount };
    return card;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  const navbarLeftContent = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span className="hover:text-on-surface transition-colors cursor-pointer">Guild Board Portal</span>
      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      <span className="text-primary font-semibold">Operations</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={navbarLeftContent}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">

      {/* ── Page Header & Tab Switcher ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <span className="inline-flex items-center px-space-xs py-0.5 rounded-full text-label-sm font-label-sm bg-secondary-container text-on-secondary-container">
              Spring 2025 Semester
            </span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">• Term Week 8</span>
          </div>
          <h1 className="text-headline-xl font-headline-xl text-primary tracking-tight">
            Academic Operations &amp; Triage
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">
            Cross-course task assignments, cohort risk telemetry, and teaching assistant workflows.
          </p>
        </div>

        {/* Segmented Pill Switcher */}
        <div className="inline-flex p-1.5 bg-surface-container rounded-xl self-start md:self-auto shadow-sm">
          <button
            aria-selected={effectiveTab === 'tickets'}
            className={`flex items-center gap-space-xs px-space-md py-space-xs rounded-lg text-title-sm font-title-sm transition-all duration-200 ${
              effectiveTab === 'tickets'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            id="tab-btn-tickets"
            onClick={() => setActiveTab('tickets')}
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect height="4" rx="1" ry="1" width="8" x="8" y="2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
            <span>TA Ticket Tracking</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant">
              {filteredTickets.length}
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
              onClick={() => setActiveTab('atrisk')}
            >
              <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
              <span>Lecturer At-Risk Monitor</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-error-container text-on-error-container font-semibold">
                {atRiskStudents.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        {displayCards.map((card) => (
          <div
            key={card.id}
            className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">
                {card.label}
              </span>
              <div className={card.iconBgClass}>{card.icon}</div>
            </div>
            <div className="mt-space-md flex items-baseline gap-space-xs">
              <span className={card.valueClass}>{card.value}</span>
              <span className={card.subtitleClass}>{card.subtitle}</span>
            </div>
            <div className="w-full bg-surface-container-low h-1 rounded-full mt-space-sm overflow-hidden">
              <div className={card.progressBarClass} style={{ width: card.progressWidth }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── VIEW 1: TA Ticket Tracking ──────────────────────────────────────── */}
      {effectiveTab === 'tickets' && (
        <section className="flex flex-col w-full space-y-space-md" id="view-tickets">
          {/* Filter Bar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-space-sm flex-1">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1 max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" x2="16.65" y1="21" y2="16.65" />
                  </svg>
                </div>
                <input
                  className="w-full h-[38px] pl-9 pr-space-sm text-body-md font-body-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest transition-colors"
                  id="ticket-search"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search task, instructor, or course..."
                  type="text"
                  value={searchQuery}
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-label-sm font-label-sm text-on-surface-variant">Status:</span>
                <select
                  className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface text-body-md font-body-md focus:outline-none cursor-pointer"
                  id="ticket-filter-status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  value={statusFilter}
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-label-sm font-label-sm text-on-surface-variant">Priority:</span>
                <select
                  className="h-[38px] px-space-sm rounded-lg bg-surface-container-low text-on-surface text-body-md font-body-md focus:outline-none cursor-pointer"
                  id="ticket-filter-priority"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  value={priorityFilter}
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Create Button */}
            <button
              className="flex items-center justify-center gap-space-xs px-space-md h-[38px] rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm shadow-sm transition-all duration-150 shrink-0"
              onClick={() => setIsModalOpen(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              <span>Create New Ticket</span>
            </button>
          </div>

          {/* Ticket Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider">
                    <th className="py-space-sm px-space-lg">Task Title &amp; Details</th>
                    <th className="py-space-sm px-space-md">Assigned Owner</th>
                    <th className="py-space-sm px-space-md">Priority</th>
                    <th className="py-space-sm px-space-md">Status</th>
                    <th className="py-space-sm px-space-md">Due Date</th>
                    <th className="py-space-sm px-space-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-body-md font-body-md">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="p-space-2xl text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-space-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" x2="16.65" y1="21" y2="16.65" />
                            </svg>
                          </div>
                          <span className="text-title-md font-title-md text-on-surface">No tickets found</span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                            Try adjusting your filters or search keywords.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="py-space-md px-space-lg">
                          <div className="flex flex-col">
                            <span className="font-title-sm text-title-sm text-primary font-semibold hover:underline cursor-pointer">
                              {ticket.title}
                            </span>
                            <span className="text-label-sm font-label-sm text-on-surface-variant">
                              Ticket #AC-{ticket.id + 1040}
                            </span>
                          </div>
                        </td>
                        <td className="py-space-md px-space-md">
                          <div className="flex items-center gap-space-xs">
                            <div className="w-7 h-7 rounded-full bg-surface-container-high text-primary flex items-center justify-center text-label-sm font-label-sm font-semibold shrink-0">
                              {getInitials(ticket.owner)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-title-sm text-title-sm text-on-surface truncate">{ticket.owner}</span>
                              <span className="text-label-sm font-label-sm text-on-surface-variant truncate">
                                {ticket.ownerRole || 'Academic Staff'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-space-md px-space-md">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="py-space-md px-space-md">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="py-space-md px-space-md text-on-surface-variant text-body-sm font-body-sm font-medium">
                          {ticket.dueDate}
                        </td>
                        <td className="py-space-md px-space-lg text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="px-2 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-sm font-label-sm transition-colors"
                              onClick={() => handleToggleStatus(ticket.id)}
                              title="Toggle Progress"
                            >
                              {ticket.status === 'Closed' ? 'Reopen' : 'Advance'}
                            </button>
                            <button
                              className="p-1 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── VIEW 2: Lecturer At-Risk Monitor ────────────────────────────────── */}
      {effectiveTab === 'atrisk' && isLecturer && (
        <section className="flex flex-col w-full space-y-space-md" id="view-atrisk">
          {/* Urgent Alert Banner */}
          <div className="p-space-lg rounded-xl bg-error-container text-on-error-container shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-on-error flex items-center justify-center text-error shrink-0 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-title-md text-title-md text-on-error-container font-bold">
                    Urgent Milestone Interventions Required
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-error text-on-error font-semibold">
                    Triage Live
                  </span>
                </div>
                <p className="text-body-md font-body-md mt-0.5 text-on-error-container/90">
                  <strong>4 students</strong> flagged with overdue milestone submissions;{' '}
                  <strong>2 nearing critical 24h deadline</strong>. Immediate instructor or TA touchpoint recommended.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs shrink-0 self-end md:self-auto">
              <button
                className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest text-error font-title-sm text-title-sm hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-1.5"
                onClick={handleBatchReminder}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
                <span>Batch Ping Reminders</span>
              </button>
            </div>
          </div>

          {/* At-Risk Student Records Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-space-md bg-surface-container-low/50 flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="text-title-sm font-title-sm text-primary">Cohort Submissions Radar</span>
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  • Showing {atRiskStudents.length} Priority Flags
                </span>
              </div>
              <div className="flex items-center gap-space-xs text-label-sm font-label-sm text-on-surface-variant">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-error" /> Overdue
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /> &lt; 24h Left
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-secondary ml-2" /> Warning
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider">
                    <th className="py-space-sm px-space-lg">Student Profile &amp; ID</th>
                    <th className="py-space-sm px-space-md">Course &amp; Task Deliverable</th>
                    <th className="py-space-sm px-space-md">Scheduled Due Date</th>
                    <th className="py-space-sm px-space-md">Status &amp; Risk Level</th>
                    <th className="py-space-sm px-space-lg text-right">Escalation Actions</th>
                  </tr>
                </thead>
                <tbody className="text-body-md font-body-md">
                  {atRiskStudents.map((student) => (
                    <tr key={student.id} className={student.rowClass}>
                      <td className="py-space-md px-space-lg">
                        <div className="flex items-center gap-space-sm">
                          <div className={student.avatarClass}>{student.initials}</div>
                          <div className="flex flex-col">
                            <span className="font-title-sm text-title-sm text-on-surface">{student.name}</span>
                            <span className="text-label-sm font-label-sm text-on-surface-variant">
                              ID: {student.studentId} • {student.section}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col">
                          <span className="font-title-sm text-title-sm text-primary">{student.taskTitle}</span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant">{student.course}</span>
                        </div>
                      </td>
                      <td className={student.dueDateClass}>{student.dueDate}</td>
                      <td className="py-space-md px-space-md">
                        <RiskBadge student={student} />
                      </td>
                      <td className="py-space-md px-space-lg text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Email / Reminder action */}
                          {(student.actions.includes('email') || student.actions.includes('email-reminder')) && (
                            <button
                              className="px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
                              onClick={() =>
                                handleAtRiskAction(
                                  student.actions.includes('email') ? 'email' : 'email-reminder',
                                  student.name
                                )
                              }
                              title={student.actions.includes('email') ? 'Send Reminder Email' : 'Send Reminder'}
                            >
                              <EmailIcon />
                              <span>{student.actions.includes('email') ? 'Email' : 'Reminder'}</span>
                            </button>
                          )}

                          {/* Flag / Assign TA action */}
                          {student.actions.includes('flag') && (
                            <button
                              className="px-2 py-1 rounded-lg bg-error text-on-error hover:bg-red-700 text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
                              onClick={() => handleAtRiskAction('flag', student.name)}
                              title="Flag for TA Consultation"
                            >
                              <FlagIcon />
                              <span>Flag TA</span>
                            </button>
                          )}
                          {student.actions.includes('assign-ta') && (
                            <button
                              className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
                              onClick={() => handleAtRiskAction('assign-ta', student.name)}
                            >
                              <FlagIcon className="text-on-surface-variant" />
                              <span>Assign TA</span>
                            </button>
                          )}

                          {/* Check-in */}
                          {student.actions.includes('check-in') && (
                            <button
                              className="px-2 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
                              onClick={() => handleAtRiskAction('check-in', student.name)}
                            >
                              <EmailIcon />
                              <span>Check-in</span>
                            </button>
                          )}

                          {/* Activity Log */}
                          <button
                            className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
                            onClick={() => handleAtRiskAction('log', student.name)}
                            title="Activity Log"
                          >
                            <DotsIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Create Ticket Modal ─────────────────────────────────────────────── */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTicket}
      />

      {/* ── Toast Notification ──────────────────────────────────────────────── */}
      <Toast message={toastMessage} visible={toastVisible} />
      </div>
    </div>
    </Layout>
  );
}
