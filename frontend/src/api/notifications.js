/**
 * Notifications service module - what needs the signed-in user's attention.
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { calendarEvents as mockEvents } from '../mock/calendarData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const UPCOMING_EVENT_DAYS = 7;

function mockNotifications() {
  const today = new Date().toLocaleDateString('en-CA');
  const last = new Date(Date.now() + UPCOMING_EVENT_DAYS * 86400000).toLocaleDateString('en-CA');
  return mockEvents
    .filter(event => event.date >= today && event.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(event => ({
      id: `event-${event.id}`,
      kind: 'event',
      title: event.title,
      detail: `${event.course} · ${event.type}`,
      at: `${event.date}T09:00:00+07:00`,
      link: '/calendar',
    }));
}

export async function getNotifications() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return mockNotifications();
  }

  const data = await api.get('/notifications');
  return Array.isArray(data?.items) ? data.items : [];
}
