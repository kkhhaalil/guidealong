import { beforeEach, describe, expect, it } from 'vitest';
import { getVolume, setVolume, toggleMute } from './volumePreference.ts';

describe('volumePreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to full volume', () => {
    expect(getVolume()).toBe(1);
  });

  it('persists into ga.settings without clobbering other settings', () => {
    localStorage.setItem('ga.settings', JSON.stringify({ theme: 'dark' }));
    setVolume(0.4);
    expect(getVolume()).toBe(0.4);
    const settings = JSON.parse(localStorage.getItem('ga.settings')!) as Record<string, unknown>;
    expect(settings.theme).toBe('dark');
    expect(settings.volume).toBe(0.4);
  });

  it('clamps out-of-range and non-finite values', () => {
    setVolume(1.7);
    expect(getVolume()).toBe(1);
    setVolume(-3);
    expect(getVolume()).toBe(0);
    setVolume(Number.NaN);
    expect(getVolume()).toBe(1);
  });

  it('toggleMute mutes and restores the previous level', () => {
    setVolume(0.6);
    expect(toggleMute()).toBe(0);
    expect(getVolume()).toBe(0);
    expect(toggleMute()).toBe(0.6);
    expect(getVolume()).toBe(0.6);
  });

  it('unmuting with no remembered level restores full volume', () => {
    setVolume(0);
    expect(toggleMute()).toBe(1);
  });
});
