import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from './client'

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefixes API paths, sends cookies, and returns JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/events')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }))
  })

  it('throws the backend detail from a JSON error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: 'Authentication required.' }),
      { status: 401, statusText: 'Unauthorized', headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(apiFetch('/tickets')).rejects.toMatchObject({
      message: 'Authentication required.',
      status: 401,
      response: { detail: 'Authentication required.' },
    })
  })

  it('throws a plain-text backend error instead of hiding it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      'Service temporarily unavailable',
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } },
    )))

    await expect(apiFetch('/events')).rejects.toMatchObject({
      message: 'Service temporarily unavailable',
      status: 503,
      response: 'Service temporarily unavailable',
    })
  })
})
