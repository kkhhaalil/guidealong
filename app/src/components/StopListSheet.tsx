import { t, tFormat } from '../i18n';
import type { Stop } from '../types/tour.ts';
import { categoryIcon } from '../theme/categoryIcons.ts';
import { Actionsheet, ActionsheetDragIndicator } from './ui/actionsheet';
import { Text } from './ui/text';

function formatDist(m: number | null | undefined): string {
  if (m == null) return '';
  if (m >= 1000) return tFormat('distKm', { km: (m / 1000).toFixed(1) });
  return tFormat('distM', { m: String(Math.round(m)) });
}

export interface StopListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stops: Stop[];
  visited: string[];
  distances: Record<string, number | null>;
  onSelectStop: (stopId: string) => void;
}

export function StopListSheet({
  isOpen,
  onClose,
  stops,
  visited,
  distances,
  onSelectStop,
}: StopListSheetProps) {
  const visitedSet = new Set(visited);
  const done = visited.length;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} className="max-h-[70vh] overflow-y-auto">
      <ActionsheetDragIndicator />
      <Text className="text-title-md text-ink mb-1 px-2">{t('stopListHeading')}</Text>
      <Text className="text-body-sm text-ink-muted mb-4 px-2" data-testid="progress-count">
        {tFormat('stopProgress', { done: String(done), total: String(stops.length) })}
      </Text>
      <ul className="flex flex-col gap-1" data-testid="stop-list">
        {stops.map((stop) => {
          const dist = distances[stop.id];
          const isVisited = visitedSet.has(stop.id);
          return (
            <li key={stop.id}>
              <button
                type="button"
                data-testid={`stop-item-${stop.id}`}
                className="flex min-h-12 w-full items-center gap-3 rounded-card px-3 py-2 text-left hover:bg-secondary/40"
                onClick={() => {
                  onSelectStop(stop.id);
                  onClose();
                }}
              >
                <span className="text-xl" aria-hidden>
                  {categoryIcon(stop.category)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-body-md text-ink truncate">{stop.name}</div>
                  <div className="text-body-sm text-ink-muted truncate">
                    {stop.nameEn}
                    {dist != null && (
                      <span data-testid={`stop-dist-${stop.id}`}> · {formatDist(dist)}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-body-sm text-ink-muted" data-testid={`stop-state-${stop.id}`}>
                  {isVisited ? t('stopVisited') : t('stopPlay')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Actionsheet>
  );
}
