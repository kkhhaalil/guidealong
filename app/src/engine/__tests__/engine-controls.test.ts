import { describe, expect, it } from 'vitest';
import { createTourEngine } from '../engine.ts';
import { createMockChime } from '../chime.ts';
import { saveResume } from '../persist.ts';
import { SimSource } from '../position.ts';
import type { Stop } from '../types.ts';
import { createFakeClock, createMemoryStorage, createMockAudio } from './helpers.ts';

function stop(id: string): Stop {
  return {
    id,
    name: id,
    nameEn: id,
    lat: 44.0006,
    lng: -110,
    radius: 150,
    category: 'landmark',
    text: 'text',
  };
}

const manifest = { id: 'demo', title: 'Demo', titleEn: 'Demo' };

function makeEngine() {
  const storage = createMemoryStorage();
  const audio = createMockAudio();
  const engine = createTourEngine({
    audio,
    chime: createMockChime(),
    clock: createFakeClock(),
    storage,
    enableMediaSession: false,
    enableWakeLock: false,
  });
  return { engine, audio, storage };
}

describe('engine controls', () => {
  it('pause resume next prev seek', () => {
    const { engine, audio } = makeEngine();
    engine.loadTour(manifest, [stop('alpha')], [[44, -110], [44.01, -110]]);
    engine.play('alpha', { manual: true });
    engine.pause();
    expect(engine.getState().isPaused).toBe(true);
    engine.resume();
    engine.next();
    engine.prev();
    engine.seek(10);
    expect(audio.getCurrentTime()).toBe(10);
  });

  it('resetProgress clears visited', () => {
    const { engine } = makeEngine();
    engine.loadTour(manifest, [stop('alpha')], [[44, -110], [44.01, -110]]);
    engine.resetProgress();
    expect(engine.getState().visited).toEqual([]);
  });

  it('hasResume reflects stored position', () => {
    const { engine, storage } = makeEngine();
    engine.loadTour(manifest, [stop('alpha')], [[44, -110], [44.01, -110]]);
    expect(engine.hasResume()).toBe(false);
    saveResume(storage, 'demo', { simIdx: 5, speedIdx: 1, mode: 'sim' });
    engine.loadTour(manifest, [stop('alpha')], [[44, -110], [44.01, -110]]);
    expect(engine.hasResume()).toBe(true);
  });

  it('play more variant', () => {
    const { engine, audio } = makeEngine();
    const s = { ...stop('alpha'), more: 'extra' };
    engine.loadTour(manifest, [s], [[44, -110], [44.01, -110]]);
    engine.play('alpha', { manual: true });
    engine.play('alpha', { more: true });
    expect(audio.url).toBe('audio/alpha-more.mp3');
    expect(engine.getState().playingMore).toBe(true);
  });

  it('destroy stops sim interval', () => {
    const { engine } = makeEngine();
    engine.loadTour(manifest, [stop('alpha')], [[44, -110], [44.01, -110]]);
    const clock = createFakeClock();
    const sim = new SimSource(clock, { route: [[44, -110], [44.01, -110]] });
    engine.setPositionSource(sim);
    engine.destroy();
    expect(clock.intervals.size).toBe(0);
  });

  it('cycleSpeed and setSimPaused', () => {
    const { engine } = makeEngine();
    engine.loadTour(manifest, [stop('alpha')], [[44, -110], [44.01, -110]]);
    const clock = createFakeClock();
    const sim = new SimSource(clock, { route: [[44, -110], [44.01, -110]] });
    engine.setPositionSource(sim);
    engine.cycleSpeed();
    engine.setSimPaused(true);
    expect(engine.getState().simPaused).toBe(true);
  });

  it('clearQueue empties queue', () => {
    const { engine } = makeEngine();
    engine.loadTour(manifest, [stop('alpha'), stop('beta')], [[44, -110], [44.01, -110]]);
    engine.clearQueue();
    expect(engine.getState().queue).toEqual([]);
  });
});
