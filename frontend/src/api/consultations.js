/**
 * Consultations service module - TA consultation sessions (US-9).
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Mock consultation data
const mockConsultations = [
  {
    id: 1,
    studentName: 'Sarah Jenkins',
    studentId: '64010892',
    courseCode: 'ISP',
    topic: 'Architecture Review - Service Mesh Config',
    sessionAt: '2026-10-20T14:30:00Z',
    notes: 'Discussed missing Istio sidecar injection in deployment manifests. Student to update Helm charts.',
    recordedBy: 'Alex Chen (TA)',
    createdAt: '2026-10-19',
  },
  {
    id: 2,
    studentName: 'Alexei Kozlov',
    studentId: '64010915',
    courseCode: 'KE',
    topic: 'RDF Triplestore Performance Tuning',
    sessionAt: '2026-10-18T10:00:00Z',
    notes: 'Reviewed SPARQL query optimization. Recommended using property paths instead of multiple OPTIONAL patterns.',
    recordedBy: 'Alex Chen (TA)',
    createdAt: '2026-10-17',
  },
  {
    id: 3,
    studentName: 'Mayuree Prasert',
    studentId: '64010344',
    courseCode: 'FM',
    topic: 'Formal Verification Essay Structure',
    sessionAt: '2026-10-22T09:00:00Z',
    notes: 'Outlined essay structure for TLA+ specification verification. Provided LaTeX template.',
    recordedBy: 'Aj. Pajee',
    createdAt: '2026-10-21',
  },
];

function mapBackendConsultation(c) {
  return {
    id: c.id,
    studentName: c.student_name,
    studentId: c.student_id,
    courseCode: c.course_code,
    topic: c.topic,
    sessionAt: c.session_at,
    notes: c.notes,
    recordedBy: c.recorded_by,
    createdAt: c.created_at,
  };
}

function mapFrontendConsultationToBackend(c) {
  return {
    student_name: c.studentName,
    student_id: c.studentId || '',
    course_code: c.courseCode || '',
    topic: c.topic,
    session_at: c.sessionAt,
    notes: c.notes || '',
  };
}

function sessionDateInThailand(sessionAt) {
  return new Date(sessionAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

function filterMockConsultations({ keyword, student, date }) {
  const includes = (value, term) => value.toLowerCase().includes(term.trim().toLowerCase());
  return mockConsultations.filter((c) => (
    (!keyword?.trim() || [c.topic, c.notes, c.courseCode].some(value => includes(value, keyword)))
    && (!student?.trim() || [c.studentName, c.studentId].some(value => includes(value, student)))
    && (!date || sessionDateInThailand(c.sessionAt) === date)
  )).sort((a, b) => new Date(b.sessionAt) - new Date(a.sessionAt));
}

export async function getConsultations({ keyword, student, date } = {}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return filterMockConsultations({ keyword, student, date });
  }

  const params = new URLSearchParams();
  if (keyword?.trim()) params.set('q', keyword.trim());
  if (student?.trim()) params.set('student', student.trim());
  if (date) params.set('date', date);
  const query = params.toString();

  const data = await api.get(query ? `/consultations?${query}` : '/consultations');
  return Array.isArray(data) ? data.map(mapBackendConsultation) : [];
}

export async function createConsultation(consultationData) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const newConsultation = {
      id: Date.now(),
      ...consultationData,
      recordedBy: 'Current User', // Would come from auth
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockConsultations.unshift(newConsultation);
    return newConsultation;
  }

  const data = await api.post('/consultations', mapFrontendConsultationToBackend(consultationData));
  return mapBackendConsultation(data);
}
