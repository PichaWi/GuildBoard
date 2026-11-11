import React, { useState } from 'react';
import { DEFAULTS } from '../config/appConfig';

export function getInitials(name) {
  const words = String(name || '').replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function UserAvatar({ user, className = 'w-8 h-8' }) {
  // Remembering which URL failed means a new picture gets its own chance to load.
  const [failedPicture, setFailedPicture] = useState(null);
  const picture = user?.picture;
  const name = user?.name || DEFAULTS.profileName;

  if (picture && failedPicture !== picture) {
    return (
      <img
        alt={name}
        className={`${className} rounded-full object-cover shrink-0`}
        onError={() => setFailedPicture(picture)}
        referrerPolicy="no-referrer"
        src={picture}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`${className} rounded-full shrink-0 flex items-center justify-center bg-primary-container text-on-primary font-label-md text-label-md font-semibold select-none`}
      role="img"
    >
      {getInitials(user?.name)}
    </span>
  );
}
