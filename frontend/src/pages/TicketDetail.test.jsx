import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TicketDetail from './TicketDetail';
import { getTicket, updateTicket } from '../api/tickets';

vi.mock('../api/tickets', () => ({
  getTicket: vi.fn(),
  updateTicket: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test Lecturer', role: 'lecturer' } }),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const ticket = {
  id: 42,
  title: 'Review milestone submission',
  description: 'Check the submitted work.',
  course: 'ISP',
  priority: 'Medium',
  status: 'Open',
  dueDate: 'Nov 10, 2026',
  assignee: 'Aj. Hutchathai',
  createdBy: 'Course Admin',
  deliverables: [],
  attachments: [],
  comments: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tickets/42']}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TicketDetail failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTicket.mockResolvedValue(ticket);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps the saved status after a failed update and allows retry', async () => {
    updateTicket
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce({ ...ticket, status: 'In-Progress' });
    renderPage();

    await screen.findByRole('heading', { name: ticket.title });
    expect(screen.queryByRole('option', { name: 'Resolved' })).toBeNull();
    const statusSelect = screen.getAllByRole('combobox')[0];

    fireEvent.change(statusSelect, { target: { value: 'In-Progress' } });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Failed to update task status. Please try again.'
      );
    });
    expect(statusSelect.value).toBe('Open');

    fireEvent.change(statusSelect, { target: { value: 'In-Progress' } });

    await waitFor(() => expect(statusSelect.value).toBe('In-Progress'));
    expect(screen.getByRole('alert').textContent).toContain(
      'Task #42 status changed to In-Progress.'
    );
  });

  it.each([
    {
      field: 'assignee',
      change: () => fireEvent.change(screen.getAllByRole('combobox')[1], {
        target: { value: 'Aj. Milk' },
      }),
      errorMessage: 'Failed to assign task. Please try again.',
      expectUnchanged: () => expect(screen.getAllByRole('combobox')[1].value).toBe('Aj. Hutchathai'),
    },
    {
      field: 'priority',
      change: () => fireEvent.click(screen.getByRole('button', { name: 'High' })),
      errorMessage: 'Failed to update task priority. Please try again.',
      expectUnchanged: () => {
        expect(screen.getByText('Medium', { selector: 'span' })).not.toBeNull();
        expect(screen.queryByText('High', { selector: 'span' })).toBeNull();
      },
    },
  ])('keeps the saved $field after a failed update', async ({ change, errorMessage, expectUnchanged }) => {
    updateTicket.mockRejectedValueOnce(new Error('Service unavailable'));
    renderPage();

    await screen.findByRole('heading', { name: ticket.title });
    change();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(errorMessage);
    });
    expectUnchanged();
  });

  it('keeps a failed comment draft and allows retry', async () => {
    const savedComment = {
      id: 9,
      text: 'Server-confirmed comment',
      author: 'Test Lecturer',
      authorRole: 'Faculty Instructor',
      timestamp: 'Just now',
    };
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => savedComment });
    renderPage();

    await screen.findByRole('heading', { name: ticket.title });
    const draft = 'Please review this submission.';
    const commentInput = screen.getByPlaceholderText(/Leave a task comment/);
    fireEvent.change(commentInput, { target: { value: draft } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Update' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Failed to post comment. Please try again.'
      );
    });
    expect(commentInput.value).toBe(draft);
    expect(screen.getByText('0 updates')).not.toBeNull();
    expect(screen.queryByText(draft, { selector: 'p' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Post Update' }));

    expect(await screen.findByText(savedComment.text)).not.toBeNull();
    expect(commentInput.value).toBe('');
    expect(screen.getByText('1 update')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Comment posted successfully!');
  });

  it('shows an error state instead of a fabricated ticket when loading fails', async () => {
    getTicket.mockRejectedValueOnce(new Error('Ticket service unavailable'));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Unable to load task' })).not.toBeNull();
    expect(screen.getByText('Ticket service unavailable')).not.toBeNull();
    expect(screen.queryByText(/Milestone Code Review & Architecture Rubric/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry Request' })).not.toBeNull();
  });
});

describe('TicketDetail cohort impact panel', () => {
  const hoursFromNow = (h) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    { name: 'a normal ticket due in 5 days', change: { dueAt: hoursFromNow(5 * 24) }, label: 'On track' },
    { name: 'a ticket due within 48 hours', change: { dueAt: hoursFromNow(10) }, label: 'At risk' },
    { name: 'an overdue ticket', change: { dueAt: hoursFromNow(-30) }, label: 'Overdue' },
    { name: 'a closed ticket even if overdue', change: { status: 'Closed', dueAt: hoursFromNow(-30) }, label: 'Closed' },
  ])('shows "$label" for $name', async ({ change, label }) => {
    getTicket.mockResolvedValue({ ...ticket, ...change });
    renderPage();

    const heading = await screen.findByRole('heading', { name: 'Cohort Impact' });
    const panel = heading.closest('.rounded-xl');
    expect(within(panel).getByText(label)).toBeTruthy();
    // the old fake numbers should be gone
    expect(screen.queryByText(/24 student engineering teams/)).toBeNull();
  });

  it('works out progress from the status', async () => {
    getTicket.mockResolvedValue({ ...ticket, status: 'In-Progress', dueAt: hoursFromNow(5 * 24) });
    renderPage();

    await screen.findByRole('heading', { name: 'Cohort Impact' });
    expect(screen.getByText('50%')).toBeTruthy();
  });
});
