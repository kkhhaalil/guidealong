import { STORAGE_KEYS } from '../engine/persist.ts';
import { browserStorage } from '../engine-adapters/browserStorage.ts';

export type ThemePreference = 'system' | 'light' | 'dark';

interface GaSettings {
  theme?: ThemePreference;
}

const listeners = new Set<() => void>();

function loadSettings(): GaSettings {
  try {
    const raw = browserStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return {};
    return JSON.parse(raw) as GaSettings;
  } catch {
    return {};
  }
}

function saveSettings(settings: GaSettings): void {
  try {
    browserStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

export function getThemePreference(): ThemePreference {
  const pref = loadSettings().theme;
  if (pref === 'light' || pref === 'dark') return pref;
  return 'system';
}

/** Cycle auto → light → dark → auto (§5.1 day/night override). */
export function cycleThemePreference(): ThemePreference {
  const order: ThemePreference[] = ['system', 'light', 'dark'];
  const current = getThemePreference();
  const next = order[(order.indexOf(current) + 1) % order.length]!;
  setThemePreference(next);
  return next;
}

export function setThemePreference(pref: ThemePreference): void {
  const settings = loadSettings();
  if (pref === 'system') {
    delete settings.theme;
  } else {
    settings.theme = pref;
  }
  saveSettings(settings);
  applyDataThemeAttribute();
  notifyListeners();
}

export type ResolvedThemeMode = 'light' | 'dark';

export function resolveThemeMode(): ResolvedThemeMode {
  const pref = getThemePreference();
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyDataThemeAttribute(): void {
  const root = document.documentElement;
  const pref = getThemePreference();
  if (pref === 'light' || pref === 'dark') {
    root.dataset.theme = pref;
  } else {
    delete root.dataset.theme;
  }
}

export function subscribeToThemeChanges(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(): void {
  for (const cb of listeners) cb();
}

let mediaQuery: MediaQueryList | null = null;

/** Call once at app boot — listens for OS scheme changes when preference is system. */
export function initThemePreference(): void {
  applyDataThemeAttribute();
  if (typeof window === 'undefined') return;

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getThemePreference() === 'system') notifyListeners();
  };
  mediaQuery.addEventListener('change', onChange);
}
