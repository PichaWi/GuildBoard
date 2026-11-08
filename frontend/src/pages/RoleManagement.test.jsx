import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RoleManagement from './RoleManagement';
import { getUsers, updateUserRole } from '../api/users';

vi.mock('../api/users', () => ({
  getUsers: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const user = {
  id: 7,
  name: 'Alice Example',
  email: 'alice@ku.th',
  role: 'Student',
  department: 'Computer Science',
  status: 'Active',
  lastActive: 'Active today',
  ssoVerified: true,
};

describe('RoleManagement failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsers.mockResolvedValue([user]);
  });

  afterEach(cleanup);

  it('keeps the saved role after a failed update and allows retry', async () => {
    updateUserRole
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce({ ...user, role: 'TA' });
    render(<RoleManagement />);

    const row = (await screen.findByText(user.name)).closest('tr');
    const roleSelect = within(row).getByRole('combobox');

    fireEvent.change(roleSelect, { target: { value: 'TA' } });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        "Failed to update Alice Example's role. Please try again."
      );
    });
    expect(roleSelect.value).toBe('Student');

    fireEvent.change(roleSelect, { target: { value: 'TA' } });

    await waitFor(() => expect(roleSelect.value).toBe('TA'));
    expect(screen.getByRole('alert').textContent).toContain(
      "Alice Example's role updated to TA successfully!"
    );
  });
});
