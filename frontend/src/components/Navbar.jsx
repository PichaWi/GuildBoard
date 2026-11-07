import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ leftContent }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-title-sm font-title-sm transition-all ${
      isActive
        ? 'bg-primary-container text-on-primary font-semibold shadow-2xs'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
    }`;

  return (
    <header className="fixed top-0 left-sidebar-width right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 z-40 px-space-lg flex items-center justify-between gap-space-md">
      {/* Left: Optional breadcrumb / custom content & Global Navigation Links */}
      <div className="flex items-center gap-space-md min-w-0">
        {leftContent}

        <nav className="hidden md:flex items-center gap-1.5" aria-label="Global Navigation">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/materials" className={navLinkClass}>
            Materials
          </NavLink>

          {/* Role Management - ONLY visible to Admin users */}
          {isAdmin && (
            <NavLink to="/admin/roles" className={navLinkClass}>
              Role Management
            </NavLink>
          )}
        </nav>
      </div>

      {/* Right Actions: Search bar, Term badge, Notifications, User profile */}
      <div className="flex items-center gap-space-sm shrink-0">
        {/* Global Quick Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <span className="material-symbols-outlined text-[18px] text-outline absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search tasks, materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 lg:w-64 h-9 pl-8 pr-3 text-body-sm font-body-sm rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container focus:ring-1 focus:ring-primary transition-all"
          />
        </form>

        <div className="hidden lg:flex items-center space-x-2 text-label-sm font-label-sm text-primary bg-surface-container px-3 py-1 rounded-full border border-outline-variant/30 shadow-2xs">
          <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-semibold">Fall 2026</span>
        </div>

        <div className="hidden sm:block h-6 w-px bg-outline-variant/30 mx-space-2xs" />

        <button
          aria-label="Notifications"
          className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        {user && (
          <div className="flex items-center gap-space-xs">
            <span className="hidden xl:inline text-label-sm font-label-sm text-on-surface-variant">
              {user.name}
            </span>
            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold uppercase bg-secondary-container/50 text-on-secondary-container border border-secondary-container/60">
              {user.role}
            </span>
          </div>
        )}

        <img
          alt={user?.name || 'User Profile'}
          className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/40"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxRy36P-7hrtg5rnMsquzIJr9xNgbyWo17nUsTvltNY2EnocyWX_L3hiLUagVjHUDqz5eXOYnnd9QRvALGoz-PabZNtgfiR5ROapqzP_nDpgJuOZ3bSO6Q0I9Dh5AYKknn4wQsUgGXjG8UNr4Q_rTNui0QSotJN2oKVBrvZNzDG0nqJpwx7gEI7WuXUXz-qM2VQPYo7N4HkEF0uwczljR4bW1aWIhdi8qPjwRIVnmWeRqQPwwbJ63H"
        />
      </div>
    </header>
  );
}
