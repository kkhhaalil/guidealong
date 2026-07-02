import fs from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';

const TOURS_PREFIX = '/tours/';

function toursMiddleware(toursRoot: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith(TOURS_PREFIX)) {
      next();
      return;
    }

    const rel = decodeURIComponent(url.slice(TOURS_PREFIX.length).split('?')[0] ?? '');
    if (!rel || rel.includes('..')) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    const filePath = path.join(toursRoot, rel);
    if (!filePath.startsWith(toursRoot)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        next();
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const types: Record<string, string> = {
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
      };
      res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    });
  };
}

/** Serve /workspace/tours at /tours/ in dev and preview; copy index.json into dist for SW precache. */
export function toursPlugin(): Plugin {
  const toursRoot = path.resolve(__dirname, '../tours');

  return {
    name: 'vite-plugin-tours',
    configureServer(server) {
      server.middlewares.use(toursMiddleware(toursRoot));
    },
    configurePreviewServer(server) {
      server.middlewares.use(toursMiddleware(toursRoot));
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const destDir = path.join(outDir, 'tours');
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(
        path.join(toursRoot, 'index.json'),
        path.join(destDir, 'index.json'),
      );
    },
  };
}
