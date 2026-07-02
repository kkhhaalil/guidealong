import { t } from '../i18n';
import type { Stop } from '../types/tour.ts';
import { Badge, BadgeText } from './ui/badge';
import { Button, ButtonText } from './ui/button';
import { Text } from './ui/text';

export interface MorePanelProps {
  stop: Stop | null;
  playingMore: boolean;
  onPlayMore: () => void;
  onClose: () => void;
}

export function MorePanel({ stop, playingMore, onPlayMore, onClose }: MorePanelProps) {
  if (!stop?.more) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-sheet max-h-[60vh] overflow-y-auto rounded-t-poster bg-surface p-4 shadow-poster"
      data-testid="more-panel"
      role="dialog"
      aria-modal="true"
      aria-label={t('learnMore')}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <Text className="text-title-md text-ink">{t('learnMore')}</Text>
        <button
          type="button"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-card text-body-lg transition-opacity duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={t('ariaClose')}
          data-testid="btn-close-more"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <Text className="text-body-md text-ink mb-4 whitespace-pre-wrap" data-testid="more-transcript">
        {stop.more}
      </Text>

      <div className="mb-4 flex flex-wrap gap-2">
        {stop.season && (
          <Badge action="info" data-testid="chip-season">
            <BadgeText>{stop.season}</BadgeText>
          </Badge>
        )}
        {stop.wildlife && (
          <Badge action="success" data-testid="chip-wildlife">
            <BadgeText>{stop.wildlife}</BadgeText>
          </Badge>
        )}
      </div>

      <Button
        action="primary"
        size="lg"
        testID="btn-play-more"
        className="w-full"
        onPress={onPlayMore}
        disabled={playingMore}
      >
        <ButtonText className="text-primary-foreground">
          {playingMore ? t('playingMore') : t('playMore')}
        </ButtonText>
      </Button>
    </div>
  );
}
