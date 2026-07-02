import { STORAGE_KEYS } from '../engine/persist.ts';
import { browserStorage } from '../engine-adapters/browserStorage.ts';
import { pushGaEvent } from '../test/gaSurface.ts';

/**
 * Narration volume preference (0–1), persisted in `ga.settings` alongside
 * the theme override (§6.4 — nothing else touches storage). Applied to the
 * narration HTMLAudioElement and the chime gain; note iOS ignores element
 * volume (hardware buttons rule there) — the control degrades silently.
 */

interface VolumeSettings {
  volume?: number;
  /** Level to restore when unmuting. */
  lastVolume?: number;
  [key: string]: unknown;
}

const DEFAULT_VOLUME = 1;

const listeners = new Set<() => void>();

function loadSettings(): VolumeSettings {
  try {
    const raw = browserStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return {};
    return JSON.parse(raw) as VolumeSettings;
  } catch {
    return {};
  }
}

function saveSettings(settings: VolumeSettings): void {
  try {
    browserStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, v));
}

export function getVolume(): number {
  const v = loadSettings().volume;
  return typeof v === 'number' ? clamp(v) : DEFAULT_VOLUME;
}

export function setVolume(volume: number): void {
  const v = clamp(volume);
  const settings = loadSettings();
  settings.volume = v;
  if (v > 0) settings.lastVolume = v;
  saveSettings(settings);
  pushGaEvent({ type: 'volume', value: v });
  notifyListeners();
}

/** Mute ⇄ restore the previous audible level. Returns the new volume. */
export function toggleMute(): number {
  const current = getVolume();
  if (current > 0) {
    setVolume(0);
    return 0;
  }
  const restore = clamp(loadSettings().lastVolume ?? DEFAULT_VOLUME);
  const v = restore > 0 ? restore : DEFAULT_VOLUME;
  setVolume(v);
  return v;
}

export function subscribeToVolumeChanges(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(): void {
  for (const cb of listeners) cb();
}

/** Keep an audio element's volume synced to the preference. Returns unsubscribe. */
export function bindAudioElementVolume(el: HTMLAudioElement): () => void {
  el.volume = getVolume();
  return subscribeToVolumeChanges(() => {
    el.volume = getVolume();
  });
}
