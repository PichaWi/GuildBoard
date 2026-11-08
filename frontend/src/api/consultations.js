/**
 * Consultations service module - TA consultation sessions (US-9).
 * Currently uses mock data only - backend endpoints not yet implemented.
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

export async function getConsultations() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return mockConsultations;
  }

  // Backend endpoint not yet implemented
  try {
    const data = await api.get('/consultations');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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

  // Backend endpoint not yet implemented
  const data = await api.post('/consultations', consultationData);
  return data;
}