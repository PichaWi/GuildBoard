import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), isLoading: false }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>
  );
}

describe('Login help links', () => {
  afterEach(() => {
    cleanup();
  });

  it('"Forgot?" shows how to reset the password', () => {
    renderPage();
    expect(screen.queryByText('Forgot your password?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Forgot?' }));

    expect(screen.getByText('Forgot your password?')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open Google account recovery' }).getAttribute('href'))
      .toBe('https://accounts.google.com/signin/recovery');
  });

  it('"Need help?" shows sign-in tips and can be closed', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Need help?' }));
    expect(screen.getByText('Trouble signing in?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close help' }));
    expect(screen.queryByText('Trouble signing in?')).toBeNull();
  });

  it('clicking the same link again closes the panel', () => {
    renderPage();
    const forgot = screen.getByRole('button', { name: 'Forgot?' });

    fireEvent.click(forgot);
    fireEvent.click(forgot);

    expect(screen.queryByText('Forgot your password?')).toBeNull();
  });

  it('the help buttons do not submit the login form', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Forgot?' }));
    expect(screen.queryByText('Please enter valid credentials.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Forgot?' }).getAttribute('type')).toBe('button');
  });
});
