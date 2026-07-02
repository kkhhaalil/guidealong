#!/usr/bin/env node
/**
 * WCAG contrast checker for tour palettes + shell defaults (PLAN §5.3, §7.5).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function parseColor(value) {
  if (value.startsWith('#')) return hexToRgb(value);
  return value.trim().split(/\s+/).map(Number);
}

function relativeLuminance([r, g, b]) {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function foregroundForPrimary(primary) {
  const dark = [12, 20, 18];
  const light = [255, 252, 245];
  return contrastRatio(dark, primary) >= contrastRatio(light, primary) ? dark : light;
}

function mutedInk(ink) {
  return ink.map((v, i) => Math.round(v * 0.65 + [90, 98, 92][i] * 0.35));
}

/** Explicit fg/bg pairs (§5.3) — checked on every palette × theme. */
function buildPairs(palette) {
  const surface = parseColor(palette.surface);
  const ink = parseColor(palette.ink);
  const primary = parseColor(palette.primary);
  const primaryFg = foregroundForPrimary(primary);
  const inkMuted = mutedInk(ink);
  const posterSky = parseColor(palette.posterSky);
  const posterLand = parseColor(palette.posterLand);

  return [
    { name: 'body text (ink/surface)', fg: ink, bg: surface, min: 4.5 },
    { name: 'muted text (ink-muted/surface)', fg: inkMuted, bg: surface, min: 4.5 },
    { name: 'now-playing title AAA (ink/surface)', fg: ink, bg: surface, min: 7.0 },
    { name: 'primary button text', fg: primaryFg, bg: primary, min: 4.5 },
    { name: 'primary on surface (links)', fg: primary, bg: surface, min: 4.5 },
    { name: 'poster ink on sky', fg: ink, bg: posterSky, min: 3.0 },
    { name: 'poster ink on land', fg: ink, bg: posterLand, min: 3.0 },
  ];
}

function readCssVar(block, name) {
  const m = block.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`Missing --color-${name}`);
  return m[1].trim();
}

function shellPaletteFromCss(cssText, mode) {
  const selector =
    mode === 'light'
      ? /:root,\s*\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/
      : /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/;
  const match = cssText.match(selector);
  if (!match) throw new Error(`Shell ${mode} block not found in global.css`);
  const block = match[1];
  return {
    surface: readCssVar(block, 'surface'),
    ink: readCssVar(block, 'ink'),
    primary: readCssVar(block, 'primary'),
    posterSky: readCssVar(block, 'poster-sky'),
    posterLand: readCssVar(block, 'poster-land'),
  };
}

async function loadManifest(id) {
  const raw = await readFile(path.join(repoRoot, 'tours', id, 'manifest.json'), 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const cssText = await readFile(path.join(repoRoot, 'app/src/theme/global.css'), 'utf8');
  const sources = [
    { context: 'shell', mode: 'light', palette: shellPaletteFromCss(cssText, 'light') },
    { context: 'shell', mode: 'dark', palette: shellPaletteFromCss(cssText, 'dark') },
  ];

  for (const id of ['yellowstone', 'demo']) {
    const manifest = await loadManifest(id);
    sources.push({ context: id, mode: 'light', palette: manifest.theme.light });
    sources.push({ context: id, mode: 'dark', palette: manifest.theme.dark });
  }

  const rows = [];
  const failures = [];

  for (const { context, mode, palette } of sources) {
    for (const pair of buildPairs(palette)) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      const ok = ratio >= pair.min;
      rows.push({ context, mode, ...pair, ratio, ok });
      if (!ok) failures.push({ context, mode, name: pair.name, ratio, min: pair.min });
    }
  }

  console.log('\nContrast report (WCAG)\n');
  console.log('| Context | Theme | Pair | Ratio | Min | Status |');
  console.log('|---------|-------|------|-------|-----|--------|');
  for (const r of rows) {
    console.log(
      `| ${r.context} | ${r.mode} | ${r.name} | ${r.ratio.toFixed(2)} | ${r.min.toFixed(1)} | ${r.ok ? 'PASS' : 'FAIL'} |`,
    );
  }

  if (failures.length) {
    console.error(`\n${failures.length} contrast failure(s):`);
    for (const f of failures) {
      console.error(`  ${f.context}/${f.mode}: ${f.name} = ${f.ratio.toFixed(2)} (need ≥${f.min})`);
    }
    process.exit(1);
  }

  console.log(`\nAll ${rows.length} pairs passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
