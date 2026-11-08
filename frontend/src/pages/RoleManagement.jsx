import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { getUsers, updateUserRole as apiUpdateUserRole } from '../api/users';

export default function RoleManagement() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Updating user state indicator
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // ─── Fetch Users (GET /api/users) ──────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('GET /api/users failed:', err.message);
      setError(err.message);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Update User Role Action (PUT/PATCH /api/users/:id/role) ──────────────
  const updateUserRole = async (userId, newRole) => {
    const targetUser = users.find((u) => u.id === userId || u._id === userId);
    const userName = targetUser?.name || 'User';

    try {
      setUpdatingUserId(userId);

      await apiUpdateUserRole(userId, newRole);

      // Update state locally
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId || u._id === userId ? { ...u, role: newRole } : u))
      );

      setToast({
        visible: true,
        message: `${userName}'s role updated to ${newRole} successfully!`,
        type: 'success',
      });
    } catch (err) {
      console.warn(`PATCH /api/users/${userId}/role error:`, err.message);
      setToast({
        visible: true,
        message: `Failed to update ${userName}'s role. Please try again.`,
        type: 'error',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ─── Search & Filtering ───────────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role?.toLowerCase() !== roleFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = u.name?.toLowerCase().includes(q);
      const matchesEmail = u.email?.toLowerCase().includes(q);
      const matchesDept = u.department?.toLowerCase().includes(q);
      return matchesName || matchesEmail || matchesDept;
    }
    return true;
  });

  // Role Statistics Calculation
  const studentCount = users.filter((u) => u.role?.toLowerCase() === 'student').length;
  const taCount = users.filter((u) => u.role?.toLowerCase() === 'ta').length;
  const lecturerCount = users.filter((u) => u.role?.toLowerCase() === 'lecturer').length;
  const adminCount = users.filter((u) => u.role?.toLowerCase() === 'admin').length;

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span>Academix</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span>Administration</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span className="text-primary font-semibold">Role Management</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={breadcrumbs}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mb-space-xl">
            <div className="flex flex-col max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label-sm text-label-sm tracking-wider uppercase text-secondary font-semibold">
                  Administration • Multi-Role System
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  KU SSO Live
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight font-bold">
                Role &amp; Access Control
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-2xs">
                Manage institutional privileges across @ku.th domain credentials with real-time access updates.
              </p>
            </div>

            <div className="flex items-center gap-space-sm shrink-0">
              <button
                type="button"
                onClick={fetchUsers}
                className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-sm font-title-sm text-title-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">refresh</span>
                <span>Refresh Users</span>
              </button>
            </div>
          </div>

          {/* Role Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center text-headline-md font-bold shrink-0">
                <span className="material-symbols-outlined text-[26px]">school</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-xl text-headline-xl text-on-surface font-semibold leading-tight">
                  {studentCount}
                </span>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  Students
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-headline-md font-bold shrink-0">
                <span className="material-symbols-outlined text-[26px]">support_agent</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-xl text-headline-xl text-on-surface font-semibold leading-tight">
                  {taCount}
                </span>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  Teaching Assistants
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-headline-md font-bold shrink-0">
                <span className="material-symbols-outlined text-[26px]">co_present</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-xl text-headline-xl text-on-surface font-semibold leading-tight">
                  {lecturerCount}
                </span>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  Lecturers / Faculty
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-headline-md font-bold shrink-0">
                <span className="material-symbols-outlined text-[26px]">shield_person</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-xl text-headline-xl text-on-surface font-semibold leading-tight">
                  {adminCount}
                </span>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  Administrators
                </span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-xl">
            {/* Table Controls Header */}
            <div className="p-space-md border-b border-surface-container flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, email, or department..."
                  className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="flex items-center gap-space-xs">
                <label className="text-label-sm font-label-sm text-on-surface-variant">Filter Role:</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 px-3 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="TA">TA</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider">
                    <th className="py-space-sm px-space-lg font-semibold">Institutional User</th>
                    <th className="py-space-sm px-space-md font-semibold">KU Credentials</th>
                    <th className="py-space-sm px-space-md font-semibold">Department &amp; Program</th>
                    <th className="py-space-sm px-space-md font-semibold">Assigned Role</th>
                    <th className="py-space-sm px-space-md font-semibold">Security &amp; SSO</th>
                    <th className="py-space-sm px-space-md font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-md font-body-md divide-y divide-surface-container-low">
                  {isLoading && (
                    <tr>
                      <td colSpan="6" className="py-space-2xl text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">
                            progress_activity
                          </span>
                          <span className="text-title-sm font-title-sm text-on-surface">Loading user directory...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && error && users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-space-2xl text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-error text-[36px]">error</span>
                          <span className="text-title-md font-title-md text-error">Unable to load users</span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant max-w-md">
                            {error} - Ensure the backend database endpoint GET /api/users is configured.
                          </span>
                          <button
                            type="button"
                            onClick={fetchUsers}
                            className="mt-2 px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-title-sm text-title-sm"
                          >
                            Retry Request
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-space-2xl text-center">
                        <div className="flex flex-col items-center justify-center p-space-xl">
                          <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2">
                            person_off
                          </span>
                          <span className="text-title-md font-title-md text-on-surface font-semibold">
                            No users found
                          </span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                            Try adjusting your search criteria or role filters.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    filteredUsers.map((u) => {
                      const id = u.id || u._id;
                      const isUpdating = updatingUserId === id;
                      const initials = (u.name || 'User')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr key={id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-space-md px-space-lg">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-title-sm text-title-sm font-bold shrink-0">
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">
                                  {u.name}
                                </span>
                                <span className="text-label-sm font-label-sm text-outline">
                                  ID: {id ? String(id).slice(-8) : 'KU-USER'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-primary">
                              <span className="material-symbols-outlined text-[16px] text-outline">mail</span>
                              <span>{u.email || `${u.name?.toLowerCase().replace(/\s+/g, '.')}@ku.th`}</span>
                            </div>
                            <span className="text-label-sm font-label-sm text-outline">Institutional Identity</span>
                          </td>

                          <td className="py-space-md px-space-md">
                            <span className="font-title-sm text-title-sm text-on-surface">
                              {u.department || 'Computer Science'}
                            </span>
                            <span className="block text-label-sm font-label-sm text-outline">Faculty of Science</span>
                          </td>

                          {/* Role Dropdown Selector */}
                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <select
                                value={u.role || 'Student'}
                                disabled={isUpdating}
                                onChange={(e) => updateUserRole(id, e.target.value)}
                                className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-title-sm font-title-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
                              >
                                <option value="Student">Student</option>
                                <option value="TA">TA</option>
                                <option value="Lecturer">Lecturer</option>
                                <option value="Admin">Admin</option>
                              </select>
                              {isUpdating && (
                                <span className="material-symbols-outlined text-primary text-[16px] animate-spin">
                                  progress_activity
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-secondary-container/50 text-on-secondary-container text-label-sm font-label-sm">
                              <span className="w-2 h-2 rounded-full bg-secondary" />
                              <span>KU 2FA Enforced</span>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap text-on-surface-variant font-label-md text-label-md">
                            <span className="text-on-surface font-medium">
                              {u.lastActive || 'Active today'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </Layout>
  );
}
