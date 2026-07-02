import { t, tFormat } from '../i18n';
import { tourFileUrl } from '../downloads/tourSource.ts';
import type { TourIndexEntry } from '../types/tour.ts';
import { Badge, BadgeText } from './ui/badge';
import { Text } from './ui/text';

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export interface PosterCardProps {
  tour: TourIndexEntry;
  onPress: () => void;
}

export function PosterCard({ tour, onPress }: PosterCardProps) {
  const posterUrl = tourFileUrl(tour.id, tour.posterArt);

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
        <div className="flex items-center gap-2">
          <Badge action="muted" size="sm" data-testid={`download-chip-${tour.id}`}>
            <BadgeText>{t('downloadNotReady')}</BadgeText>
          </Badge>
          <Text className="text-body-sm text-white/70">
            {tFormat('tourSizeMb', { mb: formatMb(tour.bytes) })}
          </Text>
        </div>
      </div>
    </button>
  );
}
