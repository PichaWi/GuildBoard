import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';

const ALL_NAV_ITEMS = [
  { to: '/dashboard',        icon: 'dashboard',       label: 'Dashboard',        roles: ['ta', 'lecturer', 'admin'] },
  { to: '/calendar',         icon: 'calendar_month',  label: 'Course Calendar',  roles: ['student', 'ta', 'lecturer', 'admin'] },
  { to: '/course-materials', icon: 'auto_stories',    label: 'Course Materials', roles: ['student', 'ta', 'lecturer', 'admin'] },
  { to: '/create-event',     icon: 'add_circle',      label: 'Create Event',     roles: ['ta', 'lecturer', 'admin'] },
  { to: '/settings',         icon: 'settings',        label: 'Settings',         roles: ['student', 'ta', 'lecturer', 'admin'] },
];

function getRoleLabel(role) {
  const r = String(role || '').toLowerCase();
  switch (r) {
    case 'lecturer': return 'Faculty Instructor';
    case 'ta':       return 'Teaching Assistant';
    case 'admin':    return 'Administrator';
    case 'student':  return 'Student';
    default:         return 'User';
  }
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const userRole = String(user?.role || 'student').toLowerCase();

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-surface-container-lowest border-r border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-space-md flex items-center gap-space-xs border-b border-outline-variant/20">
          <img alt="GuildBoard Logo" className="h-8 w-auto object-contain" src={logoUrl} />
          <span className="font-title-md text-title-md text-primary tracking-tight font-bold">
            GuildBoard
          </span>
        </div>

        {/* Section Label */}
        <div className="px-space-md pt-space-md">
          <span className="px-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Academic Nav
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="px-space-xs py-space-xs space-y-space-2xs">
          {visibleNavItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl font-title-sm text-title-sm transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-space-sm border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex items-center gap-space-sm px-space-xs py-space-xs bg-surface-container-low rounded-xl">
          <img
            alt={user?.name || 'User'}
            className="w-8 h-8 rounded-full object-cover shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxRy36P-7hrtg5rnMsquzIJr9xNgbyWo17nUsTvltNY2EnocyWX_L3hiLUagVjHUDqz5eXOYnnd9QRvALGoz-PabZNtgfiR5ROapqzP_nDpgJuOZ3bSO6Q0I9Dh5AYKknn4wQsUgGXjG8UNr4Q_rTNui0QSotJN2oKVBrvZNzDG0nqJpwx7gEI7WuXUXz-qM2VQPYo7N4HkEF0uwczljR4bW1aWIhdi8qPjwRIVnmWeRqQPwwbJ63H"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-title-sm text-title-sm text-on-surface truncate">
              {user?.name || 'User'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {getRoleLabel(userRole)}
            </span>
            {user?.email ? (
              <span className="text-[11px] text-on-surface-variant/80 truncate">
                {user.email}
              </span>
            ) : null}
          </div>
          <button 
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors shrink-0" 
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => logout()}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
