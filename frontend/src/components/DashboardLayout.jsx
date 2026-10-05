import React from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';

// ─── Navigation Item Definitions ──────────────────────────────────────────────

const ALL_NAV_ITEMS = [
  { to: '/dashboard',        icon: 'dashboard',       label: 'Dashboard',        roles: ['ta', 'lecturer'] },
  { to: '/calendar',         icon: 'calendar_month',  label: 'Course Calendar',  roles: ['student', 'ta', 'lecturer'] },
  { to: '/course-materials', icon: 'auto_stories',    label: 'Course Materials', roles: ['student', 'ta', 'lecturer'] },
  { to: '/create-event',     icon: 'add_circle',      label: 'Create Event',     roles: ['lecturer'] },
  { to: '/settings',         icon: 'settings',        label: 'Settings',         roles: ['student', 'ta', 'lecturer'] },
];

// ─── Role Display Helpers ─────────────────────────────────────────────────────

function getRoleLabel(role) {
  switch (role) {
    case 'lecturer': return 'Faculty Instructor';
    case 'ta':       return 'Teaching Assistant';
    case 'student':  return 'Student';
    default:         return 'Academic Staff';
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout } = useAuth();
  const userRole = user?.role || 'student';

  // Filter navigation items based on the current user role
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
      {/* Brand Header */}
      <div className="flex flex-col">
        <div className="h-16 px-space-lg flex items-center gap-space-sm">
          <img
            alt="GuildBoard Logo"
            className="h-8 w-auto object-contain"
            src={logoUrl}
          />
          <div className="flex flex-col">
            <span className="font-title-md text-title-md text-primary leading-tight tracking-tight">
              GuildBoard
            </span>
          </div>
        </div>

        {/* Nav Section Label */}
        <div className="px-space-md pt-space-md">
          <span className="px-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Academic Nav
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-space-2xs px-space-md pt-space-xs">
          {visibleNavItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-sm py-space-xs rounded-xl font-title-sm text-title-sm transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-space-md">
        <div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-xl">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover shrink-0"
            src="https://lh3.googleusercontent.com/aida/AEtjO1XeNVJfkTn5wJqWjfQ3jX3oku4tQDX86PXR7ZDqyH_LEYEHhEdkNTD8JA-yV2kxvM_xHVwqALpu0wWdIjG2tLM9VQzj2GTPURAJy1v5Jk80uOXVVwUHI4Qn0qk4LS901f1D2ZPTWem7mAs6lY9v5Nl_g2a-toppPFF6wMa1b3nVTwf_SuwIcWq4STYHTPaWinZs3fEzuZ2YBIl98yuzq1Vtnb_gguhUYLnfnihZ6wXsjGb0XDPvVKJGY5Q"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-title-sm text-title-sm text-on-surface truncate">
              {user?.name || 'Ryan Gosling'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {getRoleLabel(userRole)}
            </span>
          </div>
          <button
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors shrink-0"
            onClick={logout}
            title="Sign out"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

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
            src="https://lh3.googleusercontent.com/aida/AEtjO1XeNVJfkTn5wJqWjfQ3jX3oku4tQDX86PXR7ZDqyH_LEYEHhEdkNTD8JA-yV2kxvM_xHVwqALpu0wWdIjG2tLM9VQzj2GTPURAJy1v5Jk80uOXVVwUHI4Qn0qk4LS901f1D2ZPTWem7mAs6lY9v5Nl_g2a-toppPFF6wMa1b3nVTwf_SuwIcWq4STYHTPaWinZs3fEzuZ2YBIl98yuzq1Vtnb_gguhUYLnfnihZ6wXsjGb0XDPvVKJGY5Q"
          />
          <span className="font-label-md text-label-md text-on-surface hidden md:inline-block">
            {user?.name || 'R. Gosling'}
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
