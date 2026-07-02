#!/usr/bin/env node
/**
 * Lighthouse performance gate (PLAN §7.6).
 * Mobile emulation, throttled, against built+previewed shelf route.
 * Performance score must be ≥ 85.
 *
 * Recent Lighthouse versions removed the standalone PWA category; when absent,
 * installability is covered by e2e/pwa.spec.ts (manifest + SW offline shell).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appDir = path.join(repoRoot, 'app');
const distDir = path.join(appDir, 'dist');
const outDir = path.join(repoRoot, '.lighthouse');
const reportPath = path.join(outDir, 'report.json');

const PERF_MIN = Number(process.env.LIGHTHOUSE_PERF_MIN ?? 85);
const HOST = '127.0.0.1';

const chromePath =
  process.env.CHROME_PATH ??
  process.env.PLAYWRIGHT_CHROME_PATH ??
  '/usr/bin/google-chrome-stable';

function runSync(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return r.status ?? 1;
}

function chromeAvailable() {
  return existsSync(chromePath);
}

function lighthouseBin() {
  const local = path.join(appDir, 'node_modules', 'lighthouse', 'cli', 'index.js');
  if (existsSync(local)) return ['node', [local]];
  return null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, HOST, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

function waitForPort(port, timeoutMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const sock = net.connect(port, HOST, () => {
        sock.end();
        resolve();
      });
      sock.on('error', () => {
        if (Date.now() - started > timeoutMs) reject(new Error(`preview not ready on :${port}`));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

function startPreview(port) {
  const child = spawn('npm', ['run', 'preview', '--', '--host', HOST, '--port', String(port)], {
    cwd: appDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NO_PROXY: 'localhost,127.0.0.1' },
  });
  return child;
}

async function main() {
  if (!existsSync(distDir)) {
    console.error('dist/ missing — run npm run build in app/ first');
    process.exit(1);
  }

  if (!chromeAvailable()) {
    console.log(`SKIP check:lighthouse — Chrome not found at ${chromePath}`);
    process.exit(0);
  }

  const lh = lighthouseBin();
  if (!lh) {
    console.log('SKIP check:lighthouse — lighthouse CLI not installed (npm install lighthouse in app/)');
    process.exit(0);
  }

  mkdirSync(outDir, { recursive: true });
  rmSync(reportPath, { force: true });

  const port = Number(process.env.LIGHTHOUSE_PORT) || (await freePort());
  const preview = startPreview(port);

  const proxyEnv = { ...process.env };
  delete proxyEnv.HTTP_PROXY;
  delete proxyEnv.HTTPS_PROXY;
  delete proxyEnv.http_proxy;
  delete proxyEnv.https_proxy;
  proxyEnv.NO_PROXY = 'localhost,127.0.0.1';

  try {
    await waitForPort(port);
    const URL = `http://${HOST}:${port}/`;

    const chromeFlags = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ];

    const lhArgs = [
      URL,
      '--output=json',
      `--output-path=${reportPath}`,
      '--quiet',
      '--form-factor=mobile',
      '--screenEmulation.mobile=true',
      '--throttling-method=simulate',
      `--chrome-flags=${chromeFlags.join(' ')}`,
      '--only-categories=performance',
    ];

    const [bin, prefix] = lh;
    const code = runSync(bin, [...prefix, ...lhArgs], {
      cwd: appDir,
      env: { ...proxyEnv, CHROME_PATH: chromePath },
    });
    if (code !== 0) {
      console.error('lighthouse CLI failed');
      process.exit(code);
    }

    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const perf = Math.round((report.categories?.performance?.score ?? 0) * 100);
    const hasPwa = Boolean(report.categories?.pwa);
    const pwa = hasPwa ? Math.round((report.categories.pwa.score ?? 0) * 100) : null;

    console.log('\nLighthouse report\n');
    console.log('| Category    | Score | Threshold |');
    console.log('|-------------|-------|-----------|');
    console.log(`| performance | ${perf}    | ≥ ${PERF_MIN}       | ${perf >= PERF_MIN ? 'PASS' : 'FAIL'} |`);

    if (hasPwa) {
      console.log(`| pwa         | ${pwa}    | audits    | ${pwa >= 90 ? 'PASS' : 'CHECK'} |`);
    } else {
      console.log(
        '\nNote: Lighthouse no longer reports a PWA category in this version.\n' +
          'Installability is validated by e2e/pwa.spec.ts (manifest link + SW offline shell).\n',
      );
    }

    if (perf < PERF_MIN) process.exit(1);
  } finally {
    preview.stdout?.destroy();
    preview.stderr?.destroy();
    if (!preview.killed) preview.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
