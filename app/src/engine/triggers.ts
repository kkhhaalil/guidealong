import { FWD_CONE } from './constants.ts';
import { bearing, haversine, angleDiff } from './geo.ts';
import type { LatLng, Stop } from './types.ts';

export interface TriggerContext {
  playingStopId?: string | null;
  queuedStopIds?: string[];
}

/**
 * Pure trigger evaluation — mirrors js/app.js checkTriggers().
 * Returns stops that should fire now, in tour order.
 */
export function evaluate(
  pos: LatLng,
  heading: number | null,
  stops: Stop[],
  visited: Set<string> | string[],
  ctx: TriggerContext = {},
): Stop[] {
  const visitedSet = visited instanceof Set ? visited : new Set(visited);
  const queued = new Set(ctx.queuedStopIds ?? []);
  const playingId = ctx.playingStopId ?? null;
  const triggered: Stop[] = [];

  for (const stop of stops) {
    if (visitedSet.has(stop.id)) continue;
    if (playingId === stop.id) continue;
    if (queued.has(stop.id)) continue;

    const d = haversine(pos, stop);
    if (d > stop.radius) continue;

    const ahead =
      heading === null ||
      d <= stop.radius * 0.5 ||
      angleDiff(heading, bearing(pos, stop)) <= FWD_CONE;

    if (!ahead) continue;
    triggered.push(stop);
  }

  return triggered;
}

export function isStopAhead(
  pos: LatLng,
  heading: number | null,
  stop: Stop,
): boolean {
  const d = haversine(pos, stop);
  if (d > stop.radius) return false;
  return (
    heading === null ||
    d <= stop.radius * 0.5 ||
    angleDiff(heading, bearing(pos, stop)) <= FWD_CONE
  );
}

export function shouldMarkVisited(
  triggered: boolean,
  pos: LatLng | null,
  stop: Stop,
): boolean {
  if (triggered) return true;
  if (!pos) return false;
  return haversine(pos, stop) <= stop.radius;
}
