import React from 'react';
import { RiskBadge, EmailIcon, FlagIcon, DotsIcon } from './Badges';
import { timeAgo } from '../../api/atRisk';

export default function AtRiskRow({ student, onAction, onOpen }) {
  return (
    <tr className={student.rowClass}>
      <td className="py-space-md px-space-lg">
        <div className="flex items-center gap-space-sm">
          <div className={student.avatarClass}>{student.initials}</div>
          <div className="flex flex-col">
            <span className="font-title-sm text-title-sm text-on-surface">{student.name}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">
              {student.ticketNumber
                ? `${student.ownerRole} • Ticket ${student.ticketNumber}`
                : `ID: ${student.studentId} • ${student.section}`}
            </span>
          </div>
        </div>
      </td>
      <td className="py-space-md px-space-md">
        <div className="flex flex-col">
          <span
            onClick={onOpen}
            className="font-title-sm text-title-sm text-primary font-semibold hover:underline cursor-pointer"
            title="Open ticket details"
          >
            {student.taskTitle}
          </span>
          <span className="text-body-sm font-body-sm text-on-surface-variant">{student.course}</span>
        </div>
      </td>
      <td className={student.dueDateClass}>{student.dueDate}</td>
      <td className="py-space-md px-space-md">
        <RiskBadge student={student} />
        {student.lastReminder && (
          <div className="mt-1 text-label-sm font-label-sm text-on-surface-variant">
            {student.lastReminder.kind === 'flag' ? 'Flagged' : 'Reminded'} {timeAgo(student.lastReminder.at)} by {student.lastReminder.sentBy}
          </div>
        )}
      </td>
      <td className="py-space-md px-space-lg text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Email / Reminder action */}
          {(student.actions.includes('email') || student.actions.includes('email-reminder')) && (
            <button
              className="px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
              onClick={() =>
                onAction(
                  student.actions.includes('email') ? 'email' : 'email-reminder',
                  student
                )
              }
              title={student.actions.includes('email') ? 'Send Reminder Email' : 'Send Reminder'}
              type="button"
            >
              <EmailIcon />
              <span>{student.actions.includes('email') ? 'Email' : 'Reminder'}</span>
            </button>
          )}

          {/* Flag / Assign TA action */}
          {student.actions.includes('flag') && (
            <button
              className="px-2 py-1 rounded-lg bg-error text-on-error hover:bg-red-700 text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
              onClick={() => onAction('flag', student)}
              title="Flag for TA Consultation"
              type="button"
            >
              <FlagIcon />
              <span>Flag TA</span>
            </button>
          )}
          {student.actions.includes('assign-ta') && (
            <button
              className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
              onClick={() => onAction('assign-ta', student)}
              type="button"
            >
              <FlagIcon className="text-on-surface-variant" />
              <span>Assign TA</span>
            </button>
          )}

          {/* Check-in */}
          {student.actions.includes('check-in') && (
            <button
              className="px-2 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-body-sm font-body-sm transition-colors shadow-sm flex items-center gap-1"
              onClick={() => onAction('check-in', student)}
              type="button"
            >
              <EmailIcon />
              <span>Check-in</span>
            </button>
          )}

          {/* Activity Log */}
          <button
            className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
            onClick={onOpen}
            title="Open ticket details"
            type="button"
          >
            <DotsIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}
