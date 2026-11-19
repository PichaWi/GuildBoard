import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';
import { DEFAULTS } from '../config/appConfig';
import UserAvatar from './UserAvatar';
import { useT } from '../i18n';

const ALL_NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ['ta', 'lecturer', 'admin'] },
  { to: '/calendar', icon: 'calendar_month', label: 'Course Calendar', roles: ['student', 'ta', 'lecturer', 'admin'] },
  { to: '/course-materials', icon: 'auto_stories', label: 'Course Materials', roles: ['student', 'ta', 'lecturer', 'admin'] },
  { to: '/create-event', icon: 'add_circle', label: 'Create Event', roles: ['ta', 'lecturer', 'admin'] },
  { to: '/consultations', icon: 'support_agent', label: 'Consultations', roles: ['ta'] },
  { to: '/settings', icon: 'settings', label: 'Settings', roles: ['student', 'ta', 'lecturer', 'admin'] },
];

function getRoleLabel(role, t) {
  const r = String(role || '').toLowerCase();
  switch (r) {
    case 'lecturer': return t('role.lecturer');
    case 'ta': return t('role.ta');
    case 'admin': return t('role.admin');
    case 'student': return t('role.student');
    default: return t('role.user');
  }
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const t = useT();
  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isFacultyOrStaff = ['ta', 'lecturer', 'admin'].includes(role);

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
        <nav className="px-space-xs py-space-md space-y-space-2xs">
          {isFacultyOrStaff && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                  ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span className="font-title-sm text-title-sm">{t('nav.dashboard')}</span>
            </NavLink>
          )}

          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            <span className="font-title-sm text-title-sm">{t('nav.calendar')}</span>
          </NavLink>

          <NavLink
            to="/materials"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            <span className="font-title-sm text-title-sm">{t('nav.materials')}</span>
          </NavLink>

          {/* Admin Role Management link in Sidebar */}
          {isAdmin && (
            <NavLink
              to="/admin/roles"
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                  ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
              <span className="font-title-sm text-title-sm">{t('nav.roles')}</span>
            </NavLink>
          )}

          {/* Create Event - for TAs, lecturers, and admins (matching ALL_NAV_ITEMS) */}
          {['ta', 'lecturer', 'admin'].includes(role) && (
            <NavLink
              to="/create-event"
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                  ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span className="font-title-sm text-title-sm">{t('nav.createEvent')}</span>
            </NavLink>
          )}

          {role === 'ta' && (
            <NavLink
              to="/consultations"
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                  ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
              <span className="font-title-sm text-title-sm">{t('nav.consultations')}</span>
            </NavLink>
          )}

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span className="font-title-sm text-title-sm">{t('nav.search')}</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-space-xs rounded-xl transition-all ${isActive
                ? 'bg-primary-container text-on-primary font-title-sm shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-title-sm text-title-sm">{t('nav.settings')}</span>
          </NavLink>
        </nav>
      </div>

      <div className="p-space-sm border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex items-center gap-space-sm px-space-xs py-space-xs bg-surface-container-low rounded-xl">
          <UserAvatar user={user} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-title-sm text-title-sm text-on-surface truncate">
              {user?.name || DEFAULTS.profileName}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate capitalize">
              {role === 'admin'
                ? t('role.adminTitle')
                : role === 'lecturer'
                  ? t('role.lecturer')
                  : role === 'ta'
                    ? t('role.ta')
                    : t('role.studentTitle')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {getRoleLabel(role, t)}
            </span>
            {user?.email ? (
              <span className="text-[11px] text-on-surface-variant/80 truncate">
                {user.email}
              </span>
            ) : null}
          </div>
          <button
            className="text-on-surface-variant hover:text-on-surface cursor-pointer"
            type="button"
            title={t('nav.signOut')}
            aria-label={t('nav.signOut')}
            onClick={() => logout()}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
