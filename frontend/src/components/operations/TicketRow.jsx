import React from 'react';
import { getInitials, PriorityBadge, StatusBadge } from './Badges';

export default function TicketRow({ ticket, onToggleStatus, onDeleteTicket }) {
  return (
    <tr className="hover:bg-surface-container-low/60 transition-colors">
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
            onClick={() => onToggleStatus(ticket.id)}
            title="Toggle Progress"
            type="button"
          >
            {ticket.status === 'Closed' ? 'Reopen' : 'Advance'}
          </button>
          <button
            className="p-1 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
            onClick={() => onDeleteTicket(ticket.id)}
            title="Delete"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
