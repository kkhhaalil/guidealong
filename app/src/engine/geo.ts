import type { LatLng } from './types.ts';

const R = 6371000;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const s = Math.sin(dLat / 2);
  const t = Math.sin(dLng / 2);
  const h = s * s + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * t * t;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a to b in degrees [0, 360). */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin((b.lng - a.lng) * RAD) * Math.cos(b.lat * RAD);
  const x =
    Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) -
    Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lng - a.lng) * RAD);
  return (Math.atan2(y, x) * DEG + 360) % 360;
}

/** Minimal absolute angular difference in degrees (≤ 180). */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Interpolate lat/lng between two route points. */
export function interpolateRoute(
  route: [number, number][],
  fractionalIndex: number,
): LatLng {
  const i = Math.floor(fractionalIndex);
  const frac = fractionalIndex - i;
  const a = route[i] ?? route[0];
  const b = route[Math.min(i + 1, route.length - 1)] ?? a;
  return { lat: a[0] + (b[0] - a[0]) * frac, lng: a[1] + (b[1] - a[1]) * frac };
}

/** Precompute per-segment lengths along a route (meters). */
export function segmentLengths(route: [number, number][]): number[] {
  const lengths: number[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    lengths.push(
      haversine(
        { lat: route[i][0], lng: route[i][1] },
        { lat: route[i + 1][0], lng: route[i + 1][1] },
      ),
    );
  }
  return lengths;
}
