import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex flex-col justify-between">
      <div className="flex flex-col">
        <div className="h-16 px-space-md flex items-center gap-space-xs border-b border-outline-variant/20">
          <img alt="GuildBoard Logo" className="h-8 w-auto object-contain" src={logoUrl} />
          <span className="font-title-md text-title-md text-primary tracking-tight font-bold">
            GuildBoard
          </span>
        </div>
        <nav className="px-space-xs py-space-md space-y-space-2xs">
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            <span className="font-title-sm text-title-sm">Course Calendar</span>
          </NavLink>

          {user?.role === 'faculty' && (
            <NavLink
              to="/create-event"
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span className="font-title-sm text-title-sm">Create Event</span>
            </NavLink>
          )}

          <a
            href="#"
            className="flex items-center gap-space-sm px-space-md py-space-xs rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-title-sm text-title-sm">Settings</span>
          </a>
        </nav>
      </div>
      <div className="p-space-sm border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex items-center gap-space-sm px-space-xs py-space-xs">
          <img
            alt={user?.name || "Ryan Gosling"}
            className="w-8 h-8 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxRy36P-7hrtg5rnMsquzIJr9xNgbyWo17nUsTvltNY2EnocyWX_L3hiLUagVjHUDqz5eXOYnnd9QRvALGoz-PabZNtgfiR5ROapqzP_nDpgJuOZ3bSO6Q0I9Dh5AYKknn4wQsUgGXjG8UNr4Q_rTNui0QSotJN2oKVBrvZNzDG0nqJpwx7gEI7WuXUXz-qM2VQPYo7N4HkEF0uwczljR4bW1aWIhdi8qPjwRIVnmWeRqQPwwbJ63H"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-title-sm text-title-sm text-on-surface truncate">Ryan Gosling</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {user?.role === 'faculty' ? 'Faculty Instructor' : 'B.S. Software & Knowledge Engineering'}
            </span>
            <span className="text-[10px] text-on-surface-variant/70 opacity-50 tracking-wider font-mono italic select-none">
              literally me
            </span>
          </div>
          <button 
            className="text-on-surface-variant hover:text-on-surface" 
            type="button"
            title="Logout"
            onClick={() => logout()}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
