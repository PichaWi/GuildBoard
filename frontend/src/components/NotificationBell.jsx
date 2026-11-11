import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../api/notifications';

const SEEN_KEY = 'guildboard_seen_notifications';

const KIND_STYLE = {
  overdue: { icon: 'error', className: 'text-error' },
  nearing: { icon: 'schedule', className: 'text-amber-700' },
  event: { icon: 'event', className: 'text-primary' },
};

function readSeen() {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveSeen(ids) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    // The badge still clears for this visit.
  }
}

function plural(count, unit) {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

export function describeWhen(item, now = new Date()) {
  const at = new Date(item.at);
  if (item.kind === 'event') {
    return at.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZone: 'Asia/Bangkok',
    });
  }

  const hours = Math.floor(Math.abs(at - now) / 3600000);
  const length = hours >= 48 ? plural(Math.floor(hours / 24), 'day') : hours >= 1 ? plural(hours, 'hour') : 'less than an hour';
  return item.kind === 'overdue' ? `Overdue by ${length}` : `Due in ${length}`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [seen, setSeen] = useState(readSeen);
  const container = useRef(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setIsLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      if (request !== latestRequest.current) return null;
      setItems(data);
      return data;
    } catch (err) {
      if (request === latestRequest.current) setError(err.message || 'Notifications could not be loaded.');
      return null;
    } finally {
      if (request === latestRequest.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (e) => {
      if (!container.current?.contains(e.target)) setIsOpen(false);
    };
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const markSeen = (data) => {
    // Keeping only current ids stops the saved list from growing forever.
    const ids = data.map(item => item.id);
    setSeen(ids);
    saveSeen(ids);
  };

  const toggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    const data = await load();
    if (data) markSeen(data);
  };

  const open = (item) => {
    setIsOpen(false);
    navigate(item.link);
  };

  const unseen = items.filter(item => !seen.includes(item.id)).length;
  const label = unseen > 0 ? `Notifications, ${unseen} new` : 'Notifications';

  return (
    <div className="relative" ref={container}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={label}
        className="relative p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
        onClick={toggle}
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unseen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[11px] font-semibold flex items-center justify-center">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant/30 z-50"
        >
          <h2 className="px-space-md py-space-sm font-title-sm text-title-sm text-primary font-semibold border-b border-outline-variant/20">
            Notifications
          </h2>

          {isLoading && items.length === 0 && (
            <p className="p-space-md font-body-sm text-body-sm text-on-surface-variant">Loading...</p>
          )}

          {error && (
            <div className="p-space-md" role="alert">
              <p className="font-body-sm text-body-sm text-error mb-space-xs">{error}</p>
              <button className="font-label-md text-label-md text-primary font-semibold cursor-pointer" onClick={load} type="button">
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <p className="p-space-md font-body-sm text-body-sm text-on-surface-variant">
              You're all caught up. Nothing is due in the next 7 days.
            </p>
          )}

          {!error && items.length > 0 && (
            <ul>
              {items.map((item) => {
                const style = KIND_STYLE[item.kind] || KIND_STYLE.event;
                return (
                  <li key={item.id}>
                    <button
                      className="w-full text-left px-space-md py-space-sm flex items-start gap-space-sm hover:bg-surface-container-low transition-colors cursor-pointer"
                      onClick={() => open(item)}
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${style.className}`}>{style.icon}</span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-title-sm text-title-sm text-on-surface">{item.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{item.detail}</span>
                        <span className={`font-label-sm text-label-sm ${item.kind === 'event' ? 'text-on-surface-variant' : style.className}`}>
                          {describeWhen(item)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
