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
  const ariaLabel = `${tour.title}，${tour.titleEn}，${chipLabel(downloadState)}`;
  const tourCached =
    downloadState?.status === 'ready' ||
    downloadState?.status === 'update-available' ||
    downloadState?.status === 'downloading' ||
    downloadState?.status === 'paused';
  const usePosterArt = typeof navigator === 'undefined' || navigator.onLine || tourCached;

  return (
    <button
      type="button"
      data-testid={`tour-card-${tour.id}`}
      aria-label={ariaLabel}
      className="group relative flex min-h-[220px] w-full flex-col justify-end overflow-hidden rounded-poster text-left shadow-poster transition-transform duration-normal active:scale-[0.98] hover:shadow-[0_12px_32px_rgb(0_0_0/0.22)]"
      onClick={onPress}
    >
      <div
        className="absolute inset-0 bg-gradient-hero bg-cover bg-center"
        style={usePosterArt ? { backgroundImage: `url('${posterUrl}')` } : undefined}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent"
        aria-hidden
      />
      <div className="relative p-5 pt-20">
        <Text className="font-display text-display-md text-white mb-1 drop-shadow-sm">{tour.title}</Text>
        <Text className="font-display text-body-lg text-white/90 mb-3">{tour.titleEn}</Text>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
              <Text className="text-body-sm text-white/80">
                {tFormat('tourSizeMb', { mb: formatMb(tour.bytes) })}
              </Text>
            )}
          </div>
          {showProgress && (
            <div data-testid={`download-progress-${tour.id}`}>
              <Progress value={downloadState?.percent ?? 0} className="h-2" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
