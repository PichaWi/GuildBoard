import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreferencesProvider, loadPreferences, usePreferences } from './PreferencesContext';

function Probe() {
  const { preferences, setPreference } = usePreferences();
  return (
    <button type="button" onClick={() => setPreference('calendarView', 'Agenda')}>
      {preferences.calendarView}
    </button>
  );
}

afterEach(() => localStorage.clear());

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
});