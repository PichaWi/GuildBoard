import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('notifications API', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCK', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns the items from the backend', async () => {
    const item = { id: 'ticket-4-overdue', kind: 'overdue', title: 'Essay feedback', detail: 'Owner: Aj. Pajee', at: '2026-11-08T01:00:00+00:00', link: '/tasks/4' }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ count: 1, items: [item] }))
    vi.stubGlobal('fetch', fetchMock)
    const { getNotifications } = await import('./notifications')

    await expect(getNotifications()).resolves.toEqual([item])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/notifications')
  })

  it('reports a failure instead of pretending there is nothing new', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Authentication required.' }, 401)))
    const { getNotifications } = await import('./notifications')

    await expect(getNotifications()).rejects.toMatchObject({ message: 'Authentication required.', status: 401 })
  })

  it('builds mock notifications from events in the next 7 days', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-10T03:00:00Z'))
    const { getNotifications } = await import('./notifications')

    const items = await getNotifications()

    expect(items.map(item => item.id)).toEqual(['event-8'])
    expect(items[0]).toMatchObject({ kind: 'event', link: '/calendar', detail: 'ISP · Project Milestone' })
  })
})
