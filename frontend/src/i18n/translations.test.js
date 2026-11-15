import { describe, expect, it } from 'vitest';
import { translate } from './index';
import { translations } from './translations';

describe('translations', () => {
  it('has every English word in Thai too', () => {
    const missing = Object.keys(translations.en).filter((key) => !(key in translations.th));
    expect(missing).toEqual([]);
  });

  it('translates to Thai and falls back to English, then to the key', () => {
    expect(translate('th', 'nav.settings')).toBe('ตั้งค่า');
    expect(translate('en', 'nav.settings')).toBe('Settings');
    expect(translate('fr', 'nav.settings')).toBe('Settings');
    expect(translate('th', 'no.such.key')).toBe('no.such.key');
  });
});