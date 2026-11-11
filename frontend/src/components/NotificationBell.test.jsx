import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationBell, { describeWhen } from './NotificationBell';
import { getNotifications } from '../api/notifications';

const navigate = vi.fn();

vi.mock('../api/notifications', () => ({ getNotifications: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const overdue = { id: 'ticket-4-overdue', kind: 'overdue', title: 'Essay feedback', detail: 'Owner: Aj. Pajee', at: '2026-11-08T01:00:00+00:00', link: '/tasks/4' };
const event = { id: 'event-2', kind: 'event', title: 'Architecture Review', detail: 'ISP · Project Milestone', at: '2026-11-11T13:30:00+07:00', link: '/calendar' };

async function openBell() {
  fireEvent.click(await screen.findByRole('button', { name: /^Notifications/ }));
}

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockReset();
    getNotifications.mockReset();
    getNotifications.mockResolvedValue([overdue, event]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows how many notifications are new before it is opened', async () => {
    render(<NotificationBell />);

    expect(await screen.findByRole('button', { name: 'Notifications, 2 new' })).toBeTruthy();
    expect(screen.queryByText('Essay feedback')).toBeNull();
  });

  it('lists the notifications when clicked', async () => {
    render(<NotificationBell />);
    await openBell();

    expect(await screen.findByText('Essay feedback')).toBeTruthy();
    expect(screen.getByText('Owner: Aj. Pajee')).toBeTruthy();
    expect(screen.getByText('Architecture Review')).toBeTruthy();
    expect(screen.getByText('Wed, Nov 11, 1:30 PM')).toBeTruthy();
  });

  it('clears the badge once opened and keeps it cleared after a reload', async () => {
    const first = render(<NotificationBell />);
    await screen.findByRole('button', { name: 'Notifications, 2 new' });
    await openBell();
    await screen.findByText('Essay feedback');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy());
    first.unmount();

    render(<NotificationBell />);

    await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  });

  it('counts only what arrived since the bell was last opened', async () => {
    localStorage.setItem('guildboard_seen_notifications', JSON.stringify(['ticket-4-overdue']));

    render(<NotificationBell />);

    expect(await screen.findByRole('button', { name: 'Notifications, 1 new' })).toBeTruthy();
  });

  it('opens the ticket or calendar a notification is about', async () => {
    render(<NotificationBell />);
    await openBell();

    fireEvent.click(await screen.findByText('Essay feedback'));

    expect(navigate).toHaveBeenCalledWith('/tasks/4');
    expect(screen.queryByText('Architecture Review')).toBeNull();
  });

  it('says so when there is nothing to show', async () => {
    getNotifications.mockResolvedValue([]);
    render(<NotificationBell />);
    await openBell();

    expect(await screen.findByText(/all caught up/)).toBeTruthy();
  });

  it('shows a failure with a retry instead of an empty list', async () => {
    getNotifications.mockRejectedValue(new Error('Server unavailable'));
    render(<NotificationBell />);
    await openBell();

    expect(await screen.findByText('Server unavailable')).toBeTruthy();
    expect(screen.queryByText(/all caught up/)).toBeNull();

    getNotifications.mockResolvedValue([event]);
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByText('Architecture Review')).toBeTruthy();
  });

  it('does not mark anything as seen when loading fails', async () => {
    render(<NotificationBell />);
    await screen.findByRole('button', { name: 'Notifications, 2 new' });
    getNotifications.mockRejectedValue(new Error('Server unavailable'));

    await openBell();
    await screen.findByText('Server unavailable');

    expect(screen.getByRole('button', { name: 'Notifications, 2 new' })).toBeTruthy();
    expect(localStorage.getItem('guildboard_seen_notifications')).toBeNull();
  });

  it('closes on Escape and on a click outside', async () => {
    render(<div><NotificationBell /><p>elsewhere</p></div>);
    await openBell();
    await screen.findByText('Essay feedback');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Essay feedback')).toBeNull();

    await openBell();
    await screen.findByText('Essay feedback');
    fireEvent.mouseDown(screen.getByText('elsewhere'));
    expect(screen.queryByText('Essay feedback')).toBeNull();
  });

  it('still works when saved data is unreadable', async () => {
    localStorage.setItem('guildboard_seen_notifications', '{not json');

    render(<NotificationBell />);

    expect(await screen.findByRole('button', { name: 'Notifications, 2 new' })).toBeTruthy();
  });
});

describe('describeWhen', () => {
  const now = new Date('2026-11-09T03:00:00Z');

  it.each([
    ['overdue', '2026-11-08T01:00:00Z', 'Overdue by 26 hours'],
    ['overdue', '2026-11-06T03:00:00Z', 'Overdue by 3 days'],
    ['overdue', '2026-11-09T02:30:00Z', 'Overdue by less than an hour'],
    ['nearing', '2026-11-09T04:30:00Z', 'Due in 1 hour'],
    ['nearing', '2026-11-11T02:00:00Z', 'Due in 47 hours'],
  ])('%s at %s -> %s', (kind, at, expected) => {
    expect(describeWhen({ kind, at }, now)).toBe(expected);
  });
});
