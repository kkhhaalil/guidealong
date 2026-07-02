import { useEffect } from 'react';
import { t } from '../i18n';
import { navigate } from '../state/appStore';
import { useDownloadStore } from '../state/downloadStore';
import { clearTourTheme } from '../theme/applyTourTheme.ts';
import { PosterCard } from '../components/PosterCard';
import { ThemeToggle } from '../components/ThemeToggle';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Spinner } from '../components/ui/spinner';

export function TourShelf() {
  const initialized = useDownloadStore((s) => s.initialized);
  const tourIndex = useDownloadStore((s) => s.tourIndex);
  const tourStates = useDownloadStore((s) => s.tourStates);
  const initError = useDownloadStore((s) => s.initError);

  useEffect(() => {
    clearTourTheme();
  }, []);

  const loadError = initError;

  return (
    <Box className="flex min-h-screen flex-col bg-surface" data-testid="tour-shelf">
      <div className="relative p-6 pb-4">
        <ThemeToggle className="absolute right-6 top-6" />
        <Text className="font-display text-display-lg text-ink mb-2 pr-14">{t('appTitle')}</Text>
        <Text className="text-body-md text-ink-muted">{t('appSubtitle')}</Text>
      </div>

      <Text className="text-title-md text-ink px-6 mb-4">{t('tourShelfHeading')}</Text>

      {loadError && (
        <Text className="text-body-md text-danger px-6" data-testid="shelf-error">
          {loadError}
        </Text>
      )}

      {!initialized && (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      )}

      {initialized && tourIndex.length === 0 && !loadError && (
        <Text className="px-6 text-ink-muted">{t('tourShelfEmpty')}</Text>
      )}

      <div className="flex flex-col gap-4 px-6 pb-8">
        {tourIndex.map((tour) => (
          <PosterCard
            key={tour.id}
            tour={tour}
            downloadState={tourStates[tour.id]}
            onPress={() => navigate({ name: 'tour-detail', tourId: tour.id })}
          />
        ))}
      </div>
    </Box>
  );
}
