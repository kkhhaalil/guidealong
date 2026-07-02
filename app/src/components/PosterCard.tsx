import { t, tFormat } from '../i18n';
import { tourFileUrl } from '../downloads/tourSource.ts';
import type { TourDownloadState } from '../downloads/types.ts';
import type { TourIndexEntry } from '../types/tour.ts';
import { Badge, BadgeText } from './ui/badge';
import { Text } from './ui/text';
import { Progress } from './ui/progress';

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function chipLabel(state: TourDownloadState | undefined): string {
  if (!state || state.status === 'not-downloaded') {
    return t('downloadNotReady');
  }
  if (state.status === 'downloading') {
    return tFormat('downloadDownloading', { percent: String(state.percent) });
  }
  if (state.status === 'paused') {
    return tFormat('downloadDownloading', { percent: String(state.percent) });
  }
  if (state.status === 'ready') {
    return t('downloadReady');
  }
  if (state.status === 'update-available') {
    return t('downloadUpdate');
  }
  return t('downloadNotReady');
}

export interface PosterCardProps {
  tour: TourIndexEntry;
  downloadState?: TourDownloadState;
  onPress: () => void;
}

export function PosterCard({ tour, downloadState, onPress }: PosterCardProps) {
  const posterUrl = tourFileUrl(tour.id, tour.posterArt);
  const showProgress =
    downloadState?.status === 'downloading' || downloadState?.status === 'paused';

  return (
    <button
      type="button"
      data-testid={`tour-card-${tour.id}`}
      className="relative flex min-h-[200px] w-full flex-col justify-end overflow-hidden rounded-poster text-left shadow-poster"
      onClick={onPress}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${posterUrl}')` }}
        aria-hidden
      />
      <div className="relative bg-gradient-to-t from-ink/80 to-transparent p-5 pt-16">
        <Text className="font-display text-display-md text-white mb-1">{tour.title}</Text>
        <Text className="text-body-md text-white/80 mb-3">{tour.titleEn}</Text>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge
              action={
                downloadState?.status === 'ready'
                  ? 'success'
                  : downloadState?.status === 'update-available'
                    ? 'warning'
                    : 'muted'
              }
              size="sm"
              testID={`download-chip-${tour.id}`}
            >
              <BadgeText>{chipLabel(downloadState)}</BadgeText>
            </Badge>
            {(downloadState?.status === 'not-downloaded' ||
              downloadState?.status === undefined) && (
              <Text className="text-body-sm text-white/70">
                {tFormat('tourSizeMb', { mb: formatMb(tour.bytes) })}
              </Text>
            )}
          </div>
          {showProgress && (
            <div data-testid={`download-progress-${tour.id}`}>
              <Progress value={downloadState?.percent ?? 0} className="h-1.5" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
