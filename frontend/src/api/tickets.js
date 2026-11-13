/**
 * Tickets service module - operations for teaching-task tickets (US-3).
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { INITIAL_TICKETS as mockTickets } from '../mock/operationsData.jsx';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function mapBackendTicket(t) {
  // Backend returns: id, title, description, owner, owner_role, priority, status, due_at, created_by, created_at, updated_at
  // Frontend expects: id, title, owner, ownerRole, priority, status, dueDate
  return {
    id: t.id,
    title: t.title,
    description: t.description || '',
    owner: t.owner,
    ownerRole: t.owner_role,
    priority: t.priority,
    status: t.status,
    dueDate: t.due_at ? new Date(t.due_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }) : '',
    dueAt: t.due_at || '', // raw date + time, needed to work out the 48h at-risk rule
    // Additional fields for TicketDetail
    course: '', // Not in backend model yet
    assignee: t.owner,
    assigneeRole: t.owner_role,
    createdBy: t.created_by,
    createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('en-US') : '',
    deliverables: [],
    attachments: [],
    comments: [],
  };
}

function mapFrontendTicketToBackend(ticket) {
  // Frontend creates: title, owner, ownerRole, priority, status, dueDate
  // Backend expects: title, description, owner, owner_role, priority, status, due_at
  return {
    title: ticket.title,
    description: ticket.description || '',
    owner: ticket.owner,
    owner_role: ticket.ownerRole || 'Faculty Instructor',
    priority: ticket.priority,
    status: ticket.status,
    due_at: ticket.dueDate ? new Date(ticket.dueDate).toISOString() : new Date().toISOString(),
  };
}

export async function getTickets(statusFilter) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100)); // Simulate network delay
    let tickets = [...mockTickets];
    if (statusFilter && statusFilter !== 'All') {
      tickets = tickets.filter(t => t.status === statusFilter);
    }
    return tickets;
  }

  const path = statusFilter && statusFilter !== 'All' ? `/tickets?status=${statusFilter}` : '/tickets';
  const data = await api.get(path);
  return Array.isArray(data) ? data.map(mapBackendTicket) : [];
}

export async function getTicket(id) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    const ticket = mockTickets.find(t => t.id === parseInt(id, 10));
    if (!ticket) throw new Error(`Ticket ${id} not found`);
    // mock tickets only have dueDate (no due_at), so keep it or the page shows no due date
    return { ...mapBackendTicket(ticket), dueDate: ticket.dueDate, description: 'Mock description for ticket ' + id };
  }

  // The backend exposes ticket detail through GET /tickets only, so reuse the
  // already-mapped list and avoid inventing an unsupported detail endpoint.
  const tickets = await getTickets();
  const ticket = tickets.find(item => String(item.id) === String(id));
  if (!ticket) {
    const error = new Error(`Ticket ${id} not found`);
    error.status = 404;
    throw error;
  }
  return ticket;
}

export async function createTicket(ticketData) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const newTicket = {
      id: Date.now(),
      ...ticketData,
      ownerRole: ticketData.ownerRole || 'Faculty Instructor',
      dueDate: ticketData.dueDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    mockTickets.unshift(newTicket); // Add to front for demo
    return newTicket;
  }

  const payload = mapFrontendTicketToBackend(ticketData);
  const data = await api.post('/tickets', payload);
  return mapBackendTicket(data);
}

export async function updateTicket(id, updates) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 150));
    const idx = mockTickets.findIndex(t => t.id === parseInt(id, 10));
    if (idx === -1) throw new Error(`Ticket ${id} not found`);
    mockTickets[idx] = { ...mockTickets[idx], ...updates };
    return mockTickets[idx];
  }

  const data = await api.patch(`/tickets/${id}`, updates);
  return mapBackendTicket(data);
}
