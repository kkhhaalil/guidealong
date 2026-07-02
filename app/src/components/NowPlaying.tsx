import { t } from '../i18n';
import type { Stop } from '../types/tour.ts';
import { tourFileUrl } from '../downloads/tourSource.ts';
import { Progress } from './ui/progress';
import { Button, ButtonText } from './ui/button';
import { Text } from './ui/text';

export interface NowPlayingProps {
  tourId: string;
  stop: Stop | null;
  triggered: boolean;
  more: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  posterFallback: string;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenList: () => void;
  onOpenMore: () => void;
}

export function NowPlaying({
  tourId,
  stop,
  triggered,
  more,
  isPaused,
  currentTime,
  duration,
  posterFallback,
  onPlayPause,
  onPrev,
  onNext,
  onOpenList,
  onOpenMore,
}: NowPlayingProps) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const photoUrl = stop ? tourFileUrl(tourId, `photos/${stop.id}.svg`) : posterFallback;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-chrome rounded-t-poster bg-surface shadow-poster"
      data-testid="now-playing"
    >
      <div className="flex gap-3 p-4">
        <div
          className="h-20 w-20 shrink-0 rounded-card bg-cover bg-center"
          style={{ backgroundImage: `url('${photoUrl}')` }}
          data-testid="np-photo"
        />
        <div className="min-w-0 flex-1">
          <Text className="text-title-lg text-ink truncate" data-testid="np-name">
            {stop?.name ?? t('nowPlayingIdle')}
          </Text>
          <Text className="text-body-sm text-ink-muted" data-testid="np-sub">
            {stop
              ? more
                ? t('nowPlayingMore')
                : triggered
                  ? t('nowPlayingAuto')
                  : t('nowPlayingManual')
              : ''}
          </Text>
          <Progress value={pct} className="mt-2" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pb-4">
        <Button
          size="xl"
          variant="outline"
          testID="btn-prev"
          aria-label={t('ariaPrev')}
          className="min-h-14 min-w-14"
          onPress={onPrev}
        >
          <ButtonText>⏮</ButtonText>
        </Button>
        <Button
          size="xl"
          action="primary"
          testID="btn-play"
          aria-label={isPaused ? t('ariaPlay') : t('ariaPause')}
          className="min-h-14 min-w-14"
          onPress={onPlayPause}
        >
          <ButtonText>{isPaused ? '▶' : '⏸'}</ButtonText>
        </Button>
        <Button
          size="xl"
          variant="outline"
          testID="btn-next"
          aria-label={t('ariaNext')}
          className="min-h-14 min-w-14"
          onPress={onNext}
        >
          <ButtonText>⏭</ButtonText>
        </Button>
      </div>

      <div className="flex gap-2 border-t border-border px-4 py-3">
        <Button size="md" variant="outline" testID="btn-stops" className="flex-1" onPress={onOpenList}>
          <ButtonText>{t('openStopList')}</ButtonText>
        </Button>
        {stop?.more && (
          <Button size="md" variant="outline" testID="btn-more" className="flex-1" onPress={onOpenMore}>
            <ButtonText>{t('learnMore')}</ButtonText>
          </Button>
        )}
      </div>
    </div>
  );
}
