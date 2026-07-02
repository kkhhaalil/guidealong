import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  completeMarkerPath,
  tourAssetPath,
  tourCacheName,
} from '../cacheNames.ts';
import { DownloadManager } from '../downloadManager.ts';
import { createMockCacheStorage, type MockCacheStorage } from './mockCacheStorage.ts';

const TOUR_ID = 'demo';
const VERSION = 'c2958f497dce';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

const FILES = [
  { path: 'stops.json', bytes: 100 },
  { path: 'route.json', bytes: 50 },
  { path: 'audio/a.mp3', bytes: 200 },
];

const DEMO_MANIFEST = JSON.parse(
  readFileSync(join(repoRoot, 'tours/demo/manifest.json'), 'utf-8'),
) as Record<string, unknown>;

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupFetch(mockStorage: MockCacheStorage): void {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    if (url.endsWith('manifest.json')) {
      return jsonResponse(DEMO_MANIFEST);
    }
    if (url.endsWith('files.json')) {
      return jsonResponse(FILES);
    }
    const assetMatch = /tours\/demo\/(.+)$/.exec(url);
    if (assetMatch) {
      const path = assetMatch[1];
      const entry = FILES.find((f) => f.path === path);
      return new Response(`payload-${path}`, {
        headers: { 'Content-Length': String(entry?.bytes ?? 0) },
      });
    }
    return new Response('not found', { status: 404 });
  };

  Object.defineProperty(globalThis, 'caches', {
    value: mockStorage,
    configurable: true,
  });
}

describe('downloadManager', () => {
  let mockStorage: MockCacheStorage;
  let manager: DownloadManager;

  beforeEach(() => {
    mockStorage = createMockCacheStorage();
    setupFetch(mockStorage);
    manager = new DownloadManager();
  });

  it('downloads all files and writes complete marker', async () => {
    const progress: number[] = [];
    await manager.downloadTour(TOUR_ID, {
      version: VERSION,
      onProgress: (p) => progress.push(p.bytesDone),
    });

    const state = await manager.getTourState(TOUR_ID, VERSION);
    expect(state.status).toBe('ready');
    if (state.status === 'ready') expect(state.cachedVersion).toBe(VERSION);

    const cache = await caches.open(tourCacheName(TOUR_ID, VERSION));
    for (const file of FILES) {
      expect(await cache.match(tourAssetPath(TOUR_ID, file.path))).toBeTruthy();
    }
    expect(await cache.match(completeMarkerPath(TOUR_ID))).toBeTruthy();

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(350);
  });

  it('resumes by skipping files already in cache', async () => {
    const cache = await mockStorage.open(tourCacheName(TOUR_ID, VERSION));
    await cache.put(tourAssetPath(TOUR_ID, 'stops.json'), new Response('cached'));
    await cache.put(tourAssetPath(TOUR_ID, 'files.json'), jsonResponse(FILES));
    await cache.put(tourAssetPath(TOUR_ID, 'manifest.json'), jsonResponse(DEMO_MANIFEST));

    let fetchCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('stops.json')) fetchCount += 1;
      return origFetch(input, init);
    };

    await manager.downloadTour(TOUR_ID, { version: VERSION });
    expect(fetchCount).toBe(0);
  });

  it('abort leaves partial cache and paused state', async () => {
    let assetFetches = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const assetMatch = /tours\/demo\/(.+)$/.exec(url);
      if (assetMatch && !url.endsWith('manifest.json') && !url.endsWith('files.json')) {
        assetFetches += 1;
        if (assetFetches >= 2) {
          manager.abortDownload(TOUR_ID);
          throw new DOMException('Aborted', 'AbortError');
        }
      }
      return origFetch(input, init);
    };

    await manager.downloadTour(TOUR_ID, { version: VERSION });
    const state = await manager.getTourState(TOUR_ID, VERSION);
    expect(state.status).toBe('paused');
    expect(state.progress.filesDone).toBeGreaterThan(0);
  });

  it('delete removes tour caches and is not-downloaded', async () => {
    await manager.downloadTour(TOUR_ID, { version: VERSION });
    await manager.deleteTour(TOUR_ID);
    const keys = await caches.keys();
    expect(keys.some((k) => k.startsWith(`tour-${TOUR_ID}-`))).toBe(false);
    const state = await manager.getTourState(TOUR_ID, VERSION);
    expect(state.status).toBe('not-downloaded');
  });
});
