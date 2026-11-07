import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from './Badge';
import { DEFAULTS } from '../../config/appConfig';

function getInitials(name) {
  if (!name) return '??';
  return name
    .replace(/Aj\.\s*/g, '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export default function TicketRow({
  ticket,
  onStatusChange,
  onToggleStatus,
  onDelete,
  as = 'tr',
}) {
  const navigate = useNavigate();
  const ticketId = ticket._id || ticket.id || '';
  const displayId = ticket.identifier || (typeof ticketId === 'number' ? `AC-${ticketId + 1040}` : (ticketId ? `AC-${String(ticketId).slice(-4)}` : 'AC-1041'));
  const title = ticket.title || 'Untitled Task';
  const owner = ticket.owner || ticket.createdBy?.name || ticket.assignedTo || DEFAULTS.author;
  const ownerRole = ticket.ownerRole || ticket.role || DEFAULTS.ownerRole;
  const priority = ticket.priority || 'Medium';
  const status = ticket.status || 'Open';
  const dueDate = ticket.dueDate || ticket.createdAt ? new Date(ticket.dueDate || ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Mar 28, 2025';
  const course = ticket.course || 'ISP';

  const handleRowClick = () => {
    if (ticketId) {
      navigate(`/tasks/${ticketId}`);
    }
  };

  if (as === 'div') {
    return (
      <div className="grid grid-cols-12 px-space-lg py-space-md items-center hover:bg-surface-container-low/60 transition-colors group cursor-pointer border-b border-surface-container-low/60 last:border-b-0" onClick={handleRowClick}>
        <div className="col-span-12 sm:col-span-5 flex items-start gap-space-sm min-w-0 pr-space-md">
          <div className="w-2 h-2 rounded-full bg-secondary-fixed-dim mt-2 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors truncate font-semibold">
                {title}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-outline font-label-sm text-label-sm">
                #{displayId}
              </span>
            </div>
            {ticket.description && (
              <span className="font-body-sm text-body-sm text-outline truncate mt-0.5">
                {ticket.description}
              </span>
            )}
          </div>
        </div>

        <div className="col-span-6 sm:col-span-2 flex flex-col mt-2 sm:mt-0">
          <div className="flex items-center gap-space-xs">
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
              {course}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface truncate">
              {owner}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-outline">{ownerRole}</span>
        </div>

        <div className="col-span-6 sm:col-span-2 flex items-center gap-space-xs mt-2 sm:mt-0">
          <PriorityBadge priority={priority} />
          <StatusBadge status={status} />
        </div>

        <div className="col-span-6 sm:col-span-1 flex flex-col mt-2 sm:mt-0">
          <span className="font-body-sm text-body-sm font-medium text-on-surface">{dueDate}</span>
        </div>

        <div className="col-span-6 sm:col-span-2 flex items-center justify-end gap-space-xs mt-2 sm:mt-0" onClick={(e) => e.stopPropagation()}>
          {onToggleStatus && (
            <button
              className="px-space-sm py-1 rounded-md bg-surface-container-high hover:bg-surface-container text-primary font-label-md text-label-md transition-colors cursor-pointer"
              onClick={() => onToggleStatus(ticketId)}
            >
              {status === 'Closed' ? 'Reopen' : 'Advance'}
            </button>
          )}
          <button
            className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            onClick={handleRowClick}
            title="Open Details"
          >
            <span className="material-symbols-outlined text-lg">open_in_new</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-surface-container-low/60 transition-colors group">
      <td className="py-space-md px-space-lg">
        <div className="flex flex-col">
          <span
            className="font-title-sm text-title-sm text-primary font-semibold hover:underline cursor-pointer"
            onClick={handleRowClick}
          >
            {title}
          </span>
          <span className="text-label-sm font-label-sm text-on-surface-variant">
            Ticket #{displayId}
          </span>
        </div>
      </td>
      <td className="py-space-md px-space-md">
        <div className="flex items-center gap-space-xs">
          <div className="w-7 h-7 rounded-full bg-surface-container-high text-primary flex items-center justify-center text-label-sm font-label-sm font-semibold shrink-0">
            {getInitials(owner)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title-sm text-title-sm text-on-surface truncate">{owner}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant truncate">
              {ownerRole}
            </span>
          </div>
        </div>
      </td>
      <td className="py-space-md px-space-md">
        <PriorityBadge priority={priority} />
      </td>
      <td className="py-space-md px-space-md">
        <StatusBadge status={status} />
      </td>
      <td className="py-space-md px-space-md text-on-surface-variant text-body-sm font-body-sm font-medium">
        {dueDate}
      </td>
      <td className="py-space-md px-space-lg text-right">
        <div className="flex items-center justify-end gap-1">
          {onStatusChange ? (
            <select
              value={status}
              onChange={(e) => onStatusChange(ticketId, e.target.value)}
              className="h-[30px] px-2 rounded-lg bg-surface-container-low text-on-surface text-label-sm font-label-sm focus:outline-none cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="Open">Open</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          ) : onToggleStatus ? (
            <button
              className="px-2 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-sm font-label-sm transition-colors cursor-pointer"
              onClick={() => onToggleStatus(ticketId)}
              title="Toggle Progress"
            >
              {status === 'Closed' ? 'Reopen' : 'Advance'}
            </button>
          ) : null}

          <button
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
            onClick={handleRowClick}
            title="View Task Details"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>

          {onDelete && (
            <button
              className="p-1 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors cursor-pointer"
              onClick={() => onDelete(ticketId)}
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

