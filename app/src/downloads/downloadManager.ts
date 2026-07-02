import { tourFilesSchema, tourManifestSchema, type TourFileEntry, type TourIndexEntry } from '../types/tour.ts';
import { clearTourProgress, STORAGE_KEYS } from '../engine/persist.ts';
import {
  completeMarkerPath,
  tourAssetPath,
  tourCacheName,
} from './cacheNames.ts';
import type { CompleteMarker, DownloadProgress, TourDownloadState } from './types.ts';

const CONCURRENCY = 4;
const MANIFEST_PATH = 'manifest.json';
const FILES_PATH = 'files.json';

export type ProgressCallback = (progress: DownloadProgress) => void;

function emptyProgress(): DownloadProgress {
  return { filesDone: 0, filesTotal: 0, bytesDone: 0, bytesTotal: 0 };
}

function percentFromProgress(p: DownloadProgress): number {
  if (p.bytesTotal <= 0) return 0;
  return Math.min(100, Math.round((p.bytesDone / p.bytesTotal) * 100));
}

function totalBytes(files: TourFileEntry[]): number {
  return files.reduce((sum, f) => sum + f.bytes, 0);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as T;
}

async function readCompleteMarker(
  cache: Cache,
  tourId: string,
): Promise<CompleteMarker | null> {
  const res = await cache.match(completeMarkerPath(tourId));
  if (!res) return null;
  try {
    return (await res.clone().json()) as CompleteMarker;
  } catch {
    return null;
  }
}

async function listTourCaches(tourId: string): Promise<string[]> {
  const keys = await caches.keys();
  return keys.filter((k) => k.startsWith(`tour-${tourId}-v`)).sort();
}

async function countCachedProgress(
  cache: Cache,
  tourId: string,
  files: TourFileEntry[],
): Promise<DownloadProgress> {
  let filesDone = 0;
  let bytesDone = 0;
  const bytesTotal = totalBytes(files);
  for (const file of files) {
    const hit = await cache.match(tourAssetPath(tourId, file.path));
    if (hit) {
      filesDone += 1;
      bytesDone += file.bytes;
    }
  }
  return {
    filesDone,
    filesTotal: files.length,
    bytesDone,
    bytesTotal,
  };
}

async function verifyAllFilesPresent(
  cache: Cache,
  tourId: string,
  files: TourFileEntry[],
): Promise<boolean> {
  for (const file of files) {
    const hit = await cache.match(tourAssetPath(tourId, file.path));
    if (!hit) return false;
  }
  return true;
}

async function writeCompleteMarker(
  cache: Cache,
  tourId: string,
  version: string,
): Promise<void> {
  const body: CompleteMarker = { version, ts: Date.now() };
  await cache.put(
    completeMarkerPath(tourId),
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

async function copyMatchingFiles(
  fromCache: Cache,
  toCache: Cache,
  tourId: string,
  unchanged: Set<string>,
): Promise<void> {
  await Promise.all(
    [...unchanged].map(async (path) => {
      const key = tourAssetPath(tourId, path);
      const res = await fromCache.match(key);
      if (res) await toCache.put(key, res.clone());
    }),
  );
}

function unchangedFilePaths(
  oldFiles: TourFileEntry[],
  newFiles: TourFileEntry[],
): Set<string> {
  const oldMap = new Map(oldFiles.map((f) => [f.path, f.bytes]));
  const unchanged = new Set<string>();
  for (const f of newFiles) {
    if (oldMap.get(f.path) === f.bytes) unchanged.add(f.path);
  }
  return unchanged;
}

function clearTourLocalStorage(tourId: string): void {
  clearTourProgress(localStorage, tourId);
  try {
    const prefix = `ga.tour.${tourId}.`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function deleteAllTourCaches(tourId: string): Promise<void> {
  const keys = await listTourCaches(tourId);
  await Promise.all(keys.map((k) => caches.delete(k)));
}

export class DownloadManager {
  private readonly controllers = new Map<string, AbortController>();
  private readonly activeVersion = new Map<string, string>();
  private readonly liveProgress = new Map<string, DownloadProgress>();

  isDownloading(tourId: string): boolean {
    return this.controllers.has(tourId);
  }

  abortDownload(tourId: string): void {
    this.controllers.get(tourId)?.abort();
    this.controllers.delete(tourId);
    this.activeVersion.delete(tourId);
  }

  async getTourState(
    tourId: string,
    latestVersion?: string,
  ): Promise<TourDownloadState> {
    if (this.controllers.has(tourId)) {
      const progress = this.liveProgress.get(tourId) ?? emptyProgress();
      return {
        status: 'downloading',
        tourId,
        progress,
        percent: percentFromProgress(progress),
      };
    }

    const cacheKeys = await listTourCaches(tourId);
    let readyVersion: string | null = null;

    for (const key of [...cacheKeys].reverse()) {
      const cache = await caches.open(key);
      const marker = await readCompleteMarker(cache, tourId);
      if (marker) {
        readyVersion = marker.version;
        break;
      }
    }

    if (readyVersion) {
      const progress: DownloadProgress = {
        filesDone: 0,
        filesTotal: 0,
        bytesDone: 0,
        bytesTotal: 0,
      };
      const base = {
        tourId,
        progress,
        percent: 100,
        cachedVersion: readyVersion,
      };
      if (latestVersion && latestVersion !== readyVersion) {
        return {
          ...base,
          status: 'update-available',
          latestVersion,
        };
      }
      return { ...base, status: 'ready' };
    }

    // Partial download — find cache with most progress
    let best: { key: string; progress: DownloadProgress } | null = null;
    for (const key of cacheKeys) {
      const cache = await caches.open(key);
      const files = await readFilesFromCache(cache, tourId);
      if (!files) continue;
      const progress = await countCachedProgress(cache, tourId, files);
      if (progress.filesDone > 0 && (!best || progress.bytesDone > best.progress.bytesDone)) {
        best = { key, progress };
      }
    }

    if (best && best.progress.filesDone > 0) {
      return {
        status: 'paused',
        tourId,
        progress: best.progress,
        percent: percentFromProgress(best.progress),
      };
    }

    return {
      status: 'not-downloaded',
      tourId,
      progress: emptyProgress(),
      percent: 0,
    };
  }

  async scanAllTourStates(
    index: TourIndexEntry[],
  ): Promise<Record<string, TourDownloadState>> {
    const out: Record<string, TourDownloadState> = {};
    await Promise.all(
      index.map(async (entry) => {
        out[entry.id] = await this.getTourState(entry.id, entry.version);
      }),
    );
    return out;
  }

  async downloadTour(
    tourId: string,
    opts?: { version?: string; isUpdate?: boolean; onProgress?: ProgressCallback },
  ): Promise<void> {
    if (this.controllers.has(tourId)) return;

    const manifest = tourManifestSchema.parse(
      await fetchJson<unknown>(tourAssetPath(tourId, MANIFEST_PATH)),
    );
    const version = opts?.version ?? manifest.version;
    const files = tourFilesSchema.parse(
      await fetchJson<unknown>(tourAssetPath(tourId, FILES_PATH)),
    );

    const controller = new AbortController();
    this.controllers.set(tourId, controller);
    this.activeVersion.set(tourId, version);
    this.liveProgress.set(tourId, emptyProgress());
    const { signal } = controller;

    const cacheName = tourCacheName(tourId, version);
    const cache = await caches.open(cacheName);

    // Cache manifest for offline reads
    const manifestRes = await fetch(tourAssetPath(tourId, MANIFEST_PATH), { signal });
    await cache.put(tourAssetPath(tourId, MANIFEST_PATH), manifestRes.clone());
    const filesRes = await fetch(tourAssetPath(tourId, FILES_PATH), { signal });
    await cache.put(tourAssetPath(tourId, FILES_PATH), filesRes.clone());

    let oldCache: Cache | null = null;
    let unchanged = new Set<string>();
    if (opts?.isUpdate) {
      const oldKeys = await listTourCaches(tourId);
      const oldKey = oldKeys.find((k) => k !== cacheName);
      if (oldKey) {
        oldCache = await caches.open(oldKey);
        const oldFiles = (await readFilesFromCache(oldCache, tourId)) ?? files;
        unchanged = unchangedFilePaths(oldFiles, files);
        await copyMatchingFiles(oldCache, cache, tourId, unchanged);
      }
    }

    const progress: DownloadProgress = {
      filesDone: 0,
      filesTotal: files.length,
      bytesDone: 0,
      bytesTotal: totalBytes(files),
    };

    // Count already-cached files (resume / update copy)
    for (const file of files) {
      const hit = await cache.match(tourAssetPath(tourId, file.path));
      if (hit) {
        progress.filesDone += 1;
        progress.bytesDone += file.bytes;
      }
    }
    this.liveProgress.set(tourId, { ...progress });
    opts?.onProgress?.({ ...progress });

    const pending = files.filter((f) => {
      if (unchanged.has(f.path)) return false;
      return true;
    });

    try {
      await runPool(pending, CONCURRENCY, async (file) => {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const url = tourAssetPath(tourId, file.path);
        const existing = await cache.match(url);
        if (existing) return;

        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        await cache.put(url, res.clone());

        progress.filesDone += 1;
        progress.bytesDone += file.bytes;
        this.liveProgress.set(tourId, { ...progress });
        opts?.onProgress?.({ ...progress });
      });

      const ok = await verifyAllFilesPresent(cache, tourId, files);
      if (!ok) throw new Error(`Tour ${tourId}: verify-complete failed`);

      await writeCompleteMarker(cache, tourId, version);

      if (opts?.isUpdate && oldCache) {
        const oldKeys = await listTourCaches(tourId);
        await Promise.all(
          oldKeys.filter((k) => k !== cacheName).map((k) => caches.delete(k)),
        );
      }

      if (navigator.storage?.persist) {
        void navigator.storage.persist();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      throw err;
    } finally {
      this.controllers.delete(tourId);
      this.activeVersion.delete(tourId);
      this.liveProgress.delete(tourId);
    }
  }

  async deleteTour(tourId: string): Promise<void> {
    this.abortDownload(tourId);
    await deleteAllTourCaches(tourId);
    clearTourLocalStorage(tourId);
    if (localStorage.getItem(STORAGE_KEYS.activeTour) === tourId) {
      localStorage.removeItem(STORAGE_KEYS.activeTour);
    }
  }
}

async function readFilesFromCache(
  cache: Cache,
  tourId: string,
): Promise<TourFileEntry[] | null> {
  const res = await cache.match(tourAssetPath(tourId, FILES_PATH));
  if (!res) return null;
  try {
    return tourFilesSchema.parse(await res.json());
  } catch {
    return null;
  }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i]);
    }
  });
  await Promise.all(runners);
}

/** Singleton used by the download store and UI. */
export const downloadManager = new DownloadManager();
