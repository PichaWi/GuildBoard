import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Personal display settings, saved in this browser (localStorage).
const STORAGE_KEY = 'guildboard_preferences';

export const DEFAULT_PREFERENCES = {
  darkMode: false,
  language: 'en', // 'en' or 'th'
  calendarView: 'Month', // 'Month', 'Week', 'Day' or 'Agenda'
};

export function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_PREFERENCES, ...saved };
  } catch {
    return { ...DEFAULT_PREFERENCES }; // broken or blocked storage: use defaults
  }
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(loadPreferences);

  const setPreference = useCallback((key, value) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full or blocked: keep the change for this visit only
      }
      return next;
    });
  }, []);

  // Dark mode: the colours in index.css switch when <html> has class="dark".
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.darkMode);
  }, [preferences.darkMode]);
  // Language: tells the browser (and screen readers) which language the page is in.
  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);
  return (
    <PreferencesContext.Provider value={{ preferences, setPreference }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// Outside <PreferencesProvider> (e.g. a component rendered alone in a test),
// return the defaults so the component still works.
const DEFAULT_CONTEXT = { preferences: DEFAULT_PREFERENCES, setPreference: () => {} };

export function usePreferences() {
  return useContext(PreferencesContext) ?? DEFAULT_CONTEXT;
}