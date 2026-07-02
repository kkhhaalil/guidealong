import { describe, expect, it } from 'vitest';
import { createTourEngine } from '../engine.ts';
import { evaluate } from '../triggers.ts';
import { HEADING_MIN_MOVE_M } from '../constants.ts';
import { createMockChime } from '../chime.ts';
import { bearing, haversine } from '../geo.ts';
import { SimSource } from '../position.ts';
import type { Stop } from '../types.ts';
import {
  TracePositionSource,
  createFakeClock,
  createMemoryStorage,
  createMockAudio,
} from './helpers.ts';

function stop(id: string, lat: number, lng: number, radius: number): Stop {
  return {
    id,
    name: id,
    nameEn: id,
    lat,
    lng,
    radius,
    category: 'landmark',
    text: 'text',
  };
}

function makeEngine() {
  const storage = createMemoryStorage();
  const audio = createMockAudio();
  const chime = createMockChime();
  const clock = createFakeClock();
  const engine = createTourEngine({
    audio,
    chime,
    clock,
    storage,
    enableMediaSession: false,
    enableWakeLock: false,
  });
  return { engine, audio, chime, storage, clock };
}

describe('createTourEngine', () => {
  const manifest = { id: 'demo', title: 'Demo', titleEn: 'Demo' };
  const stops = [
    stop('alpha', 44.0006, -110.0, 150),
    stop('beta', 44.0012, -110.0, 150),
    stop('gamma', 44.0018, -110.0, 150),
  ];

  it('manual preview then auto-trigger on arrival', () => {
    const { engine, audio, chime } = makeEngine();
    const singleStop = [stop('alpha', 44.0006, -110.0, 150)];
    engine.loadTour(manifest, singleStop, [[44.0, -110.0], [44.002, -110.0]]);

    engine.play('alpha', { manual: true });
    expect(chime.count).toBe(0);
    audio.fireEnded();
    expect(engine.getState().visited).not.toContain('alpha');

    const trace = new TracePositionSource([
      { lat: 44.0005, lng: -110.0 },
      { lat: 44.0006, lng: -110.0 },
    ]);
    engine.setPositionSource(trace);
    expect(engine.getState().playingStopId).toBe('alpha');
    expect(chime.count).toBe(1);
    expect(engine.getState().visited).not.toContain('alpha');
  });

  it('queues triggers when two stops fire close together', () => {
    const { engine, audio, chime } = makeEngine();
    const closeStops = [
      stop('one', 44.001, -110.0, 300),
      stop('two', 44.00101, -110.0, 300),
    ];
    engine.loadTour(manifest, closeStops, [[44.0, -110.0], [44.002, -110.0]]);

    const triggers: string[] = [];
    engine.on('trigger', (id) => triggers.push(id as string));

    const trace = new TracePositionSource([{ lat: 44.001, lng: -110.0 }]);
    engine.setPositionSource(trace);

    expect(triggers).toEqual(['one', 'two']);
    expect(engine.getState().playingStopId).toBe('one');
    expect(engine.getState().queue).toEqual(['two']);

    audio.fireEnded();
    expect(engine.getState().playingStopId).toBe('two');
    expect(chime.count).toBe(2);
  });

  it('persists resume state round-trip', () => {
    const { engine, storage } = makeEngine();
    engine.loadTour(manifest, stops, [[44.0, -110.0], [44.002, -110.0]]);

    const clock = createFakeClock();
    const sim = new SimSource(clock, { route: [[44.0, -110.0], [44.01, -110.0]], speedIndex: 2 });
    engine.setPositionSource(sim);
    for (let i = 0; i < 10; i++) sim.tick();

    const raw = storage.getItem('ga.tour.demo.resume');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.simIdx).toBeGreaterThan(0);
    expect(parsed.speedIdx).toBe(2);

    const engine2 = createTourEngine({
      audio: createMockAudio(),
      chime: createMockChime(),
      clock: createFakeClock(),
      storage,
      enableMediaSession: false,
      enableWakeLock: false,
    });
    engine2.loadTour(manifest, stops, [[44.0, -110.0], [44.01, -110.0]]);
    expect(engine2.getState().fractionalIndex).toBeCloseTo(parsed.simIdx, 2);
    expect(engine2.getState().speedIndex).toBe(2);
  });
});

/**
 * Parity fixture: hand-crafted northbound trace along -110° longitude.
 * Positions spaced ~11 m (> HEADING_MIN_MOVE_M) so heading ≈ 0° (north).
 * Stops alpha/beta/gamma sit on the route; expected triggers derived via evaluate().
 */
describe('parity fixture', () => {
  const stops = [
    stop('alpha', 44.0006, -110.0, 150),
    stop('beta', 44.0012, -110.0, 150),
    stop('gamma', 44.0018, -110.0, 150),
  ];

  const trace: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= 50; i++) {
    trace.push({ lat: 44.0 + i * 0.0001, lng: -110.0 });
  }

  function deriveTriggers(
    positions: { lat: number; lng: number }[],
  ): string[] {
    const triggers: string[] = [];
    let heading: number | null = null;
    let prev: { lat: number; lng: number } | null = null;
    let playingId: string | null = null;
    const queue: string[] = [];
    const visited = new Set<string>();

    for (const pos of positions) {
      if (prev && haversine(prev, pos) > HEADING_MIN_MOVE_M) {
        heading = bearing(prev, pos);
      }
      const candidates = evaluate(pos, heading, stops, visited, {
        playingStopId: playingId,
        queuedStopIds: queue,
      });
      for (const s of candidates) {
        triggers.push(s.id);
        if (playingId) queue.push(s.id);
        else playingId = s.id;
      }
      prev = pos;
    }
    return triggers;
  }

  it('engine trigger sequence matches hand-derived evaluate trace', () => {
    const { engine } = makeEngine();
    engine.loadTour({ id: 'parity', title: 'P', titleEn: 'P' }, stops, trace.map((p) => [p.lat, p.lng]));

    const engineTriggers: string[] = [];
    engine.on('trigger', (id) => engineTriggers.push(id as string));

    const src = new TracePositionSource(trace);
    engine.setPositionSource(src);

    const handTriggers = deriveTriggers(trace);

    expect(engineTriggers).toEqual(handTriggers);
    expect(engineTriggers[0]).toBe('alpha');
    expect(engineTriggers).toContain('beta');
    expect(engineTriggers).toContain('gamma');
  });
});
