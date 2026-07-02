import { SEMANTIC_COLOR_TOKENS, type SemanticColorToken, type ThemePalette, type TourManifest } from '../types/tour.ts';
import {
  applyDataThemeAttribute,
  initThemePreference,
  resolveThemeMode,
  subscribeToThemeChanges,
  type ResolvedThemeMode,
} from './themePreference.ts';

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

const SHELL_LIGHT: Record<string, string> = {
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

const SHELL_DARK: Record<string, string> = {
  '--color-surface': '18 22 20',
  '--color-ink': '240 236 228',
  '--color-ink-muted': '168 172 166',
  '--color-primary': '88 192 170',
  '--color-primary-foreground': '12 20 18',
  '--color-accent': '232 176 72',
  '--color-poster-sky': '56 88 104',
  '--color-poster-land': '40 72 52',
  '--color-secondary': '48 52 50',
  '--color-secondary-foreground': '220 216 208',
  '--color-border': '56 64 60',
  '--color-success': '102 181 132',
  '--color-warn': '232 176 72',
  '--color-danger': '232 96 96',
  '--gradient-hero':
    'linear-gradient(165deg, rgb(var(--color-poster-sky)) 0%, rgb(var(--color-primary)) 45%, rgb(var(--color-poster-land)) 100%)',
};

let currentManifest: TourManifest | null = null;
let bootstrapped = false;

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '0 0 0';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

function foregroundForBg(value: string): string {
  const triplet = value.startsWith('#') ? hexToRgbTriplet(value) : value;
  const parts = triplet.split(' ').map(Number);
  const bgLum = relativeLuminance(parts[0]!, parts[1]!, parts[2]!);
  const darkLum = relativeLuminance(12, 20, 18);
  const lightLum = relativeLuminance(255, 252, 245);
  const contrastWithDark = (Math.max(darkLum, bgLum) + 0.05) / (Math.min(darkLum, bgLum) + 0.05);
  const contrastWithLight = (Math.max(lightLum, bgLum) + 0.05) / (Math.min(lightLum, bgLum) + 0.05);
  return contrastWithDark >= contrastWithLight ? '12 20 18' : '255 252 245';
}

function cssValueForToken(token: SemanticColorToken, value: string): string {
  if (token === 'gradientHero') return value;
  if (value.startsWith('linear-gradient') || value.startsWith('rgb')) return value;
  if (value.startsWith('#')) return hexToRgbTriplet(value);
  return value;
}

function adjustMuted(inkHex: string): string {
  const t = hexToRgbTriplet(inkHex).split(' ').map(Number);
  return t.map((v) => Math.round(v * 0.65 + 90 * 0.35)).join(' ');
}

function adjustBorder(inkHex: string): string {
  const t = hexToRgbTriplet(inkHex).split(' ').map(Number);
  return t.map((v) => Math.round(v * 0.25 + 200 * 0.75)).join(' ');
}

function applyVars(vars: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function applyPalette(palette: ThemePalette): void {
  const root = document.documentElement;
  for (const token of SEMANTIC_COLOR_TOKENS) {
    const cssVar = TOKEN_TO_VAR[token];
    root.style.setProperty(cssVar, cssValueForToken(token, palette[token]));
  }
  root.style.setProperty('--color-primary-foreground', foregroundForBg(palette.primary));
  root.style.setProperty(
    '--color-ink-muted',
    palette.ink.startsWith('#') ? adjustMuted(palette.ink) : '90 98 92',
  );
  root.style.setProperty(
    '--color-secondary',
    palette.surface.startsWith('#') ? hexToRgbTriplet(palette.surface) : palette.surface,
  );
  root.style.setProperty(
    '--color-secondary-foreground',
    palette.ink.startsWith('#') ? hexToRgbTriplet(palette.ink) : palette.ink,
  );
  root.style.setProperty(
    '--color-border',
    palette.ink.startsWith('#') ? adjustBorder(palette.ink) : '200 192 176',
  );
}

function shellDefaultsForMode(mode: ResolvedThemeMode): Record<string, string> {
  return mode === 'dark' ? SHELL_DARK : SHELL_LIGHT;
}

function reapplyTheme(): void {
  applyDataThemeAttribute();
  const mode = resolveThemeMode();
  const root = document.documentElement;
  root.dataset.themeMode = mode;

  if (currentManifest) {
    root.dataset.tour = currentManifest.id;
    applyPalette(currentManifest.theme[mode]);
  } else {
    delete root.dataset.tour;
    applyVars(shellDefaultsForMode(mode));
  }
}

function ensureBootstrapped(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  initThemePreference();
  subscribeToThemeChanges(reapplyTheme);
}

export function applyTourTheme(manifest: TourManifest): void {
  ensureBootstrapped();
  currentManifest = manifest;
  reapplyTheme();
}

export function clearTourTheme(): void {
  ensureBootstrapped();
  currentManifest = null;
  reapplyTheme();
}

export function readPrimaryColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
}
