import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import Layout from '../components/Layout';
import { useT } from '../i18n';

export default function Settings() {
  const { user, signOutEverywhere } = useAuth();
  const navigate = useNavigate();
  const { preferences, setPreference } = usePreferences();
  const t = useT();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSignOutEverywhere = async () => {
    if (!window.confirm(t('settings.confirmSignOutEverywhere'))) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOutEverywhere();
      navigate('/login');
    } catch (err) {
      setSignOutError(err.message || t('settings.signOutEverywhereError'));
      setSigningOut(false);
    }
  };

  // What the app actually knows about how this user signed in.
  const signInMethod =
    user?.authMode === 'google-oauth2'
      ? t('settings.signIn.google')
      : user?.authMode
        ? t('settings.signIn.dev')
        : t('settings.signIn.mock');

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span>GuildBoard</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span className="text-primary font-semibold">{t('settings.title')}</span>
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
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">{t('settings.title')}</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">{t('settings.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-space-lg max-w-2xl">
              {/* Profile Section */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary">person</span>
                  {t('settings.profile')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">{t('settings.fullName')}</label>
                    <p className="font-body-md text-body-md text-on-surface">{user?.name || t('settings.notSet')}</p>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">{t('settings.role')}</label>
                    <p className="font-body-md text-body-md text-on-surface capitalize">{user?.role ? t(`role.${user.role}`) : t('settings.notSet')}</p>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">{t('settings.email')}</label>
                    <p className="font-body-md text-body-md text-on-surface">{user?.email || t('settings.notSet')}</p>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">{t('settings.institution')}</label>
                    <p className="font-body-md text-body-md text-on-surface">Kasetsart University (@ku.th)</p>
                  </div>
                </div>
              </section>

              {/* Preferences Section */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold mb-space-xs flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary">tune</span>
                  {t('settings.preferences')}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">{t('settings.savedOnDevice')}</p>
                <div className="space-y-space-md">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
                      <span className="font-body-md text-body-md text-on-surface">{t('settings.darkMode')}</span>
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
                      <span className="font-body-md text-body-md text-on-surface">{t('settings.language')}</span>
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
                      <span className="font-body-md text-body-md text-on-surface">{t('settings.calendarView')}</span>
                    </div>
                    <select
                      value={preferences.calendarView}
                      onChange={(e) => setPreference('calendarView', e.target.value)}
                      className="h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
                        <option key={view} value={view}>{t(`settings.view.${view}`)}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">mail</span>
                    <div className="flex flex-col gap-1">
                      <span className="font-body-md text-body-md text-on-surface">{t('settings.reminderEmails')}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('settings.reminderEmailsHint')}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Security Section */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary">security</span>
                  {t('settings.security')}
                </h2>
                <div className="flex flex-col gap-space-md">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t('settings.signedInWith')}</span>
                    <span className="font-body-md text-body-md text-on-surface">{signInMethod}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t('settings.twoStep')}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('settings.twoStepHint')}{' '}
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {t('settings.openGoogleSecurity')}
                      </a>
                    </span>
                  </div>
                </div>
              </section>

              {/* Danger Zone */}
              <section className="p-space-md rounded-xl bg-surface-container-low border border-error-container/30">
                <h2 className="font-title-md text-title-md text-error font-semibold mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined">warning</span>
                  {t('settings.danger')}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                  {t('settings.dangerHint')}
                </p>
                <button
                  type="button"
                  onClick={handleSignOutEverywhere}
                  disabled={signingOut}
                  className="px-space-md py-2 rounded-lg bg-error-container text-on-error-container hover:bg-error-container/80 font-title-sm text-title-sm transition-colors flex items-center gap-space-xs disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>{signingOut ? t('settings.signingOut') : t('settings.signOutEverywhere')}</span>
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