import React from 'react';

const FORM_OWNERS = [
  { value: 'Dr. Ryan Gosling', label: 'Dr. Ryan Gosling (Faculty)' },
  { value: 'Aj. Hutchathai', label: 'Aj. Hutchathai' },
  { value: 'Aj. Tem', label: 'Aj. Tem' },
  { value: 'Aj. Pajee', label: 'Aj. Pajee' },
  { value: 'Aj. Milk', label: 'Aj. Milk' },
  { value: 'Alex Chen (TA)', label: 'Alex Chen (TA)' },
];

export default function CreateTicketModal({ isOpen, onClose, onSave }) {
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
