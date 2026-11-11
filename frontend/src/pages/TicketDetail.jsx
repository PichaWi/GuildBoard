import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { getTicket, updateTicket as apiUpdateTicket } from '../api/tickets';
import { STAFF_OPTIONS, DEFAULTS } from '../config/appConfig';

// Same rule as the backend (src/controllers/at_risk.py):
// a ticket is at risk when it is not Closed and is due in less than 48 hours.
const AT_RISK_HOURS = 48;

// Rough progress from the status, since we do not store a real percentage.
const STATUS_PROGRESS = { Open: 0, 'In-Progress': 50, Closed: 100 };

function getTicketHealth(ticket, now = new Date()) {
  const status = ticket?.status || 'Open';
  const progress = STATUS_PROGRESS[status] ?? 0;
  const due = new Date(ticket?.dueAt || ticket?.dueDate);

  if (status === 'Closed') {
    return { atRisk: false, label: 'Closed', text: 'This task is closed, so it no longer counts toward the at-risk list.', progress };
  }
  if (Number.isNaN(due.getTime())) {
    return { atRisk: false, label: 'No due date', text: 'This task has no due date, so its risk cannot be checked.', progress };
  }

  const hoursLeft = (due - now) / (1000 * 60 * 60);
  if (hoursLeft <= 0) {
    const days = Math.ceil(-hoursLeft / 24);
    return { atRisk: true, label: 'Overdue', text: `Overdue by ${days} day${days === 1 ? '' : 's'}. It stays on the At-Risk monitor until it is closed.`, progress };
  }
  if (hoursLeft < AT_RISK_HOURS) {
    const hours = Math.floor(hoursLeft);
    return { atRisk: true, label: 'At risk', text: `Due in ${hours} hour${hours === 1 ? '' : 's'}. Tasks due within 48 hours show on the At-Risk monitor.`, progress };
  }
  const days = Math.floor(hoursLeft / 24);
  return { atRisk: false, label: 'On track', text: `Due in ${days} days. Not at risk yet.`, progress };
}

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Close Task Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // ─── Fetch Ticket Data (GET /api/tickets/:id) ──────────────────────────────
  const fetchTicketDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getTicket(id);
      setTicket(data);
      if (Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch (err) {
      console.warn(`GET /api/tickets/${id} failed:`, err.message);
      setError(err.message);
      setTicket(null);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

  // ─── Update Status Action (PATCH /api/tickets/:id) ─────────────────────────
  const updateTicketStatus = async (newStatus) => {
    try {
      await apiUpdateTicket(id, { status: newStatus });
      setTicket((prev) => ({ ...prev, status: newStatus }));

      if (newStatus === 'Closed') {
        setToast({
          visible: true,
          message: `Task #${id} closed. Redirecting to dashboard...`,
          type: 'success',
        });
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setToast({
          visible: true,
          message: `Task #${id} status changed to ${newStatus}.`,
          type: 'success',
        });
      }
    } catch (err) {
      console.warn('PATCH status error:', err.message);
      setToast({
        visible: true,
        message: 'Failed to update task status. Please try again.',
        type: 'error',
      });
    } finally {
      setIsCloseModalOpen(false);
    }
  };

  // ─── Assign User Action (PATCH /api/tickets/:id) ───────────────────────────
  const updateTicketAssignee = async (newAssignee) => {
    try {
      await apiUpdateTicket(id, { owner: newAssignee });
      setTicket((prev) => ({ ...prev, assignee: newAssignee }));

      setToast({
        visible: true,
        message: `Task assigned to ${newAssignee}.`,
        type: 'success',
      });
    } catch (err) {
      console.warn('PATCH assignee error:', err.message);
      setToast({
        visible: true,
        message: 'Failed to assign task. Please try again.',
        type: 'error',
      });
    }
  };

  // ─── Update Priority (PATCH /api/tickets/:id) ──────────────────────────────
  const updateTicketPriority = async (newPriority) => {
    try {
      await apiUpdateTicket(id, { priority: newPriority });
      setTicket((prev) => ({ ...prev, priority: newPriority }));

      setToast({
        visible: true,
        message: `Priority updated to ${newPriority}.`,
        type: 'success',
      });
    } catch (err) {
      console.warn('PATCH priority error:', err.message);
      setToast({
        visible: true,
        message: 'Failed to update task priority. Please try again.',
        type: 'error',
      });
    }
  };

  // ─── Post Comment Action (POST /api/tickets/:id/comments) ──────────────────
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmittingComment(true);

      const commentPayload = {
        text: newComment.trim(),
        isInternal: isInternalNote,
        author: user?.name || DEFAULTS.author,
        authorRole: user?.role === 'ta' ? 'Teaching Assistant' : 'Faculty Instructor',
      };

      // TODO: Backend Dev - Wire comment thread append:
      // POST /api/tickets/:id/comments
      const response = await fetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(commentPayload),
      });

      if (!response.ok) {
        throw new Error(`Failed to post comment with status ${response.status}`);
      }

      const savedComment = await response.json();
      setComments((prev) => [...prev, savedComment]);
      setNewComment('');
      setToast({
        visible: true,
        message: 'Comment posted successfully!',
        type: 'success',
      });
    } catch (err) {
      console.warn('POST comment error:', err.message);
      setToast({
        visible: true,
        message: 'Failed to post comment. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShareClick = () => {
    navigator.clipboard?.writeText(window.location.href);
    setToast({
      visible: true,
      message: 'Ticket link copied to clipboard!',
      type: 'info',
    });
  };

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <Link to="/dashboard" className="hover:text-primary transition-colors">
        Dashboard
      </Link>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span>Tasks</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span className="text-primary font-semibold">#{id}</span>
    </nav>
  );

  if (isLoading) {
    return (
      <Layout navbarLeftContent={breadcrumbs}>
        <div className="flex flex-col items-center justify-center p-space-2xl min-h-[60vh]">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin mb-2">
            progress_activity
          </span>
          <h2 className="font-title-md text-title-md text-on-surface">Loading Task #{id}...</h2>
        </div>
      </Layout>
    );
  }

  if (error && !ticket) {
    return (
      <Layout navbarLeftContent={breadcrumbs}>
        <div className="flex flex-col items-center justify-center gap-space-sm p-space-2xl min-h-[60vh] text-center">
          <span className="material-symbols-outlined text-error text-[40px]">error</span>
          <h1 className="font-headline-md text-headline-md text-error">Unable to load task</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
          <button
            type="button"
            onClick={fetchTicketDetail}
            className="mt-2 px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm"
          >
            Retry Request
          </button>
        </div>
      </Layout>
    );
  }

  const displayId = ticket?.id ? String(ticket.id).replace(/^AC-/, '') : id;
  const health = getTicketHealth(ticket);

  return (
    <Layout navbarLeftContent={breadcrumbs}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">
          {/* Header Hero */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg pb-space-md border-b border-surface-container">
            <div className="flex flex-col gap-1 max-w-4xl">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-surface-container text-primary font-bold">
                  {ticket?.course || 'ISP'}
                </span>
                <span className="font-label-sm text-label-sm text-outline">
                  Ticket #AC-{displayId}
                </span>
                <StatusBadge status={ticket?.status || 'Open'} />
                <PriorityBadge priority={ticket?.priority || 'Medium'} />
              </div>

              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
                {ticket?.title || `Task #${id}`}
              </h1>

              <div className="flex items-center gap-space-sm text-body-sm font-body-sm text-on-surface-variant flex-wrap mt-1">
                <span>Created by: {ticket?.createdBy || ticket?.creator?.name || DEFAULTS.creator}</span>
                <span>•</span>
                <span>Due Date: {ticket?.dueDate || 'Mar 24, 2025'}</span>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-space-xs shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={handleShareClick}
                className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors shadow-sm font-title-sm text-title-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">content_copy</span>
                <span>Share Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCloseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm font-title-sm text-title-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>Close Task</span>
              </button>
            </div>
          </div>

          {/* Two-Column Grid (Main ~8 cols, Sidebar ~4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* ─── LEFT COLUMN: Main Description & Comment Thread (~8 cols) ─── */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              {/* Task Description & Deliverables */}
              <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary-container text-title-md">
                      assignment
                    </span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Deliverables & Rubric Protocol
                    </h2>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wide">
                    Rubric Protocol
                  </span>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {ticket?.description}
                </p>

                {/* Deliverables Checklist */}
                {ticket?.deliverables && ticket.deliverables.length > 0 && (
                  <div className="flex flex-col gap-space-xs pt-space-xs border-t border-surface-container">
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold mb-1">
                      Checklist Items
                    </h3>
                    {ticket.deliverables.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-space-xs p-space-xs rounded-lg transition-colors ${
                          item.completed ? 'bg-surface-container-low/40' : 'bg-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">
                          {item.completed ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <div className="flex flex-col">
                          <span
                            className={`font-title-sm text-title-sm text-on-surface ${
                              item.completed ? 'line-through opacity-70' : ''
                            }`}
                          >
                            {item.text}
                          </span>
                          {item.note && (
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {item.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attached Assets */}
                {ticket?.attachments && ticket.attachments.length > 0 && (
                  <div className="flex flex-col gap-space-xs pt-space-xs border-t border-surface-container">
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold mb-1">
                      Attached Assets & Resources
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                      {ticket.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-space-sm rounded-xl bg-surface hover:bg-surface-container transition-all flex items-start gap-space-xs shadow-2xs group"
                        >
                          <div className="p-2 rounded-lg bg-surface-container text-primary">
                            <span className="material-symbols-outlined text-title-md">
                              {att.icon || 'description'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                              {att.name}
                            </span>
                            <span className="font-body-sm text-body-sm text-outline">
                              {att.size} • {att.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              {/* Placeholder Comment Thread */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary-container text-title-md">
                      forum
                    </span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Activity & Discussion
                    </h2>
                  </div>
                  <span className="text-label-sm font-label-sm text-outline">
                    {comments.length} {comments.length === 1 ? 'update' : 'updates'}
                  </span>
                </div>

                {/* Comments List */}
                <div className="flex flex-col gap-space-md">
                  {comments.length === 0 ? (
                    <div className="p-space-md text-center text-body-sm text-outline">
                      No comments posted on this task yet. Start the discussion below.
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-space-md">
                        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-title-sm text-title-sm font-bold shrink-0">
                          {c.author ? c.author.slice(0, 2).toUpperCase() : 'KU'}
                        </div>
                        <div className="flex-1 bg-surface rounded-xl p-space-md shadow-2xs border border-outline-variant/20">
                          <div className="flex flex-wrap items-center justify-between gap-space-xs mb-1">
                            <div className="flex items-center gap-space-2xs">
                              <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                                {c.author}
                              </span>
                              {c.authorRole && (
                                <span className="px-1.5 py-0.2 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                                  {c.authorRole}
                                </span>
                              )}
                              {c.isInternal && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-label-sm text-label-sm font-semibold flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[12px]">lock</span>
                                  Internal Note
                                </span>
                              )}
                            </div>
                            <span className="font-body-sm text-body-sm text-outline">
                              {c.timestamp || 'Recent'}
                            </span>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input Box */}
                <form onSubmit={handlePostComment} className="pt-space-sm border-t border-surface-container">
                  <div className="flex flex-col gap-space-xs bg-surface rounded-xl p-space-sm border border-outline-variant/30 focus-within:ring-2 focus-within:ring-primary-container">
                    <textarea
                      rows="3"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Leave a task comment, rubric feedback, or status update..."
                      className="w-full bg-transparent px-space-xs py-1 text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none resize-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1 border-t border-outline-variant/20">
                      <label className="flex items-center gap-space-2xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-primary-container accent-primary-container cursor-pointer"
                        />
                        <span className="font-body-sm text-body-sm text-on-surface-variant inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                          Internal Staff Note
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-title-sm text-title-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingComment ? 'Posting...' : 'Post Update'}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            </div>

            {/* ─── RIGHT COLUMN: Sidebar (Status Updates & Assignments) (~4 cols) ─── */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* Ticket Controls Card */}
              <aside className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-2xs border-b border-surface-container">
                  <div className="flex items-center gap-space-2xs">
                    <span className="material-symbols-outlined text-primary-container text-title-md">
                      tune
                    </span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Ticket Controls
                    </h2>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                </div>

                <div className="flex flex-col gap-space-md">
                  {/* Status Updates (Action: scaffold PATCH endpoint) */}
                  <div className="flex flex-col gap-1">
                    <label className="font-title-sm text-title-sm text-on-surface font-semibold">
                      Status Workflow
                    </label>
                    <div className="relative">
                      <select
                        value={ticket?.status || 'Open'}
                        onChange={(e) => {
                          const nextStatus = e.target.value;
                          if (nextStatus === 'Closed') {
                            setIsCloseModalOpen(true);
                          } else {
                            updateTicketStatus(nextStatus);
                          }
                        }}
                        className="w-full h-10 px-space-sm pr-space-lg bg-surface rounded-lg text-on-surface font-title-sm text-title-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer shadow-sm border border-outline-variant/30"
                      >
                        <option value="Open">Open (To Do)</option>
                        <option value="In-Progress">In-Progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-outline pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Assign Users (Action: scaffold PATCH endpoint) */}
                  <div className="flex flex-col gap-1">
                    <label className="font-title-sm text-title-sm text-on-surface font-semibold">
                      Assigned Lead
                    </label>
                    <div className="relative">
                      <select
                        value={ticket?.assignee || DEFAULTS.assignee}
                        onChange={(e) => updateTicketAssignee(e.target.value)}
                        className="w-full h-10 px-space-sm pr-space-lg bg-surface rounded-lg text-on-surface font-title-sm text-title-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer shadow-sm border border-outline-variant/30"
                      >
                        <option value="" disabled>Select assignee</option>
                        {STAFF_OPTIONS.map((staff) => (
                          <option key={staff.value} value={staff.value}>{staff.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-outline pointer-events-none">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>

                  {/* Priority Level */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-title-sm text-title-sm text-on-surface font-semibold">
                      Priority Level
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-surface rounded-lg border border-outline-variant/20">
                      {['Low', 'Medium', 'High'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateTicketPriority(p)}
                          className={`py-1 text-center font-label-md text-label-md rounded transition-colors cursor-pointer ${
                            ticket?.priority?.toLowerCase() === p.toLowerCase()
                              ? 'bg-primary-container text-on-primary font-bold shadow-2xs'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Milestone Deadline */}
                  <div className="flex flex-col gap-1">
                    <label className="font-title-sm text-title-sm text-on-surface font-semibold">
                      Milestone Deadline
                    </label>
                    <div className="p-space-xs rounded-lg bg-surface flex items-center justify-between shadow-2xs border border-outline-variant/20">
                      <div className="flex items-center gap-space-2xs">
                        <span className="material-symbols-outlined text-secondary text-title-md">
                          calendar_month
                        </span>
                        <span className="font-title-sm text-title-sm text-on-surface">
                          {ticket?.dueDate || 'Mar 24, 2025'}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-semibold">
                        Scheduled
                      </span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Cohort Impact Context (worked out from this ticket, not fixed numbers) */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm border border-outline-variant/20">
                <div className="flex items-center justify-between pb-space-2xs border-b border-surface-container">
                  <div className="flex items-center gap-space-2xs">
                    <span className={`material-symbols-outlined text-title-md ${health.atRisk ? 'text-error' : 'text-primary'}`}>
                      {health.atRisk ? 'warning' : 'check_circle'}
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">
                      Cohort Impact
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                      health.atRisk ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-primary'
                    }`}
                  >
                    {health.label}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {health.text}
                </p>
                <div className="p-space-sm rounded-xl bg-surface shadow-2xs flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface font-title-sm">Progress (from status)</span>
                    <span className="text-primary font-bold">{health.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full" style={{ width: `${health.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for "Close Task" action */}
      <ConfirmModal
        isOpen={isCloseModalOpen}
        title="Close Task Confirmation"
        subtitle={`Ticket #AC-${displayId}`}
        message={
          <p>
            Are you sure you want to close{' '}
            <strong className="text-on-surface font-bold">Ticket #{displayId}</strong>?
            This will mark the task as resolved, finalize rubric snapshots, and notify the assigned instructors.
          </p>
        }
        confirmText="Confirm & Close Task"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={() => updateTicketStatus('Closed')}
        onClose={() => setIsCloseModalOpen(false)}
      />

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </Layout>
  );
}
