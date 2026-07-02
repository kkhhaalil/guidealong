/** Cache name for a versioned tour package (PLAN §6.4). */
export function tourCacheName(tourId: string, version: string): string {
  return `tour-${tourId}-v${version}`;
}

/** Synthetic completion marker URL stored inside the tour cache. */
export function completeMarkerPath(tourId: string): string {
  return `tours/${tourId}/__complete__`;
}

/** Relative fetch/cache key for a tour asset. */
export function tourAssetPath(tourId: string, relPath: string): string {
  const clean = relPath.replace(/^\/+/, '');
  return `tours/${tourId}/${clean}`;
}

export function parseTourCacheName(
  name: string,
): { tourId: string; version: string } | null {
  const m = /^tour-(.+)-v(.+)$/.exec(name);
  if (!m) return null;
  return { tourId: m[1], version: m[2] };
}

export function isTourCacheName(name: string): boolean {
  return name.startsWith('tour-');
}
