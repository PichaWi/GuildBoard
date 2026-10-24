import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';

// ─── Top Navbar ───────────────────────────────────────────────────────────────
function TopNavbar() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-sidebar-width right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-xl">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-space-xs">
        <img
          alt="GuildBoard Logo"
          className="h-8 w-auto object-contain"
          src={logoUrl}
        />
        <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          <span className="hover:text-on-surface transition-colors cursor-pointer">
            Guild Board Portal
          </span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="font-title-sm text-title-sm text-primary">Operations</span>
        </div>
      </div>

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-space-md">
        <button
          aria-label="Notifications"
          className="flex items-center justify-center w-8 h-8 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <div className="flex items-center gap-space-xs">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxRy36P-7hrtg5rnMsquzIJr9xNgbyWo17nUsTvltNY2EnocyWX_L3hiLUagVjHUDqz5eXOYnnd9QRvALGoz-PabZNtgfiR5ROapqzP_nDpgJuOZ3bSO6Q0I9Dh5AYKknn4wQsUgGXjG8UNr4Q_rTNui0QSotJN2oKVBrvZNzDG0nqJpwx7gEI7WuXUXz-qM2VQPYo7N4HkEF0uwczljR4bW1aWIhdi8qPjwRIVnmWeRqQPwwbJ63H"
          />
          <span className="font-label-md text-label-md text-on-surface hidden md:inline-block">
            {user?.name || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── DashboardLayout (default export) ────────────────────────────────────────
export default function DashboardLayout() {
  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased">
      <Sidebar />
      <div className="pl-sidebar-width">
        <TopNavbar />
        <main className="relative pt-16 w-full px-space-xl bg-background min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
