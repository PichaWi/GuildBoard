import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Calendar from './Calendar';
import { getEvents } from '../api/events';

vi.mock('../api/events', () => ({
  getEvents: vi.fn(),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

// put both events on today so they show up in the month view
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const events = [
  { id: 1, title: 'ISP Architecture Review', course: 'ISP', type: 'Project Milestone', date: today, time: '09:00 - 12:00', instructor: 'Aj. Milk' },
  { id: 2, title: 'KE Logic Lab', course: 'KE', type: 'Lab Session', date: today, time: '13:00 - 15:00', instructor: 'Aj. Milk' },
];

describe('Calendar filter button', () => {
  beforeEach(() => {
    getEvents.mockResolvedValue(events);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('opens a list of event types from the loaded events', async () => {
    render(<Calendar />);
    fireEvent.click(await screen.findByRole('button', { name: /filter/i }));

    expect(screen.getByLabelText('Project Milestone')).toBeTruthy();
    expect(screen.getByLabelText('Lab Session')).toBeTruthy();
  });

  it('hides events of a type when it is unticked', async () => {
    render(<Calendar />);
    await screen.findAllByText('KE Logic Lab');

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByLabelText('Lab Session'));

    expect(screen.queryAllByText('KE Logic Lab')).toHaveLength(0);
    expect(screen.getAllByText('ISP Architecture Review').length).toBeGreaterThan(0);

    // "Show all" brings it back
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getAllByText('KE Logic Lab').length).toBeGreaterThan(0);
  });
});
