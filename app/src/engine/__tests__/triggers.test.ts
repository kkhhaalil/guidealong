import { describe, expect, it } from 'vitest';
import { evaluate, isStopAhead, shouldMarkVisited } from '../triggers.ts';
import type { Stop } from '../types.ts';

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

describe('evaluate', () => {
  const stops = [stop('a', 44.001, -110.0, 200)];

  it('triggers when in radius and heading toward stop', () => {
    const pos = { lat: 44.0009, lng: -110.0 };
    const heading = 0;
    expect(evaluate(pos, heading, stops, new Set())).toHaveLength(1);
  });

  it('does not trigger when in radius but out of forward cone', () => {
    const pos = { lat: 44.0, lng: -110.0 };
    const heading = 180;
    expect(evaluate(pos, heading, stops, new Set())).toHaveLength(0);
  });

  it('triggers within half radius even when out of cone', () => {
    const pos = { lat: 44.001, lng: -110.0 };
    const heading = 180;
    const tight = [stop('a', 44.001, -110.0, 400)];
    expect(evaluate(pos, heading, tight, new Set())).toHaveLength(1);
  });

  it('triggers with unknown heading (null)', () => {
    const pos = { lat: 44.0009, lng: -110.0 };
    expect(evaluate(pos, null, stops, new Set())).toHaveLength(1);
  });

  it('excludes visited stops', () => {
    const pos = { lat: 44.0009, lng: -110.0 };
    expect(evaluate(pos, 0, stops, new Set(['a']))).toHaveLength(0);
  });

  it('excludes currently playing stop', () => {
    const pos = { lat: 44.0009, lng: -110.0 };
    expect(evaluate(pos, 0, stops, new Set(), { playingStopId: 'a' })).toHaveLength(0);
  });

  it('excludes queued stops', () => {
    const pos = { lat: 44.0009, lng: -110.0 };
    expect(evaluate(pos, 0, stops, new Set(), { queuedStopIds: ['a'] })).toHaveLength(0);
  });
});

describe('shouldMarkVisited', () => {
  const s = stop('a', 44.0, -110.0, 100);

  it('marks visited when auto-triggered', () => {
    expect(shouldMarkVisited(true, { lat: 44.1, lng: -110 }, s)).toBe(true);
  });

  it('manual preview far away does not mark visited', () => {
    expect(shouldMarkVisited(false, { lat: 44.1, lng: -110 }, s)).toBe(false);
  });

  it('manual play within radius marks visited', () => {
    expect(shouldMarkVisited(false, { lat: 44.0, lng: -110 }, s)).toBe(true);
  });
});

describe('isStopAhead', () => {
  it('matches evaluate ahead logic', () => {
    const s = stop('a', 44.001, -110.0, 200);
    const posNear = { lat: 44.0, lng: -110.0 };
    const posAt = { lat: 44.001, lng: -110.0 };
    expect(isStopAhead(posNear, 0, s)).toBe(true);
    expect(isStopAhead(posNear, 180, s)).toBe(false);
    expect(isStopAhead(posAt, 180, s)).toBe(true);
  });
});
