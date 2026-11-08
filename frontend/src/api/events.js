/**
 * Events service module - course calendar events.
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { calendarEvents as mockEvents } from '../mock/calendarData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function mapBackendEvent(e) {
  // Backend returns: id, title, course_code, event_type, event_date, start_time, end_time, location, instructor, description, publish_immediately, notify_email, created_by_role, created_at
  // Frontend expects: id, title, course, type, date, time, location, instructor, description, publishImmediately, notifyEmail
  return {
    id: e.id,
    title: e.title,
    course: e.course_code,
    type: e.event_type,
    date: e.event_date,
    time: `${e.start_time} - ${e.end_time}`,
    location: e.location,
    instructor: e.instructor,
    description: e.description,
    publishImmediately: e.publish_immediately,
    notifyEmail: e.notify_email,
  };
}

function mapFrontendEventToBackend(event) {
  // Frontend: title, courseCode, type, date, startTime, endTime, location, instructor, description, publishImmediately, notifyEmail
  // Backend: title, course_code, event_type, event_date, start_time, end_time, location, instructor, description, publish_immediately, notify_email
  const [startTime, endTime] = (event.time || event.startTime + ' - ' + event.endTime).split(' - ');
  return {
    title: event.title,
    course_code: event.courseCode || event.course,
    event_type: event.type || event.event_type,
    event_date: event.date || event.event_date,
    start_time: event.startTime || startTime,
    end_time: event.endTime || endTime,
    location: event.location,
    instructor: event.instructor,
    description: event.description || '',
    publish_immediately: event.publishImmediately ?? true,
    notify_email: event.notifyEmail ?? false,
  };
}

export async function getEvents() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return mockEvents;
  }

  const data = await api.get('/events');
  return Array.isArray(data) ? data.map(mapBackendEvent) : [];
}

export async function createEvent(eventData) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const newEvent = {
      id: Date.now(),
      ...mapBackendEvent(mapFrontendEventToBackend(eventData)),
    };
    mockEvents.unshift(newEvent);
    return newEvent;
  }

  const payload = mapFrontendEventToBackend(eventData);
  const data = await api.post('/events', payload);
  return mapBackendEvent(data);
}