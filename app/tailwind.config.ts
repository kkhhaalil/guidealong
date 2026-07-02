import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          muted: 'rgb(var(--color-ink-muted) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'poster-sky': 'rgb(var(--color-poster-sky) / <alpha-value>)',
        'poster-land': 'rgb(var(--color-poster-land) / <alpha-value>)',
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--color-border) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warn: 'rgb(var(--color-warn) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'PingFang SC', 'Noto Sans SC', 'sans-serif'],
        sans: ['var(--font-body)', 'PingFang SC', 'Noto Sans SC', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['var(--text-display-xl)', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['var(--text-display-lg)', { lineHeight: '1.15', fontWeight: '700' }],
        'display-md': ['var(--text-display-md)', { lineHeight: '1.2', fontWeight: '700' }],
        'title-lg': ['var(--text-title-lg)', { lineHeight: '1.25', fontWeight: '600' }],
        'title-md': ['var(--text-title-md)', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: '1.5' }],
        'body-md': ['var(--text-body-md)', { lineHeight: '1.5' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.45' }],
        'label-md': ['var(--text-label-md)', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        poster: 'var(--radius-poster)',
        card: 'var(--radius-card)',
        chip: 'var(--radius-chip)',
      },
      boxShadow: {
        poster: 'var(--shadow-poster)',
        card: 'var(--shadow-card)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        normal: 'var(--motion-normal)',
        slow: 'var(--motion-slow)',
      },
      zIndex: {
        base: 'var(--z-base)',
        chrome: 'var(--z-chrome)',
        sheet: 'var(--z-sheet)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
};

export default config;
