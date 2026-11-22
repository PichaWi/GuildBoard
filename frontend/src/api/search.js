/**
 * Search service module - full-text search across tickets, events, materials.
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { INITIAL_TICKETS as mockTickets } from '../mock/operationsData.jsx';
import { calendarEvents as mockEvents } from '../mock/calendarData';
import { INITIAL_MATERIALS as mockMaterials } from '../mock/materialsData.jsx';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function mapBackendSearchResult(data) {
  const results = data.results || [];
  return {
    tasks: results
      .filter(r => r.type === 'ticket')
      .map(t => ({
        id: t.id,
        title: t.title,
        description: '',
        course: '',
        priority: t.status === 'Open' ? 'High' : 'Medium',
        status: t.status,
        dueDate: t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        owner: t.owner,
        ownerRole: 'TA',
      })),
    events: results
      .filter(r => r.type === 'event')
      .map(e => ({
        id: e.id,
        title: e.title,
        course: '',
        date: e.date,
        time: '',
        location: '',
        speaker: e.owner,
        type: e.type,
      })),
    materials: results
      .filter(r => r.type === 'material')
      .map(m => ({
        id: m.id,
        title: m.title,
        course: '',
        date: m.date,
      })),
  };
}

function mapMockMaterials(materials) {
  return materials.map(m => ({
    id: m.id,
    title: m.title,
    course: m.course,
    date: m.created_at || m.publishedDate,
    description: m.description,
    fileType: m.fileType,
    fileSize: m.fileSize,
  }));
}

export async function search(query, filters = {}) {
  if (!query?.trim()) {
    return { tasks: [], events: [], materials: [] };
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
    const filteredMaterials = mockMaterials.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.course.toLowerCase().includes(q) ||
      m.module?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    );
    const start = filters.offset || 0;
    const end = start + (filters.limit || 50);
    return {
      tasks: filteredTickets.slice(start, end),
      events: filteredEvents.slice(start, end),
      materials: mapMockMaterials(filteredMaterials.slice(start, end)),
    };
  }

  const params = new URLSearchParams();
  params.append('q', query);
  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.owner) params.append('owner', filters.owner);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const data = await api.get(`/search?${params.toString()}`);
  return mapBackendSearchResult(data);
}