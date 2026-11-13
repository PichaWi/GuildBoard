import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const backendTicket = {
  id: 17,
  title: 'Review architecture rubric',
  description: 'Check service boundaries.',
  owner: 'Alex Chen',
  owner_role: 'Teaching Assistant',
  priority: 'High',
  status: 'Open',
  due_at: '2026-10-28T10:00:00Z',
  created_by: 'lecturer@ku.th',
  created_at: '2026-10-20T08:00:00Z',
  updated_at: '2026-10-20T08:00:00Z',
}

describe('tickets API', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCK', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('maps the ticket list for frontend display', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([backendTicket]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    const { getTickets } = await import('./tickets')

    await expect(getTickets()).resolves.toEqual([
      expect.objectContaining({
        id: 17, title: 'Review architecture rubric', ownerRole: 'Teaching Assistant',
        dueDate: 'Oct 28, 2026', assignee: 'Alex Chen', createdBy: 'lecturer@ku.th',
        dueAt: '2026-10-28T10:00:00Z',
      }),
    ])
  })

  it('gets one ticket from the existing list endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify([backendTicket]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const { getTicket } = await import('./tickets')

    await expect(getTicket('17')).resolves.toEqual(expect.objectContaining({
      id: 17, description: 'Check service boundaries.', ownerRole: 'Teaching Assistant',
    }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/tickets')
  })

  it('throws an actual 404 when a ticket is absent from the list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([backendTicket]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    const { getTicket } = await import('./tickets')

    await expect(getTicket('999')).rejects.toMatchObject({
      message: 'Ticket 999 not found',
      status: 404,
    })
  })
})
