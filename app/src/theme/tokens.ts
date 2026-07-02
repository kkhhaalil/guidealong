/** Primitive design tokens — layer 1 (§5.1). */

export const fontFamily = {
  display: '"Alfa Slab One", "PingFang SC", "Noto Sans SC", sans-serif',
  body: '"Source Sans 3", "PingFang SC", "Noto Sans SC", sans-serif',
} as const;

export const fontSize = {
  displayXl: '3rem',
  displayLg: '2.25rem',
  displayMd: '1.75rem',
  titleLg: '1.5rem',
  titleMd: '1.25rem',
  bodyLg: '1.125rem',
  bodyMd: '1rem',
  bodySm: '0.875rem',
  labelMd: '0.8125rem',
} as const;

/** 4-pt spacing grid */
export const spacing = {
  0: '0',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
} as const;

export const radius = {
  poster: '24px',
  card: '16px',
  chip: '999px',
  md: '12px',
} as const;

export const elevation = {
  poster: '0 8px 24px rgb(0 0 0 / 0.18)',
  card: '0 4px 12px rgb(0 0 0 / 0.12)',
  flat: '0 1px 2px rgb(0 0 0 / 0.06)',
} as const;

export const motion = {
  fast: '120ms',
  normal: '200ms',
  slow: '320ms',
} as const;

export const zIndex = {
  base: 0,
  chrome: 10,
  sheet: 40,
  toast: 50,
} as const;

export const tokens = {
  fontFamily,
  fontSize,
  spacing,
  radius,
  elevation,
  motion,
  zIndex,
} as const;

export type Tokens = typeof tokens;
