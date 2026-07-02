import { useEffect, useState } from 'react';
import { t, tFormat } from '../i18n';
import { navigate } from '../state/appStore';
import { getManifest, getStops, tourFileUrl } from '../downloads/tourSource.ts';
import { applyTourTheme, clearTourTheme } from '../theme/applyTourTheme.ts';
import type { TourManifest } from '../types/tour.ts';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Button, ButtonText } from '../components/ui/button';
import { Badge, BadgeText } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';

interface TourDetailProps {
  tourId: string;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function TourDetail({ tourId }: TourDetailProps) {
  const [manifest, setManifest] = useState<TourManifest | null>(null);
  const [stopCount, setStopCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getManifest(tourId), getStops(tourId)])
      .then(([m, stops]) => {
        if (cancelled) return;
        setManifest(m);
        setStopCount(stops.length);
        applyTourTheme(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTourTheme();
    };
  }, [tourId]);

  if (loading) {
    return (
      <Box className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner />
      </Box>
    );
  }

  if (error || !manifest) {
    return (
      <Box className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6">
        <Text className="text-danger">{error ?? t('loadError')}</Text>
        <Button onPress={() => navigate({ name: 'shelf' })}>
          <ButtonText>{t('back')}</ButtonText>
        </Button>
      </Box>
    );
  }

  const posterUrl = tourFileUrl(tourId, manifest.posterArt);

  return (
    <Box className="flex min-h-screen flex-col bg-surface" data-testid="tour-detail">
      <div
        className="h-48 bg-cover bg-center"
        style={{ backgroundImage: `url('${posterUrl}')` }}
        data-testid="detail-poster"
      />
      <div className="flex flex-1 flex-col p-6">
        <Text className="font-display text-display-md text-ink mb-1">{manifest.title}</Text>
        <Text className="text-body-md text-ink-muted mb-4">{manifest.titleEn}</Text>

        <div className="mb-6 flex flex-wrap gap-2">
          <Badge action="muted">
            <BadgeText>{tFormat('tourSizeMb', { mb: formatMb(manifest.bytes) })}</BadgeText>
          </Badge>
          <Badge action="info">
            <BadgeText>{tFormat('stopCount', { count: String(stopCount) })}</BadgeText>
          </Badge>
          <Badge action="muted">
            <BadgeText>{tFormat('tourLanguage', { lang: manifest.language })}</BadgeText>
          </Badge>
        </div>

        <Button
          action="primary"
          size="lg"
          className="mb-3"
          testID="btn-open-map"
          onPress={() => navigate({ name: 'map', tourId })}
        >
          <ButtonText className="text-primary-foreground">{t('openMap')}</ButtonText>
        </Button>

        <Button
          action="secondary"
          size="lg"
          testID="btn-download"
          disabled
          title={t('downloadComingSoon')}
        >
          <ButtonText>{t('tourDetailDownload')}</ButtonText>
        </Button>

        <Button variant="outline" action="secondary" size="md" className="mt-4" onPress={() => navigate({ name: 'shelf' })}>
          <ButtonText>{t('back')}</ButtonText>
        </Button>
      </div>
    </Box>
  );
}
