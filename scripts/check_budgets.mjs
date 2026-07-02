#!/usr/bin/env node
/**
 * Post-build budget checker (PLAN §7.6).
 * - SW precache total ≤ 2.5 MB
 * - Main JS bundle ≤ 900 KB gzip
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'app', 'dist');

const PRECACHE_LIMIT = 2.5 * 1024 * 1024;
const MAIN_GZIP_LIMIT = 900 * 1024;

function gzipSize(buf) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const gz = createGzip({ level: 9 });
    gz.on('data', (c) => chunks.push(c));
    gz.on('end', () => resolve(Buffer.concat(chunks).length));
    gz.on('error', reject);
    gz.end(buf);
  });
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function parsePrecacheEntries(swText) {
  const arrayMatch = swText.match(/\[\{"revision"[\s\S]*?\}\]/);
  if (!arrayMatch) throw new Error('Could not find precache manifest array in dist/sw.js');
  const entries = JSON.parse(arrayMatch[0]);
  const seen = new Set();
  const unique = [];
  for (const e of entries) {
    if (!seen.has(e.url)) {
      seen.add(e.url);
      unique.push(e);
    }
  }
  return unique;
}

async function findMainJs() {
  const assets = path.join(distDir, 'assets');
  const files = await readdir(assets);
  const js = files.filter((f) => f.endsWith('.js') && f.startsWith('index-'));
  if (!js.length) throw new Error('No index-*.js bundle in dist/assets');
  let best = js[0];
  let bestSize = 0;
  for (const f of js) {
    const s = (await stat(path.join(assets, f))).size;
    if (s > bestSize) {
      bestSize = s;
      best = f;
    }
  }
  return path.join(assets, best);
}

async function main() {
  const swPath = path.join(distDir, 'sw.js');
  const swText = await readFile(swPath, 'utf8');
  const list = parsePrecacheEntries(swText);

  let precacheBytes = 0;
  let missing = 0;

  for (const entry of list) {
    const rel = entry.url.replace(/^\//, '');
    const filePath = path.join(distDir, rel);
    try {
      precacheBytes += (await stat(filePath)).size;
    } catch {
      missing += 1;
    }
  }

  const mainJs = await findMainJs();
  const mainBuf = await readFile(mainJs);
  const mainGzip = await gzipSize(mainBuf);

  const checks = [
    {
      metric: 'SW precache total',
      value: precacheBytes,
      limit: PRECACHE_LIMIT,
      ok: precacheBytes <= PRECACHE_LIMIT && missing === 0,
    },
    {
      metric: `Main JS gzip (${path.basename(mainJs)})`,
      value: mainGzip,
      limit: MAIN_GZIP_LIMIT,
      ok: mainGzip <= MAIN_GZIP_LIMIT,
    },
  ];

  console.log('\nBudget report\n');
  console.log('| Metric | Value | Limit | Status |');
  console.log('|--------|-------|-------|--------|');
  for (const c of checks) {
    console.log(
      `| ${c.metric} | ${formatBytes(c.value)} | ${formatBytes(c.limit)} | ${c.ok ? 'PASS' : 'FAIL'} |`
    );
  }
  console.log(`\nPrecache files: ${list.length}${missing ? ` (${missing} missing on disk)` : ''}`);

  if (!checks.every((c) => c.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
