import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { navigate } from '../state/appStore';
import { getTourIndex } from '../downloads/tourSource.ts';
import { clearTourTheme } from '../theme/applyTourTheme.ts';
import type { TourIndex } from '../types/tour.ts';
import { PosterCard } from '../components/PosterCard';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Spinner } from '../components/ui/spinner';

export function TourShelf() {
  const [tours, setTours] = useState<TourIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearTourTheme();
    getTourIndex()
      .then(setTours)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <Box className="flex min-h-screen flex-col bg-surface" data-testid="tour-shelf">
      <div className="p-6 pb-4">
        <Text className="font-display text-display-lg text-ink mb-2">{t('appTitle')}</Text>
        <Text className="text-body-md text-ink-muted">{t('appSubtitle')}</Text>
      </div>

      <Text className="text-title-md text-ink px-6 mb-4">{t('tourShelfHeading')}</Text>

      {error && (
        <Text className="text-body-md text-danger px-6" data-testid="shelf-error">
          {error}
        </Text>
      )}

      {!tours && !error && (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      )}

      {tours?.length === 0 && <Text className="px-6 text-ink-muted">{t('tourShelfEmpty')}</Text>}

      <div className="flex flex-col gap-4 px-6 pb-8">
        {tours?.map((tour) => (
          <PosterCard
            key={tour.id}
            tour={tour}
            onPress={() => navigate({ name: 'tour-detail', tourId: tour.id })}
          />
        ))}
      </div>
    </Box>
  );
}
