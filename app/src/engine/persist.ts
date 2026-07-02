import { PERSIST_SCHEMA_VERSION } from './constants.ts';
import type { PositionMode, ResumeState, StoragePort } from './types.ts';

export const STORAGE_KEYS = {
  settings: 'ga.settings',
  activeTour: 'ga.activeTour',
  visited: (tourId: string) => `ga.tour.${tourId}.visited`,
  resume: (tourId: string) => `ga.tour.${tourId}.resume`,
} as const;

export function loadVisited(storage: StoragePort, tourId: string): Set<string> {
  try {
    const raw = storage.getItem(STORAGE_KEYS.visited(tourId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { v?: number; ids?: string[] } | string[];
    if (Array.isArray(parsed)) return new Set(parsed);
    if (parsed.v !== PERSIST_SCHEMA_VERSION || !Array.isArray(parsed.ids)) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

export function saveVisited(storage: StoragePort, tourId: string, visited: Set<string>): void {
  try {
    const payload = { v: PERSIST_SCHEMA_VERSION, ids: Array.from(visited) };
    storage.setItem(STORAGE_KEYS.visited(tourId), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function loadResume(storage: StoragePort, tourId: string): ResumeState | null {
  try {
    const raw = storage.getItem(STORAGE_KEYS.resume(tourId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (parsed.v !== PERSIST_SCHEMA_VERSION) return null;
    if (typeof parsed.simIdx !== 'number' || typeof parsed.speedIdx !== 'number') return null;
    if (parsed.mode !== 'sim' && parsed.mode !== 'gps') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveResume(
  storage: StoragePort,
  tourId: string,
  data: Omit<ResumeState, 'v' | 'ts'>,
): void {
  try {
    const payload: ResumeState = {
      v: PERSIST_SCHEMA_VERSION,
      simIdx: data.simIdx,
      speedIdx: data.speedIdx,
      mode: data.mode,
      ts: Date.now(),
    };
    storage.setItem(STORAGE_KEYS.resume(tourId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearResume(storage: StoragePort, tourId: string): void {
  try {
    storage.removeItem(STORAGE_KEYS.resume(tourId));
  } catch {
    // ignore
  }
}

export function setActiveTour(storage: StoragePort, tourId: string | null): void {
  try {
    if (tourId) storage.setItem(STORAGE_KEYS.activeTour, tourId);
    else storage.removeItem(STORAGE_KEYS.activeTour);
  } catch {
    // ignore
  }
}

export function getActiveTour(storage: StoragePort): string | null {
  return storage.getItem(STORAGE_KEYS.activeTour);
}

export function clearTourProgress(storage: StoragePort, tourId: string): void {
  clearResume(storage, tourId);
  try {
    storage.removeItem(STORAGE_KEYS.visited(tourId));
  } catch {
    // ignore
  }
}

export function hasResume(storage: StoragePort, tourId: string, minIdx: number): boolean {
  const resume = loadResume(storage, tourId);
  return resume != null && resume.simIdx > minIdx && resume.mode === 'sim';
}

export type { ResumeState, PositionMode };
