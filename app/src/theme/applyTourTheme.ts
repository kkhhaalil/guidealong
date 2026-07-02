import { STORAGE_KEYS } from '../engine/persist.ts';
import { SEMANTIC_COLOR_TOKENS, type SemanticColorToken, type ThemePalette, type TourManifest } from '../types/tour.ts';
import { browserStorage } from '../engine-adapters/browserStorage.ts';

const TOKEN_TO_VAR: Record<SemanticColorToken, string> = {
  surface: '--color-surface',
  ink: '--color-ink',
  primary: '--color-primary',
  accent: '--color-accent',
  posterSky: '--color-poster-sky',
  posterLand: '--color-poster-land',
  gradientHero: '--gradient-hero',
  success: '--color-success',
  warn: '--color-warn',
  danger: '--color-danger',
};

const SHELL_DEFAULTS: Record<string, string> = {
  '--color-surface': '245 240 230',
  '--color-ink': '26 32 28',
  '--color-ink-muted': '90 98 92',
  '--color-primary': '26 107 92',
  '--color-primary-foreground': '255 252 245',
  '--color-accent': '212 148 42',
  '--color-poster-sky': '120 176 196',
  '--color-poster-land': '72 128 88',
  '--color-secondary': '218 208 188',
  '--color-secondary-foreground': '40 36 28',
  '--color-border': '200 192 176',
  '--color-success': '52 131 82',
  '--color-warn': '212 148 42',
  '--color-danger': '185 48 48',
  '--gradient-hero':
    'linear-gradient(165deg, rgb(var(--color-poster-sky)) 0%, rgb(var(--color-primary)) 45%, rgb(var(--color-poster-land)) 100%)',
};

type ThemeMode = 'light' | 'dark';

interface GaSettings {
  theme?: 'light' | 'dark' | 'system';
}

function loadSettings(): GaSettings {
  try {
    const raw = browserStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return {};
    return JSON.parse(raw) as GaSettings;
  } catch {
    return {};
  }
}

function resolveThemeMode(): ThemeMode {
  const settings = loadSettings();
  if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '0 0 0';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function cssValueForToken(token: SemanticColorToken, value: string): string {
  if (token === 'gradientHero') return value;
  if (value.startsWith('linear-gradient') || value.startsWith('rgb')) return value;
  if (value.startsWith('#')) return hexToRgbTriplet(value);
  return value;
}

function applyPalette(palette: ThemePalette): void {
  const root = document.documentElement;
  for (const token of SEMANTIC_COLOR_TOKENS) {
    const cssVar = TOKEN_TO_VAR[token];
    root.style.setProperty(cssVar, cssValueForToken(token, palette[token]));
  }
  // Derived tokens for gluestack compatibility
  root.style.setProperty('--color-primary-foreground', '255 252 245');
  root.style.setProperty('--color-ink-muted', palette.ink.startsWith('#') ? adjustMuted(palette.ink) : '90 98 92');
  root.style.setProperty('--color-secondary', palette.surface.startsWith('#') ? hexToRgbTriplet(palette.surface) : palette.surface);
  root.style.setProperty('--color-secondary-foreground', palette.ink.startsWith('#') ? hexToRgbTriplet(palette.ink) : palette.ink);
  root.style.setProperty('--color-border', palette.ink.startsWith('#') ? adjustBorder(palette.ink) : '200 192 176');
}

function adjustMuted(inkHex: string): string {
  const t = hexToRgbTriplet(inkHex).split(' ').map(Number);
  return t.map((v) => Math.round(v * 0.65 + 90 * 0.35)).join(' ');
}

function adjustBorder(inkHex: string): string {
  const t = hexToRgbTriplet(inkHex).split(' ').map(Number);
  return t.map((v) => Math.round(v * 0.25 + 200 * 0.75)).join(' ');
}

export function applyTourTheme(manifest: TourManifest): void {
  const root = document.documentElement;
  const mode = resolveThemeMode();
  root.dataset.tour = manifest.id;
  root.dataset.theme = mode;
  applyPalette(manifest.theme[mode]);
}

export function clearTourTheme(): void {
  const root = document.documentElement;
  delete root.dataset.tour;
  const mode = resolveThemeMode();
  root.dataset.theme = mode;
  for (const [key, value] of Object.entries(SHELL_DEFAULTS)) {
    root.style.setProperty(key, value);
  }
}

export function readPrimaryColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
}
