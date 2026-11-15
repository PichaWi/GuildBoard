import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreferencesProvider, loadPreferences, usePreferences } from './PreferencesContext';


function DarkSwitch() {
  const { setPreference } = usePreferences();
  return <button type="button" onClick={() => setPreference('darkMode', true)}>dark</button>;
}


function Probe() {
  const { preferences, setPreference } = usePreferences();
  return (
    <button type="button" onClick={() => setPreference('calendarView', 'Agenda')}>
      {preferences.calendarView}
    </button>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('preferences', () => {
  it('uses defaults when nothing is saved', () => {
    expect(loadPreferences()).toEqual({ darkMode: false, language: 'en', calendarView: 'Month' });
  });

  it('saves a change and loads it again next time', () => {
    render(<PreferencesProvider><Probe /></PreferencesProvider>);
    act(() => screen.getByRole('button').click());

    expect(screen.getByRole('button').textContent).toBe('Agenda');
    expect(loadPreferences().calendarView).toBe('Agenda');
  });

  it('ignores broken saved data', () => {
    localStorage.setItem('guildboard_preferences', '{not json');
    expect(loadPreferences().language).toBe('en');
  });

  it('turns dark mode on for the whole page', () => {
    render(<PreferencesProvider><DarkSwitch /></PreferencesProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => screen.getByRole('button').click());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});