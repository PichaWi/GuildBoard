import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import Layout from '../components/Layout';

export default function Settings() {
  const { user, signOutEverywhere } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSignOutEverywhere = async () => {
    if (!window.confirm('Sign out on every device and browser? You will need to sign in again.')) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOutEverywhere();
      navigate('/login');
    } catch (err) {
      setSignOutError(err.message || 'Could not sign out everywhere. Please try again.');
      setSigningOut(false);
    }
  };
  const { preferences, setPreference } = usePreferences();

  // What the app actually knows about how this user signed in.
  const signInMethod =
    user?.authMode === 'google-oauth2'
      ? 'Google account (@ku.th)'
      : user?.authMode
        ? 'Development demo login (not for production)'
        : 'Demo mode (mock data)';

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span>GuildBoard</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span className="text-primary font-semibold">Settings</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={breadcrumbs}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-space-sm mb-space-lg">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">settings</span>
              </div>
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Settings</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage your account preferences and application settings.</p>
              </div>
            </div>

            <div className="space-y-space-lg max-w-2xl">
              {/* Profile Section */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Profile
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Full Name</label>
                    <p className="font-body-md text-body-md text-on-surface">{user?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Role</label>
                    <p className="font-body-md text-body-md text-on-surface capitalize">{user?.role || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Email</label>
                    <p className="font-body-md text-body-md text-on-surface">{user?.email || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Institution</label>
                    <p className="font-body-md text-body-md text-on-surface">Kasetsart University (@ku.th)</p>
                  </div>
                </div>
              </section>

              {/* Preferences Section */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold mb-space-xs flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary">tune</span>
                  Preferences
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Saved automatically on this device.</p>
                <div className="space-y-space-md">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
                      <span className="font-body-md text-body-md text-on-surface">Dark Mode</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.darkMode}
                      onChange={(e) => setPreference('darkMode', e.target.checked)}
                      className="w-5 h-5 rounded text-primary-container focus:ring-primary-container"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-on-surface-variant">language</span>
                      <span className="font-body-md text-body-md text-on-surface">Language</span>
                    </div>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreference('language', e.target.value)}
                      className="h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      <option value="en">English</option>
                      <option value="th">ไทย (Thai)</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-on-surface-variant">calendar_view_month</span>
                      <span className="font-body-md text-body-md text-on-surface">Default Calendar View</span>
                    </div>
                    <select
                      value={preferences.calendarView}
                      onChange={(e) => setPreference('calendarView', e.target.value)}
                      className="h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      <option value="Month">Month</option>
                      <option value="Week">Week</option>
                      <option value="Day">Day</option>
                      <option value="Agenda">Agenda</option>
                    </select>
                  </label>
                  <div className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">mail</span>
                    <div className="flex flex-col gap-1">
                      <span className="font-body-md text-body-md text-on-surface">Reminder Emails</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Sent to the owner email on a ticket when staff click Reminder, Flag TA or Batch Ping.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Security Section */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary">security</span>
                  Security
                </h2>
                <div className="flex flex-col gap-space-md">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Signed in with</span>
                    <span className="font-body-md text-body-md text-on-surface">{signInMethod}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Two-step verification</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Managed by your Google account.{' '}
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Open Google security settings
                      </a>
                    </span>
                  </div>
                </div>
              </section>

              {/* Danger Zone */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-error-container/30">
                <h2 className="font-title-md text-title-md text-error font-semibold mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined">warning</span>
                  Danger Zone
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                  Signs you out on every device and browser where this account is signed in.
                </p>
                <button
                  type="button"
                  onClick={handleSignOutEverywhere}
                  disabled={signingOut}
                  className="px-space-md py-2 rounded-lg bg-error-container text-on-error-container hover:bg-error-container/80 font-title-sm text-title-sm transition-colors flex items-center gap-space-xs disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>{signingOut ? 'Signing out…' : 'Sign Out Everywhere'}</span>
                </button>
                {signOutError && (
                  <p className="mt-space-sm font-body-sm text-body-sm text-error">{signOutError}</p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}