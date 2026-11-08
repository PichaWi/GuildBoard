import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('auth API', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCK', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uses an email-shaped backend id as the current user email', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: 'student@ku.th', name: 'Student One', role: 'Student', auth_mode: 'google' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    const { getMe } = await import('./auth')

    await expect(getMe()).resolves.toEqual({
      id: 'student@ku.th', name: 'Student One', role: 'student', email: 'student@ku.th',
    })
  })

  it('does not invent a placeholder email for a non-email id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: 'demo-student', name: 'Demo Student', role: 'Student', auth_mode: 'dev' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    const { getMe } = await import('./auth')

    await expect(getMe()).resolves.toEqual({
      id: 'demo-student', name: 'Demo Student', role: 'student', email: undefined,
    })
  })

  it('posts logout to the root auth route and accepts an HTML response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      '<!doctype html><title>GuildBoard</title>',
      { status: 303, headers: { 'Content-Type': 'text/html' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const { logout } = await import('./auth')

    await expect(logout()).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })
})
