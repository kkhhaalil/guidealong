import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { navigate } from '../state/appStore';
import { useTourStore } from '../state/tourStore';
import { getManifest, getRoute, getStops, tourFileUrl } from '../downloads/tourSource.ts';
import { browserClock } from '../engine-adapters/browserClock.ts';
import { browserStorage } from '../engine-adapters/browserStorage.ts';
import { createHtmlAudio, unlockAudio } from '../engine-adapters/htmlAudio.ts';
import { isAudioSessionSupported } from '../engine-adapters/audioSession.ts';
import {
  startBackgroundKeepalive,
  stopBackgroundKeepalive,
} from '../engine-adapters/backgroundKeepalive.ts';
import { bindAudioElementVolume } from '../state/volumePreference.ts';
import { createInstrumentedChime } from '../engine-adapters/instrumentedChime.ts';
import { GpsSource, SimSource } from '../engine/position.ts';
import { SIM_SPEEDS } from '../engine/constants.ts';
import { clearTourTheme, applyTourTheme } from '../theme/applyTourTheme.ts';
import type { Route, Stop, TourManifest } from '../types/tour.ts';
import { MapView } from '../components/MapView';
import { StartOverlay } from '../components/StartOverlay';
import { SimControls } from '../components/SimControls';
import { NowPlaying } from '../components/NowPlaying';
import { StopListSheet } from '../components/StopListSheet';
import { MorePanel } from '../components/MorePanel';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, ButtonText } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';

interface MapScreenProps {
  tourId: string;
}

export function MapScreen({ tourId }: MapScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<TourManifest | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [started, setStarted] = useState(false);
  const [follow, setFollow] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const audioRef = useRef<ReturnType<typeof createHtmlAudio> | null>(null);
  const routeRef = useRef<Route | null>(null);

  const store = useTourStore();
  const {
    position,
    heading,
    visited,
    speedIndex,
    simPaused,
    mode,
    playingStopId,
    playingTriggered,
    playingMore,
    currentTime,
    duration,
    isPaused,
    stopDistances,
    initEngine,
    loadTour,
    setPositionSource,
    play,
    pause,
    resume,
    next,
    prev,
    resetProgress,
    cycleSpeed,
    setSimPaused,
    hasResume,
    destroy,
  } = store;

  const playingStop = useMemo(
    () => (playingStopId ? stops.find((s) => s.id === playingStopId) ?? null : null),
    [stops, playingStopId]
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([getManifest(tourId), getStops(tourId), getRoute(tourId)])
      .then(([m, s, r]) => {
        if (cancelled) return;
        setManifest(m);
        setStops(s);
        setRoute(r);
        routeRef.current = r;
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
      stopBackgroundKeepalive();
      destroy();
      audioRef.current = null;
    };
  }, [tourId, destroy]);

  useEffect(() => {
    if (!manifest || !route || stops.length === 0) return;

    const audio = createHtmlAudio();
    audioRef.current = audio;
    const unbindVolume = bindAudioElementVolume(audio.element);

    initEngine({
      audio,
      chime: createInstrumentedChime(browserClock),
      clock: browserClock,
      storage: browserStorage,
      audioBasePath: tourFileUrl(tourId, 'audio'),
      enableMediaSession: true,
      enableWakeLock: true,
    });
    loadTour(manifest, stops, route);
    // Test-surface hook: initEngine (re)creates window.__ga, so attach after.
    if (window.__ga) window.__ga.getAudioVolume = () => audio.element.volume;

    return () => {
      unbindVolume();
      audio.destroy();
      if (window.__ga) delete window.__ga.getAudioVolume;
    };
  }, [manifest, route, stops, tourId, initEngine, loadTour]);

  // Only where the Audio Session API lets us declare a mixing ('ambient')
  // session (iOS 17+). Elsewhere a silent loop could itself pause the
  // user's music, which is worse than losing background keepalive.
  const startKeepalive = useCallback(() => {
    if (isAudioSessionSupported()) startBackgroundKeepalive();
  }, []);

  const startSim = useCallback(
    (resume: boolean) => {
      const r = routeRef.current;
      if (!r || !audioRef.current) return;
      unlockAudio(audioRef.current.element);
      startKeepalive();
      setStarted(true);
      setFollow(true);

      const sim = new SimSource(browserClock, { route: r });
      if (resume) {
        const state = useTourStore.getState();
        if (state.fractionalIndex > 0) sim.setFractionalIndex(state.fractionalIndex);
        sim.setSpeedIndex(state.speedIndex);
      }
      setPositionSource(sim);
    },
    [setPositionSource, startKeepalive]
  );

  const startGps = useCallback(() => {
    if (!audioRef.current) return;
    unlockAudio(audioRef.current.element);
    startKeepalive();
    setStarted(true);
    setFollow(true);
    setPositionSource(
      new GpsSource({
        watchPosition: (success, error, options) =>
          navigator.geolocation.watchPosition(
            (pos) => success({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => error?.({ message: err.message }),
            options
          ),
        clearWatch: (id) => navigator.geolocation.clearWatch(id),
      })
    );
  }, [setPositionSource, startKeepalive]);

  const handleStartSim = () => startSim(false);
  const handleResume = () => startSim(true);
  const handleReset = () => {
    resetProgress();
    setStarted(false);
  };

  const handleSwitchSim = () => {
    const r = routeRef.current;
    if (!r) return;
    const state = useTourStore.getState();
    const sim = new SimSource(browserClock, {
      route: r,
      initialIndex: state.fractionalIndex,
      speedIndex: state.speedIndex,
    });
    setPositionSource(sim);
  };

  const handleSwitchGps = () => {
    setPositionSource(
      new GpsSource({
        watchPosition: (success, error, options) =>
          navigator.geolocation.watchPosition(
            (pos) => success({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => error?.({ message: err.message }),
            options
          ),
        clearWatch: (id) => navigator.geolocation.clearWatch(id),
      })
    );
  };

  const handleCycleSpeed = () => {
    cycleSpeed();
    // Expose current multiplier for E2E
    const idx = useTourStore.getState().speedIndex;
    const mult = SIM_SPEEDS[idx];
    if (mult === 32) {
      document.documentElement.dataset.speed32 = '1';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" data-testid="map-loading">
        <Spinner />
      </div>
    );
  }

  if (error || !manifest || !route) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6">
        <p className="text-body-md text-danger">{error ?? t('loadError')}</p>
        <Button onPress={() => navigate({ name: 'tour-detail', tourId })}>
          <ButtonText>{t('back')}</ButtonText>
        </Button>
      </div>
    );
  }

  const posterUrl = tourFileUrl(tourId, manifest.posterArt);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-surface" data-testid="map-screen">
      {/* Right edge, top-down: Leaflet zoom control (~10-118px, inside the map's
          isolated context), follow toggle (120px), theme toggle (180px). */}
      <ThemeToggle className="absolute right-3 top-[11.25rem] z-chrome" />
      <div className={started ? 'h-full w-full' : 'pointer-events-none h-full w-full'}>
        <MapView
        tourId={tourId}
        manifest={manifest}
        stops={stops}
        route={route}
        position={position}
        heading={heading}
        visited={visited}
        follow={follow}
        onFollowChange={setFollow}
        />
      </div>

      {started && (
        <SimControls
          speedIndex={speedIndex}
          simPaused={simPaused}
          mode={mode}
          onCycleSpeed={handleCycleSpeed}
          onTogglePause={() => setSimPaused(!simPaused)}
          onSwitchGps={handleSwitchGps}
          onSwitchSim={handleSwitchSim}
        />
      )}

      {started && (
        <NowPlaying
          tourId={tourId}
          stop={playingStop}
          triggered={playingTriggered}
          more={playingMore}
          isPaused={isPaused}
          currentTime={currentTime}
          duration={duration}
          posterFallback={posterUrl}
          onPlayPause={() => (isPaused ? resume() : pause())}
          onPrev={prev}
          onNext={next}
          onOpenList={() => setListOpen(true)}
          onOpenMore={() => setMoreOpen(true)}
        />
      )}

      <StopListSheet
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        stops={stops}
        visited={visited}
        distances={stopDistances}
        onSelectStop={(id) => play(id, { manual: true })}
      />

      {moreOpen && playingStop && (
        <MorePanel
          stop={playingStop}
          playingMore={playingMore}
          onPlayMore={() => play(playingStop.id, { more: true })}
          onClose={() => setMoreOpen(false)}
        />
      )}

      {!started && (
        <StartOverlay
          hasResume={hasResume()}
          onStartSim={handleStartSim}
          onStartGps={startGps}
          onResume={handleResume}
          onReset={handleReset}
        />
      )}

      <Button
        variant="outline"
        size="sm"
        className="absolute left-3 bottom-[220px] z-chrome"
        testID="btn-back-map"
        onPress={() => navigate({ name: 'tour-detail', tourId })}
      >
        <ButtonText>{t('back')}</ButtonText>
      </Button>
    </div>
  );
}
