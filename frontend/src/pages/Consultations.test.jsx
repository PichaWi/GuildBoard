import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Consultations from './Consultations';
import { createConsultation, getConsultations } from '../api/consultations';

vi.mock('../api/consultations', () => ({
  getConsultations: vi.fn(),
  createConsultation: vi.fn(),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const savedSession = {
  id: 1,
  studentName: 'Sarah Jenkins',
  studentId: '64010892',
  courseCode: 'ISP',
  topic: 'Architecture review',
  sessionAt: '2026-11-05T07:30:00Z',
  notes: 'Went through the diagram.',
  recordedBy: 'ta@ku.th',
};

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Student Name/), { target: { value: 'Alexei Kozlov' } });
  fireEvent.change(screen.getByLabelText(/^Topic/), { target: { value: 'SPARQL tuning' } });
  fireEvent.change(screen.getByLabelText(/Date & Time/), { target: { value: '2026-11-06T10:00' } });
}

describe('Consultations page', () => {
  beforeEach(() => {
    getConsultations.mockReset();
    createConsultation.mockReset();
    getConsultations.mockResolvedValue([savedSession]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the saved history', async () => {
    render(<Consultations />);

    expect(await screen.findByText('Architecture review')).toBeTruthy();
    expect(screen.getByText(/Sarah Jenkins \(64010892\) · ISP/)).toBeTruthy();
    expect(screen.getByText('Recorded by ta@ku.th')).toBeTruthy();
  });

  it('searches with the entered filters and says when nothing matches', async () => {
    render(<Consultations />);
    await screen.findByText('Architecture review');
    getConsultations.mockResolvedValue([]);

    fireEvent.change(screen.getByLabelText('Keyword'), { target: { value: 'docker' } });
    fireEvent.change(screen.getByLabelText('Student'), { target: { value: 'Sarah' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('No results match your search.')).toBeTruthy();
    expect(getConsultations).toHaveBeenLastCalledWith({ keyword: 'docker', student: 'Sarah', date: '2026-11-05' });
  });

  it('tells an empty log apart from a search with no results', async () => {
    getConsultations.mockResolvedValue([]);

    render(<Consultations />);

    expect(await screen.findByText('No consultation sessions have been recorded yet.')).toBeTruthy();
  });

  it('ignores an older search that answers last', async () => {
    render(<Consultations />);
    await screen.findByText('Architecture review');

    let answerSlowSearch;
    getConsultations.mockReturnValueOnce(new Promise((resolve) => { answerSlowSearch = resolve; }));
    fireEvent.change(screen.getByLabelText('Keyword'), { target: { value: 'slow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    getConsultations.mockResolvedValueOnce([{ ...savedSession, id: 2, topic: 'Fast result' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await screen.findByText('Fast result');

    answerSlowSearch([{ ...savedSession, id: 3, topic: 'Slow result' }]);
    await waitFor(() => expect(screen.queryByText('Slow result')).toBeNull());
    expect(screen.getByText('Fast result')).toBeTruthy();
  });

  it('shows a load failure with a retry instead of an empty log', async () => {
    getConsultations.mockRejectedValueOnce(new Error('Only TAs can search consultation sessions.'));

    render(<Consultations />);

    expect(await screen.findByText('Only TAs can search consultation sessions.')).toBeTruthy();
    expect(screen.queryByText('No consultation sessions have been recorded yet.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByText('Architecture review')).toBeTruthy();
  });

  it('does not save a session with a required field missing', async () => {
    render(<Consultations />);
    await screen.findByText('Architecture review');

    fireEvent.change(screen.getByLabelText(/Student Name/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Session' }));

    expect(await screen.findByText('Student name, topic and date/time are required.')).toBeTruthy();
    expect(createConsultation).not.toHaveBeenCalled();
  });

  it('saves a session, clears the form and reloads the history', async () => {
    createConsultation.mockResolvedValue({ ...savedSession, id: 2 });
    render(<Consultations />);
    await screen.findByText('Architecture review');

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Save Session' }));

    expect(await screen.findByText('Consultation session recorded.')).toBeTruthy();
    expect(createConsultation).toHaveBeenCalledWith(expect.objectContaining({
      studentName: 'Alexei Kozlov',
      topic: 'SPARQL tuning',
      sessionAt: new Date('2026-11-06T10:00').toISOString(),
    }));
    expect(screen.getByLabelText(/Student Name/).value).toBe('');
    expect(getConsultations).toHaveBeenCalledTimes(2);
  });

  it('keeps the draft after a failed save and allows retry', async () => {
    createConsultation.mockRejectedValueOnce(new Error('Server unavailable'));
    createConsultation.mockResolvedValueOnce({ ...savedSession, id: 2 });
    render(<Consultations />);
    await screen.findByText('Architecture review');

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Save Session' }));

    expect(await screen.findByText('Server unavailable')).toBeTruthy();
    expect(screen.getByLabelText(/Student Name/).value).toBe('Alexei Kozlov');

    fireEvent.click(screen.getByRole('button', { name: 'Save Session' }));
    expect(await screen.findByText('Consultation session recorded.')).toBeTruthy();
  });
});
