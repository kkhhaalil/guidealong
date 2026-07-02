/** Category emoji icons — ported from js/app.js CAT_ICON */
export const CAT_ICON: Record<string, string> = {
  geyser: '⛲',
  spring: '♨️',
  falls: '🌊',
  wildlife: '🦬',
  landmark: '🏞️',
  info: 'ℹ️',
  story: '📖',
};

export function categoryIcon(category: string): string {
  return CAT_ICON[category] ?? '📍';
}
