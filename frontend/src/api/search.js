/**
 * Search service module - full-text search across tasks, events, materials.
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { INITIAL_TICKETS as mockTickets } from '../mock/operationsData.jsx';
import { calendarEvents as mockEvents } from '../mock/calendarData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function mapBackendSearchResult(data) {
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      course: t.course || '',
      priority: t.priority,
      status: t.status,
      dueDate: t.due_at ? new Date(t.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      owner: t.owner,
      ownerRole: t.owner_role,
    })) : [],
    events: Array.isArray(data.events) ? data.events.map(e => ({
      id: e.id,
      title: e.title,
      course: e.course_code,
      date: e.event_date,
      time: `${e.start_time} - ${e.end_time}`,
      location: e.location,
      speaker: e.instructor,
      type: e.event_type,
    })) : [],
  };
}

export async function search(query) {
  if (!query?.trim()) {
    return { tasks: [], events: [] };
  }

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 150));
    const q = query.toLowerCase();
    const filteredTickets = mockTickets.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.owner.toLowerCase().includes(q)
    );
    const filteredEvents = mockEvents.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.course.toLowerCase().includes(q) ||
      e.instructor.toLowerCase().includes(q)
    );
    return {
      tasks: filteredTickets,
      events: filteredEvents,
    };
  }

  const data = await api.get(`/search?q=${encodeURIComponent(query)}`);
  return mapBackendSearchResult(data);
}