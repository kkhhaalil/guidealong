import {
  routeSchema,
  stopsSchema,
  tourIndexSchema,
  tourManifestSchema,
  type Route,
  type Stop,
  type TourIndex,
  type TourManifest,
} from '../types/tour.ts';

const TOURS_BASE = 'tours';

export function tourFileUrl(tourId: string, relPath: string): string {
  const clean = relPath.replace(/^\/+/, '');
  return `${TOURS_BASE}/${tourId}/${clean}`;
}

async function fetchJson<T>(url: string, parse: (data: unknown) => T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data: unknown = await res.json();
  return parse(data);
}

export async function getTourIndex(): Promise<TourIndex> {
  return fetchJson(`${TOURS_BASE}/index.json`, (d) => tourIndexSchema.parse(d));
}

export async function getManifest(id: string): Promise<TourManifest> {
  return fetchJson(tourFileUrl(id, 'manifest.json'), (d) => tourManifestSchema.parse(d));
}

export async function getStops(id: string): Promise<Stop[]> {
  return fetchJson(tourFileUrl(id, 'stops.json'), (d) => stopsSchema.parse(d));
}

export async function getRoute(id: string): Promise<Route> {
  return fetchJson(tourFileUrl(id, 'route.json'), (d) => routeSchema.parse(d));
}
