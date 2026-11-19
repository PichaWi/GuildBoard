import { usePreferences } from '../context/PreferencesContext';
import { translations } from './translations';

// The word for `key` in `language`, falling back to English, then to the key itself.
export function translate(language, key) {
  return translations[language]?.[key] ?? translations.en[key] ?? key;
}

// In a component: const t = useT(); then t('nav.dashboard')
export function useT() {
  const { preferences } = usePreferences();
  return (key) => translate(preferences.language, key);
}