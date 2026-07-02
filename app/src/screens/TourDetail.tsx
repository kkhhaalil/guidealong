import { useEffect, useState } from 'react';
import { t, tFormat } from '../i18n';
import { navigate } from '../state/appStore';
import { useDownloadStore } from '../state/downloadStore';
import { getManifest, getStops, tourFileUrl } from '../downloads/tourSource.ts';
import { applyTourTheme, clearTourTheme } from '../theme/applyTourTheme.ts';
import type { TourManifest } from '../types/tour.ts';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Button, ButtonText } from '../components/ui/button';
import { Badge, BadgeText } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Progress } from '../components/ui/progress';

interface TourDetailProps {
  tourId: string;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function TourDetail({ tourId }: TourDetailProps) {
  const [manifest, setManifest] = useState<TourManifest | null>(null);
  const [stopCount, setStopCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const downloadState = useDownloadStore((s) => s.tourStates[tourId]);
  const storageEstimate = useDownloadStore((s) => s.storageEstimate);
  const downloadTour = useDownloadStore((s) => s.downloadTour);
  const updateTour = useDownloadStore((s) => s.updateTour);
  const abortDownload = useDownloadStore((s) => s.abortDownload);
  const deleteTour = useDownloadStore((s) => s.deleteTour);
  const refreshTourState = useDownloadStore((s) => s.refreshTourState);

  useEffect(() => {
    void refreshTourState(tourId);
  }, [tourId, refreshTourState]);

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
  const state = downloadState?.status ?? 'not-downloaded';
  const isDownloading = state === 'downloading';
  const isPaused = state === 'paused';
  const isReady = state === 'ready';
  const hasUpdate = state === 'update-available';
  const percent = downloadState?.percent ?? 0;

  const storageLine =
    storageEstimate &&
    tFormat('storageUsed', {
      used: formatStorage(storageEstimate.usage),
      quota: formatStorage(storageEstimate.quota),
    });

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteTour(tourId);
    setConfirmDelete(false);
  };

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
          {isReady && (
            <Badge action="success" testID="badge-downloaded">
              <BadgeText>{t('downloadReady')}</BadgeText>
            </Badge>
          )}
        </div>

        {(isDownloading || isPaused) && (
          <div className="mb-4" data-testid="download-progress-bar">
            <Text className="text-body-sm text-ink-muted mb-2">
              {tFormat('downloadDownloading', { percent: String(percent) })}
            </Text>
            <Progress value={percent} className="h-3 mb-3" />
            {isDownloading && (
              <Button
                action="secondary"
                size="md"
                testID="btn-cancel-download"
                onPress={() => abortDownload(tourId)}
              >
                <ButtonText>{t('tourDetailCancel')}</ButtonText>
              </Button>
            )}
            {isPaused && (
              <Button
                action="primary"
                size="md"
                testID="btn-resume-download"
                onPress={() => void downloadTour(tourId)}
              >
                <ButtonText className="text-primary-foreground">{t('tourDetailResume')}</ButtonText>
              </Button>
            )}
          </div>
        )}

        {state === 'not-downloaded' && (
          <Button
            action="primary"
            size="lg"
            className="mb-3"
            testID="btn-download"
            onPress={() => void downloadTour(tourId)}
          >
            <ButtonText className="text-primary-foreground">
              {tFormat('tourDetailDownloadSize', { mb: formatMb(manifest.bytes) })}
            </ButtonText>
          </Button>
        )}

        {isReady && (
          <>
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
              variant="outline"
              size="md"
              testID="btn-delete-download"
              onPress={() => void handleDelete()}
            >
              <ButtonText>
                {confirmDelete ? t('tourDetailDeleteConfirm') : t('tourDetailDelete')}
              </ButtonText>
            </Button>
          </>
        )}

        {hasUpdate && (
          <>
            <Button
              action="primary"
              size="lg"
              className="mb-3"
              testID="btn-update"
              onPress={() => void updateTour(tourId)}
            >
              <ButtonText className="text-primary-foreground">{t('tourDetailUpdate')}</ButtonText>
            </Button>
            <Button
              action="secondary"
              size="lg"
              className="mb-3"
              testID="btn-open-map"
              onPress={() => navigate({ name: 'map', tourId })}
            >
              <ButtonText>{t('openMap')}</ButtonText>
            </Button>
            <Button
              action="secondary"
              variant="outline"
              size="md"
              testID="btn-delete-download"
              onPress={() => void handleDelete()}
            >
              <ButtonText>
                {confirmDelete ? t('tourDetailDeleteConfirm') : t('tourDetailDelete')}
              </ButtonText>
            </Button>
          </>
        )}

        {storageLine && (
          <Text className="text-body-sm text-ink-muted mt-4" data-testid="storage-estimate">
            {storageLine}
          </Text>
        )}

        <Button variant="outline" action="secondary" size="md" className="mt-4" onPress={() => navigate({ name: 'shelf' })}>
          <ButtonText>{t('back')}</ButtonText>
        </Button>
      </div>
    </Box>
  );
}
