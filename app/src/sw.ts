/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

type ManifestEntry = string | { url: string; revision?: string | null };

declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: ManifestEntry[];
  }
}

const LEGACY_CLEANUP_MSG = 'ga-cleanup-legacy';

let shellCacheName: string | null = null;

function manifestEntries(): Array<{ url: string; revision: string }> {
  return self.__WB_MANIFEST.map((entry) => {
    if (typeof entry === 'string') return { url: entry, revision: '' };
    return { url: entry.url, revision: entry.revision ?? '' };
  });
}

async function computeShellHash(): Promise<string> {
  const text = manifestEntries()
    .map((e) => `${e.url}:${e.revision}`)
    .sort()
    .join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

async function getShellCacheName(): Promise<string> {
  if (shellCacheName) return shellCacheName;
  const hash = await computeShellHash();
  shellCacheName = `shell-${hash}`;
  return shellCacheName;
}

function isAllowedCacheKey(key: string, currentShell: string): boolean {
  if (key === currentShell) return true;
  if (key.startsWith('tour-')) return true;
  if (key.startsWith('workbox-')) return true;
  return false;
}

function tourIdFromPath(pathname: string): string | null {
  const m = pathname.match(/\/tours\/([^/]+)\//);
  return m?.[1] ?? null;
}

async function matchTourCache(tourId: string, request: Request): Promise<Response | undefined> {
  const keys = await caches.keys();
  const tourCaches = keys.filter((k) => k.startsWith(`tour-${tourId}-v`)).sort().reverse();
  for (const name of tourCaches) {
    const cache = await caches.open(name);
    const hit = await cache.match(request);
    if (hit) return hit;
  }
  return undefined;
}

self.skipWaiting();

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const name = await getShellCacheName();
      const cache = await caches.open(name);
      const urls = [...new Set(manifestEntries().map((e) => e.url))];
      await cache.addAll(urls);
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const currentShell = await getShellCacheName();
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !isAllowedCacheKey(k, currentShell)).map((k) => caches.delete(k)),
      );
      await Promise.all(
        keys
          .filter((k) => k.startsWith('shell-') && k !== currentShell)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: LEGACY_CLEANUP_MSG });
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(serveShellDocument());
    return;
  }

  const tourId = tourIdFromPath(url.pathname);
  if (tourId) {
    event.respondWith(serveTourAsset(tourId, request));
    return;
  }

  event.respondWith(serveShellAsset(request));
});

async function serveShellDocument(): Promise<Response> {
  const name = await getShellCacheName();
  const cache = await caches.open(name);
  const cached =
    (await cache.match('index.html')) ??
    (await cache.match('./index.html')) ??
    (await cache.match('/index.html'));
  if (cached) return cached;
  return fetch('./index.html');
}

async function serveShellAsset(request: Request): Promise<Response> {
  const name = await getShellCacheName();
  const cache = await caches.open(name);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    return await fetch(request);
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// 1x1 transparent PNG. Served for image requests that miss both cache and
// network (e.g. map tiles outside a tour package's coverage, or optional
// per-stop photos a tour doesn't ship). A 200 keeps the console clean and
// lets <img> onerror/decode handling degrade gracefully; a 503 would log
// "Failed to load resource" for every legitimately-absent tile while offline.
const TRANSPARENT_PNG = Uint8Array.from(
  // Verified fully-transparent RGBA(0,0,0,0) pixel. (A previous revision's
  // base64 decoded to semi-transparent blue and tinted missing photos.)
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII='),
  (c) => c.charCodeAt(0),
);

function placeholderImage(): Response {
  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

async function serveTourAsset(tourId: string, request: Request): Promise<Response> {
  const cached = await matchTourCache(tourId, request);
  if (cached) return cached;
  const isImage = request.destination === 'image';
  try {
    const response = await fetch(request);
    // Tour packages only cover their corridor/bbox; tiles outside it 404 on
    // static hosting. Swallow those for images so the map degrades silently.
    if (!response.ok && isImage) return placeholderImage();
    return response;
  } catch {
    if (isImage) return placeholderImage();
    return new Response('Tour asset unavailable offline', { status: 503 });
  }
}

export {};
