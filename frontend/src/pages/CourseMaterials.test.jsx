import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CourseMaterials from './CourseMaterials';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test Lecturer', role: 'lecturer' } }),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const existingMaterial = {
  id: 1,
  title: 'Existing Material',
  description: 'Already saved material.',
  course: 'ISP',
  module: 'Week 01',
  category: 'slides',
  fileType: 'zip',
  fileSize: '1 MB',
  publishedDate: 'Nov 1, 2026',
  downloadCount: 0,
  author: 'Course Admin',
  authorRole: 'Lecturer',
};

describe('CourseMaterials failure handling', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [existingMaterial] })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...existingMaterial, id: 2, title: 'Retry Notes' }),
      });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps saved materials unchanged after a failed upload and allows retry', async () => {
    render(<CourseMaterials />);

    await screen.findByText(existingMaterial.title);
    fireEvent.click(screen.getByRole('button', { name: /Upload Material/ }));

    const file = new File(['course notes'], 'retry-notes.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    const titleInput = screen.getByPlaceholderText(/ISP_Milestone2/);
    fireEvent.change(titleInput, {
      target: { value: 'Retry Notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Publish Material/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Failed to upload "Retry Notes". Please try again.'
      );
    });
    expect(screen.getByText('Showing').parentElement.textContent).toContain('1');
    expect(titleInput.value).toBe('Retry Notes');

    fireEvent.click(screen.getByRole('button', { name: /Publish Material/ }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/ISP_Milestone2/)).toBeNull();
    });
    expect(screen.getByText('Retry Notes')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'Material "Retry Notes" uploaded successfully!'
    );
  });
});
