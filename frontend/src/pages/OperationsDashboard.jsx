import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { INITIAL_SUMMARY_CARDS, INITIAL_TICKETS, AT_RISK_STUDENTS } from '../mock/operationsData';
import OperationsTabs from '../components/operations/OperationsTabs';
import KPICards from '../components/operations/KPICards';
import TicketRow from '../components/operations/TicketRow';
import AtRiskRow from '../components/operations/AtRiskRow';
import CreateTicketModal from '../components/operations/CreateTicketModal';
import Toast from '../components/operations/Toast';

export default function OperationsDashboard() {
  const { user } = useAuth();
  const userRole = String(user?.role || 'lecturer').toLowerCase();

  // Tab state: 'tickets' | 'atrisk'
  const [activeTab, setActiveTab] = useState('tickets');

  // If user is TA, keep activeTab on 'tickets'
  useEffect(() => {
    if (userRole === 'ta' && activeTab !== 'tickets') {
      setActiveTab('tickets');
    }
  }, [userRole, activeTab]);

  const isLecturer = ['lecturer', 'admin'].includes(userRole);
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
            <OperationsTabs
              effectiveTab={effectiveTab}
              isLecturer={isLecturer}
              ticketCount={filteredTickets.length}
              atRiskCount={atRiskStudents.length}
              onTabChange={setActiveTab}
            />
          </div>

          {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
          <KPICards cards={displayCards} />

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
                  className="flex items-center justify-center gap-space-xs px-space-md h-[38px] rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm shadow-sm transition-all duration-150 shrink-0 cursor-pointer"
                  onClick={() => setIsModalOpen(true)}
                  type="button"
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
                          <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            onToggleStatus={handleToggleStatus}
                            onDeleteTicket={handleDeleteTicket}
                          />
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
                    className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest text-error font-title-sm text-title-sm hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                    onClick={handleBatchReminder}
                    type="button"
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
                        <AtRiskRow
                          key={student.id}
                          student={student}
                          onAction={handleAtRiskAction}
                        />
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
