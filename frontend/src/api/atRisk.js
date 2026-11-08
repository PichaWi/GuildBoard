/**
 * At-Risk service module - cohort risk telemetry (US-4).
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { AT_RISK_STUDENTS as mockAtRisk } from '../mock/operationsData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function mapBackendAtRiskItem(item) {
  // Backend returns: id, title, description, owner, owner_role, priority, status, due_at, created_by, created_at, updated_at, risk_type, hours_until_due
  // Frontend expects: id, initials, name, studentId, section, taskTitle, course, dueDate, dueDateClass, rowClass, avatarClass, riskType, riskDays/hoursLeft, actions
  const now = new Date();
  const dueDate = item.due_at ? new Date(item.due_at) : now;
  const isOverdue = item.risk_type === 'overdue';
  const hoursLeft = item.hours_until_due;

  return {
    id: item.id,
    initials: item.owner ? item.owner.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : 'ST',
    name: item.owner || 'Student',
    ticketNumber: `#AC-${item.id + 1040}`,
    ownerRole: item.owner_role || 'Owner',
    taskTitle: item.title,
    course: '', // Not in backend model
    dueDate: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    dueDateClass: isOverdue ? 'py-space-md px-space-md font-medium text-red-950' : 'py-space-md px-space-md font-medium text-amber-950',
    rowClass: isOverdue ? 'bg-red-50/80 hover:bg-red-100/70 transition-colors' : 'bg-amber-50/80 hover:bg-amber-100/70 transition-colors',
    avatarClass: isOverdue
      ? 'w-9 h-9 rounded-full bg-red-200 text-red-900 font-title-sm text-title-sm flex items-center justify-center shrink-0'
      : 'w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-title-sm text-title-sm flex items-center justify-center shrink-0',
    riskType: item.risk_type || (isOverdue ? 'overdue' : 'nearing'),
    riskDays: isOverdue ? Math.ceil(Math.abs(hoursLeft) / 24) : undefined,
    hoursLeft: !isOverdue ? Math.max(0, hoursLeft) : undefined,
    actions: isOverdue ? ['email', 'flag', 'log'] : ['email-reminder', 'assign-ta', 'log'],
  };
}

export async function getAtRisk() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return mockAtRisk;
  }

  const data = await api.get('/at-risk');
  // Backend returns: { count, overdue, nearing, items: [...] }
  if (data && Array.isArray(data.items)) {
    return data.items.map(mapBackendAtRiskItem);
  }
  return [];
}