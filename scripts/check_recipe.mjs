#!/usr/bin/env node
/**
 * Recipe eval driver (PLAN §7.8): scaffold test-park, run recipe E2E, always clean up.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appDir = path.join(repoRoot, 'app');
const TOUR_ID = process.env.RECIPE_TOUR_ID ?? 'test-park';

function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ ${label}: ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: opts.cwd ?? repoRoot, env: opts.env ?? process.env });
  if ((r.status ?? 1) !== 0) {
    const err = new Error(`${label} failed (exit ${r.status})`);
    err.exitCode = r.status ?? 1;
    throw err;
  }
}

let failed = false;

try {
  run('scaffold', 'python3', ['scripts/new_tour.py', '--id', TOUR_ID, '--from-fixture']);
  run('build', 'npm', ['run', 'build'], { cwd: appDir });
  run('recipe e2e', 'npx', ['playwright', 'test', '../e2e/recipe.spec.ts'], {
    cwd: appDir,
    env: { ...process.env, NODE_PATH: path.join(appDir, 'node_modules'), E2E_RECIPE: '1' },
  });
} catch (e) {
  failed = true;
  console.error(e.message ?? e);
} finally {
  try {
    run('cleanup', 'python3', ['scripts/new_tour.py', '--remove', TOUR_ID]);
  } catch (cleanupErr) {
    failed = true;
    console.error('cleanup failed:', cleanupErr.message ?? cleanupErr);
  }
}

process.exit(failed ? 1 : 0);
