import { describe, expect, it } from 'vitest';
import { PERSIST_SCHEMA_VERSION } from '../constants.ts';
import {
  STORAGE_KEYS,
  clearTourProgress,
  hasResume,
  loadResume,
  loadVisited,
  saveResume,
  saveVisited,
  setActiveTour,
} from '../persist.ts';
import { createMemoryStorage } from './helpers.ts';

describe('persistence keys §6.4', () => {
  it('uses exact key names', () => {
    expect(STORAGE_KEYS.settings).toBe('ga.settings');
    expect(STORAGE_KEYS.activeTour).toBe('ga.activeTour');
    expect(STORAGE_KEYS.visited('yellowstone')).toBe('ga.tour.yellowstone.visited');
    expect(STORAGE_KEYS.resume('yellowstone')).toBe('ga.tour.yellowstone.resume');
  });
});

describe('visited round-trip', () => {
  it('saves and loads versioned visited set', () => {
    const storage = createMemoryStorage();
    const visited = new Set(['a', 'b']);
    saveVisited(storage, 'demo', visited);
    const loaded = loadVisited(storage, 'demo');
    expect(loaded).toEqual(new Set(['a', 'b']));
    const raw = JSON.parse(storage.getItem('ga.tour.demo.visited')!);
    expect(raw.v).toBe(PERSIST_SCHEMA_VERSION);
  });

  it('discards schema mismatch', () => {
    const storage = createMemoryStorage();
    storage.setItem('ga.tour.demo.visited', JSON.stringify({ v: 999, ids: ['x'] }));
    expect(loadVisited(storage, 'demo')).toEqual(new Set());
  });

  it('loads legacy string array visited format', () => {
    const storage = createMemoryStorage();
    storage.setItem('ga.tour.demo.visited', JSON.stringify(['legacy']));
    expect(loadVisited(storage, 'demo')).toEqual(new Set(['legacy']));
  });
});

describe('resume round-trip', () => {
  it('saves and restores sim state', () => {
    const storage = createMemoryStorage();
    saveResume(storage, 'demo', { simIdx: 12.5, speedIdx: 3, mode: 'sim' });
    const loaded = loadResume(storage, 'demo');
    expect(loaded?.simIdx).toBe(12.5);
    expect(loaded?.speedIdx).toBe(3);
    expect(loaded?.mode).toBe('sim');
    expect(loaded?.v).toBe(PERSIST_SCHEMA_VERSION);
  });

  it('hasResume respects min index', () => {
    const storage = createMemoryStorage();
    saveResume(storage, 'demo', { simIdx: 1, speedIdx: 0, mode: 'sim' });
    expect(hasResume(storage, 'demo', 2)).toBe(false);
    saveResume(storage, 'demo', { simIdx: 5, speedIdx: 0, mode: 'sim' });
    expect(hasResume(storage, 'demo', 2)).toBe(true);
  });

  it('clearTourProgress removes visited and resume', () => {
    const storage = createMemoryStorage();
    saveVisited(storage, 'demo', new Set(['a']));
    saveResume(storage, 'demo', { simIdx: 5, speedIdx: 0, mode: 'sim' });
    clearTourProgress(storage, 'demo');
    expect(loadVisited(storage, 'demo').size).toBe(0);
    expect(loadResume(storage, 'demo')).toBeNull();
  });
});

describe('active tour', () => {
  it('persists active tour id', () => {
    const storage = createMemoryStorage();
    setActiveTour(storage, 'yellowstone');
    expect(storage.getItem('ga.activeTour')).toBe('yellowstone');
    setActiveTour(storage, null);
    expect(storage.getItem('ga.activeTour')).toBeNull();
  });
});
