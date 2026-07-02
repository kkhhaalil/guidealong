import { useEffect, useState } from 'react';
import { t } from '../i18n';
import {
  cycleThemePreference,
  getThemePreference,
  subscribeToThemeChanges,
  type ThemePreference,
} from '../theme/themePreference.ts';

function themeIcon(pref: ThemePreference): string {
  if (pref === 'light') return '☀️';
  if (pref === 'dark') return '🌙';
  return '◐';
}

function themeAriaLabel(pref: ThemePreference): string {
  if (pref === 'light') return t('ariaThemeLight');
  if (pref === 'dark') return t('ariaThemeDark');
  return t('ariaThemeAuto');
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>(() => getThemePreference());

  useEffect(() => subscribeToThemeChanges(() => setPref(getThemePreference())), []);

  return (
    <button
      type="button"
      data-testid="btn-theme-toggle"
      className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-card bg-surface text-xl shadow-card transition-opacity duration-normal hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${className}`}
      aria-label={themeAriaLabel(pref)}
      onClick={() => cycleThemePreference()}
    >
      <span aria-hidden>{themeIcon(pref)}</span>
    </button>
  );
}
