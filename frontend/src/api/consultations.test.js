import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const backendSession = {
  id: 7,
  student_name: 'Sarah Jenkins',
  student_id: '64010892',
  course_code: 'ISP',
  topic: 'Architecture review',
  session_at: '2026-11-05T07:30:00Z',
  notes: 'Went through the diagram.',
  recorded_by: 'ta@ku.th',
  created_at: '2026-11-05T08:00:00Z',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('consultations API', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCK', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('maps the backend fields for display', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([backendSession])))
    const { getConsultations } = await import('./consultations')

    await expect(getConsultations()).resolves.toEqual([
      expect.objectContaining({
        id: 7, studentName: 'Sarah Jenkins', studentId: '64010892', courseCode: 'ISP',
        sessionAt: '2026-11-05T07:30:00Z', recordedBy: 'ta@ku.th',
      }),
    ])
  })

  it('sends only the filters that were filled in', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const { getConsultations } = await import('./consultations')

    await getConsultations({ keyword: ' docker & ci ', student: '  ', date: '2026-11-05' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/consultations?q=docker+%26+ci&date=2026-11-05')
  })

  it('reports a failed search instead of returning an empty history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Only TAs can search consultation sessions.' }, 403)))
    const { getConsultations } = await import('./consultations')

    await expect(getConsultations()).rejects.toMatchObject({
      message: 'Only TAs can search consultation sessions.',
      status: 403,
    })
  })

  it('posts the backend field names and maps the saved session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendSession, 201))
    vi.stubGlobal('fetch', fetchMock)
    const { createConsultation } = await import('./consultations')

    const saved = await createConsultation({
      studentName: 'Sarah Jenkins', studentId: '', courseCode: 'ISP', topic: 'Architecture review',
      sessionAt: '2026-11-05T07:30:00.000Z', notes: '',
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      student_name: 'Sarah Jenkins', student_id: '', course_code: 'ISP', topic: 'Architecture review',
      session_at: '2026-11-05T07:30:00.000Z', notes: '',
    })
    expect(saved).toEqual(expect.objectContaining({ id: 7, recordedBy: 'ta@ku.th' }))
  })

  it('filters the mock history by keyword, student and date', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const { getConsultations } = await import('./consultations')

    const byKeyword = await getConsultations({ keyword: 'sparql' })
    const byStudent = await getConsultations({ student: '64010344' })
    const byDate = await getConsultations({ date: '2026-10-20' })

    expect(byKeyword.map(c => c.id)).toEqual([2])
    expect(byStudent.map(c => c.id)).toEqual([3])
    expect(byDate.map(c => c.id)).toEqual([1])
  })
})
