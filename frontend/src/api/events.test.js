import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const calendarEvent = {
  id: 41,
  title: 'Architecture Review',
  course: 'ISP',
  date: '2026-10-20',
  type: 'Lab',
  time: '9:00 AM - 12:00 PM',
  location: 'E11S601',
  instructor: 'Aj. Suwichak',
  description: 'Review clean architecture boundaries.',
  colorClass: 'bg-primary-container',
  isRich: true,
  isPublished: true,
}

describe('events API', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCK', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads the event envelope and preserves every calendar display field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ count: 1, events: [calendarEvent] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    const { getEvents } = await import('./events')

    await expect(getEvents()).resolves.toEqual([calendarEvent])
  })

  it('sends snake_case create fields and maps EventRead to the calendar shape', async () => {
    const created = {
      id: 42,
      title: 'Ontology Workshop',
      course_code: 'KE',
      event_type: 'Workshop',
      event_date: '2026-10-24',
      start_time: '13:00:00',
      end_time: '15:00:00',
      location: 'E11S602',
      instructor: 'Aj. Hutchathai',
      description: 'Property paths',
      publish_immediately: true,
      notify_email: false,
      created_by_role: 'Lecturer',
      created_at: '2026-10-01T08:00:00Z',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(created),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const { createEvent } = await import('./events')

    const result = await createEvent({
      title: 'Ontology Workshop', courseCode: 'KE', type: 'Workshop', date: '2026-10-24',
      startTime: '13:00', endTime: '15:00', location: 'E11S602',
      instructor: 'Aj. Hutchathai', description: 'Property paths',
      publishImmediately: true, notifyEmail: false,
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      course_code: 'KE', event_type: 'Workshop', event_date: '2026-10-24',
      start_time: '13:00', end_time: '15:00', publish_immediately: true, notify_email: false,
    })
    expect(result).toMatchObject({
      id: 42, course: 'KE', type: 'Workshop', date: '2026-10-24',
      time: '13:00:00 - 15:00:00', location: 'E11S602', instructor: 'Aj. Hutchathai',
    })
  })

  it('keeps the generated id when creating an event in mock mode', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    vi.resetModules()
    const { createEvent } = await import('./events')

    const created = await createEvent({
      title: 'Mock Event', courseCode: 'ISP', type: 'Lab', date: '2026-10-30',
      startTime: '09:00', endTime: '10:00', location: '', instructor: '',
    })

    expect(created.id).toEqual(expect.any(Number))
  })
})
