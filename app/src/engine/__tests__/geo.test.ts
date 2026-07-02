import { describe, expect, it } from 'vitest';
import { angleDiff, bearing, haversine } from '../geo.ts';

const R = 6371000;

function independentHaversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2);
  const t = Math.sin(dLng / 2);
  const h = s * s + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * t * t;
  return 2 * R * Math.asin(Math.sqrt(h));
}

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine({ lat: 44.5, lng: -110.5 }, { lat: 44.5, lng: -110.5 })).toBe(0);
  });

  it('matches independent implementation for NYC–Chicago', () => {
    const nyc = { lat: 40.7128, lng: -74.006 };
    const chicago = { lat: 41.8781, lng: -87.6298 };
    const d = haversine(nyc, chicago);
    const expected = independentHaversine(nyc, chicago);
    expect(d).toBeCloseTo(expected, 0);
    expect(d).toBeGreaterThan(1_100_000);
    expect(d).toBeLessThan(1_200_000);
  });

  it('≈111 km per degree latitude at equator', () => {
    const d = haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeCloseTo(111_195, -2);
  });
});

describe('bearing', () => {
  it('north is 0°', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 5);
  });

  it('east is 90°', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 5);
  });

  it('south is 180°', () => {
    expect(bearing({ lat: 1, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(180, 5);
  });

  it('west is 270°', () => {
    expect(bearing({ lat: 0, lng: 1 }, { lat: 0, lng: 0 })).toBeCloseTo(270, 5);
  });
});

describe('angleDiff', () => {
  it('returns minimal difference ≤ 180', () => {
    expect(angleDiff(350, 10)).toBe(20);
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(0, 180)).toBe(180);
    expect(angleDiff(0, 90)).toBe(90);
  });
});
