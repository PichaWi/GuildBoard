/**
 * Auth service module - session management and dev login.
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const MOCK_USERS = {
  student: { role: 'student', name: 'Natthaphol Meekhun', email: 'student@ku.th', id: 'demo-student' },
  ta: { role: 'ta', name: 'Alex Chen (TA)', email: 'ta@ku.th', id: 'demo-ta' },
  lecturer: { role: 'lecturer', name: 'Dr. Ryan Gosling', email: 'lecturer@ku.th', id: 'demo-lecturer' },
  admin: { role: 'admin', name: 'Prof. Alex Kim (Admin)', email: 'admin@ku.th', id: 'demo-admin' },
};

function mapBackendUser(data) {
  // Backend returns: id, name, role (UserRole enum: Student, Lecturer, TA, Admin), auth_mode
  // Frontend expects: role (lowercase), name, email, id
  const roleMap = {
    Student: 'student',
    Lecturer: 'lecturer',
    TA: 'ta',
    Admin: 'admin',
  };
  return {
    id: data.id,
    role: roleMap[data.role] || 'student',
    name: data.name,
    email: data.email || `${roleMap[data.role] || 'user'}@ku.th`,
  };
}

export async function getMe() {
  if (USE_MOCK) {
    // Return the mock user from localStorage or default
    await new Promise(r => setTimeout(r, 50));
    const saved = localStorage.getItem('guildboard_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_USERS.student;
      }
    }
    return MOCK_USERS.student;
  }

  const data = await api.get('/auth/me');
  return mapBackendUser(data);
}

export async function devLogin(email, password) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    // Simple mock: check email for role
    const lowerEmail = email.toLowerCase();
    let role = 'student';
    if (lowerEmail.includes('admin')) role = 'admin';
    else if (lowerEmail.includes('aj.') || lowerEmail.includes('lecturer') || lowerEmail.includes('faculty')) role = 'lecturer';
    else if (lowerEmail.includes('ta')) role = 'ta';
    return MOCK_USERS[role];
  }

  const data = await api.post('/auth/dev-login', { email, password });
  return mapBackendUser(data);
}

export async function logout() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 50));
    return { ok: true };
  }

  await api.post('/auth/logout', {});
  return { ok: true };
}