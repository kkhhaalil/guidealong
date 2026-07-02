import { describe, expect, it } from 'vitest';
import { BASE_KMH, SIM_SPEEDS, TICK_MS } from '../constants.ts';
import { haversine } from '../geo.ts';
import { SimSource } from '../position.ts';
import { createFakeClock } from './helpers.ts';

const ROUTE: [number, number][] = [
  [44.0, -110.0],
  [44.001, -110.0],
  [44.002, -110.0],
];

describe('SimSource', () => {
  it('advances correct distance per tick at ×1', () => {
    const clock = createFakeClock();
    const sim = new SimSource(clock, { route: ROUTE, speedIndex: 0 });
    let last: { lat: number; lng: number } | null = null;
    sim.start((pos) => {
      last = pos;
    });

    const expectedMeters = (BASE_KMH / 3.6) * SIM_SPEEDS[0]! * (TICK_MS / 1000);
    const start = { lat: ROUTE[0][0], lng: ROUTE[0][1] };
    sim.tick();
    expect(last).not.toBeNull();
    const moved = haversine(start, last!);
    expect(moved).toBeCloseTo(expectedMeters, 0);
  });

  it('×8 multiplier moves 8× farther per tick', () => {
    const clock = createFakeClock();
    const sim1 = new SimSource(clock, { route: ROUTE, speedIndex: 0 });
    const sim8 = new SimSource(clock, { route: ROUTE, speedIndex: 3 });
    let pos1: { lat: number; lng: number } | null = null;
    let pos8: { lat: number; lng: number } | null = null;
    sim1.start((p) => {
      pos1 = p;
    });
    sim8.start((p) => {
      pos8 = p;
    });
    sim1.tick();
    sim8.tick();
    const d1 = haversine({ lat: ROUTE[0][0], lng: ROUTE[0][1] }, pos1!);
    const d8 = haversine({ lat: ROUTE[0][0], lng: ROUTE[0][1] }, pos8!);
    expect(d8 / d1).toBeCloseTo(8, 1);
  });

  it('wraps to route start at end', () => {
    const clock = createFakeClock();
    const sim = new SimSource(clock, {
      route: ROUTE,
      speedIndex: 5,
      initialIndex: 1.99,
    });
    let wrapped = false;
    sim.start(() => {});
    const simWithWrap = new SimSource(clock, {
      route: ROUTE,
      speedIndex: 5,
      initialIndex: 1.99,
      onWrap: () => {
        wrapped = true;
      },
    });
    simWithWrap.start(() => {});
    simWithWrap.tick();
    expect(wrapped).toBe(true);
    expect(simWithWrap.getFractionalIndex()).toBeLessThan(0.01);
  });

  it('cycles speed through SIM_SPEEDS', () => {
    const clock = createFakeClock();
    const sim = new SimSource(clock, { route: ROUTE });
    expect(sim.cycleSpeed()).toBe(4);
    expect(SIM_SPEEDS[sim.getSpeedIndex()]).toBe(16);
  });

  it('calls onTick every 10 ticks', () => {
    const clock = createFakeClock();
    let ticks = 0;
    const sim = new SimSource(clock, { route: ROUTE });
    sim.setOnTick(() => ticks++);
    sim.start(() => {});
    for (let i = 0; i < 10; i++) sim.tick();
    expect(ticks).toBe(1);
  });
});
