/**
 * Users service module - user management operations (Role Management).
 * Uses mock data when VITE_USE_MOCK=true, otherwise calls real backend endpoints.
 */
import { api } from './client';
import { MOCK_USERS } from '../mock/authData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function mapBackendUser(u) {
  // Backend returns: id, name, email, role, department, status, last_active, sso_verified
  // Frontend expects: id, name, email, role, department, status, lastActive, ssoVerified
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department || 'Computer Science',
    status: u.status || 'Active',
    lastActive: u.last_active || 'Active today',
    ssoVerified: u.sso_verified ?? true,
  };
}

function mapFrontendUserToBackend(user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
  };
}

export async function getUsers() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    // Return users with additional fields for RoleManagement display
    return MOCK_USERS.map(u => ({
      ...mapBackendUser(u),
      id: u.id,
    }));
  }

  const data = await api.get('/users');
  return Array.isArray(data) ? data.map(mapBackendUser) : [];
}

export async function updateUserRole(userId, newRole) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const idx = MOCK_USERS.findIndex(u => u.id === parseInt(userId, 10));
    if (idx === -1) throw new Error(`User ${userId} not found`);
    MOCK_USERS[idx] = { ...MOCK_USERS[idx], role: newRole };
    return mapBackendUser(MOCK_USERS[idx]);
  }

  const data = await api.patch(`/users/${userId}/role`, { role: newRole });
  return mapBackendUser(data);
}

export async function createUser(userData) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const newUser = {
      id: Date.now(),
      ...userData,
      sso_verified: true,
      last_active: 'Never',
      status: 'Active',
    };
    MOCK_USERS.push(newUser);
    return mapBackendUser(newUser);
  }

  const payload = mapFrontendUserToBackend(userData);
  const data = await api.post('/users', payload);
  return mapBackendUser(data);
}

export async function deleteUser(userId) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 150));
    const idx = MOCK_USERS.findIndex(u => u.id === parseInt(userId, 10));
    if (idx === -1) throw new Error(`User ${userId} not found`);
    MOCK_USERS.splice(idx, 1);
    return { success: true };
  }

  await api.delete(`/users/${userId}`);
  return { success: true };
}