import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import UserAvatar, { getInitials } from './UserAvatar';

const PICTURE = 'https://lh3.googleusercontent.com/a/photo=s96-c';

describe('UserAvatar', () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the user's own picture", () => {
    render(<UserAvatar user={{ name: 'Navin Bunthuphanich', picture: PICTURE }} />);

    const image = screen.getByRole('img', { name: 'Navin Bunthuphanich' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe(PICTURE);
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('shows initials when there is no picture', () => {
    render(<UserAvatar user={{ name: 'Demo Lecturer' }} />);

    const avatar = screen.getByRole('img', { name: 'Demo Lecturer' });
    expect(avatar.tagName).toBe('SPAN');
    expect(avatar.textContent).toBe('DL');
  });

  it('falls back to initials when the picture fails to load', () => {
    render(<UserAvatar user={{ name: 'Navin Bunthuphanich', picture: PICTURE }} />);

    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByRole('img', { name: 'Navin Bunthuphanich' }).textContent).toBe('NB');
  });

  it('tries again when the user gets a different picture', () => {
    const { rerender } = render(<UserAvatar user={{ name: 'Navin B', picture: PICTURE }} />);
    fireEvent.error(screen.getByRole('img'));

    rerender(<UserAvatar user={{ name: 'Navin B', picture: `${PICTURE}-new` }} />);

    expect(screen.getByRole('img').getAttribute('src')).toBe(`${PICTURE}-new`);
  });

  it('never shows a stock photo for a signed-out user', () => {
    render(<UserAvatar user={null} />);

    const avatar = screen.getByRole('img', { name: 'User' });
    expect(avatar.tagName).toBe('SPAN');
    expect(avatar.textContent).toBe('?');
  });
});

describe('getInitials', () => {
  it.each([
    ['Navin Bunthuphanich', 'NB'],
    ['Alex Chen (TA)', 'AC'],
    ['Prof. Alex Kim (Admin)', 'PK'],
    ['navin.b@ku.th', 'NA'],
    ['  ', '?'],
    [undefined, '?'],
  ])('%s -> %s', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
