import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreateTicketModal from './CreateTicketModal';

describe('CreateTicketModal', () => {
  afterEach(cleanup);

  it('includes the entered notes in the saved ticket description', () => {
    const onSave = vi.fn();
    render(<CreateTicketModal isOpen onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'Browser-created ticket' },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Owner/), {
      target: { value: 'Aj. Milk' },
    });
    fireEvent.change(screen.getByLabelText(/Description & Rubric Notes/), {
      target: { value: 'Notes entered through the browser' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Ticket/ }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].description).toBe('Notes entered through the browser');
  });
});
