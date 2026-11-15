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
  return (
    <PreferencesContext.Provider value={{ preferences, setPreference }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return context;
}