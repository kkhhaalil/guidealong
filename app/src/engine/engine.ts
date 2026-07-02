import { HEADING_MIN_MOVE_M, RESUME_MIN_IDX, SIM_SPEEDS } from './constants.ts';
import { bearing, haversine } from './geo.ts';
import { PlaybackController } from './playback.ts';
import {
  clearTourProgress,
  hasResume,
  loadResume,
  loadVisited,
  saveResume,
  saveVisited,
  setActiveTour,
} from './persist.ts';
import { evaluate } from './triggers.ts';
import type { SimSource } from './position.ts';
import {
  bindMediaSessionHandlers,
  createMediaSessionAdapter,
  setPlaybackStateSafe,
  setStopMetadata,
  updateMediaSessionPosition,
} from './media-session.ts';
import { createWakeLockManager } from './wake-lock.ts';
import type {
  AudioPort,
  ChimePort,
  ClockPort,
  EngineState,
  LatLng,
  PlayOptions,
  PositionSource,
  Route,
  Stop,
  StoragePort,
  TourEngine,
  TourManifest,
  Unsub,
} from './types.ts';

export interface TourEngineDeps {
  audio: AudioPort;
  chime: ChimePort;
  clock: ClockPort;
  storage: StoragePort;
  audioBasePath?: string;
  enableMediaSession?: boolean;
  enableWakeLock?: boolean;
}

type EventHandler = (...args: unknown[]) => void;

export function createTourEngine(deps: TourEngineDeps): TourEngine {
  let manifest: TourManifest | null = null;
  let stops: Stop[] = [];
  let positionSource: PositionSource | null = null;
  let position: LatLng | null = null;
  let prevPos: LatLng | null = null;
  let heading: number | null = null;
  let visited = new Set<string>();
  let mode: 'sim' | 'gps' | null = null;
  let simPaused = false;
  let speedIndex = 3;
  let fractionalIndex = 0;

  const listeners = new Map<string, Set<EventHandler>>();
  const audioBase = deps.audioBasePath ?? 'audio';

  const playback = new PlaybackController({
    audio: deps.audio,
    chime: deps.chime,
    audioUrl: (id, more) => `${audioBase}/${id}${more ? '-more' : ''}.mp3`,
    getPosition: () => position,
  });

  const mediaSession = deps.enableMediaSession !== false ? createMediaSessionAdapter() : null;
  const wakeLock = deps.enableWakeLock !== false ? createWakeLockManager() : null;

  if (mediaSession) {
    bindMediaSessionHandlers(mediaSession, {
      play: () => engine.resume(),
      pause: () => engine.pause(),
      prev: () => engine.prev(),
      next: () => engine.next(),
      seekBackward: (offset) => {
        const t = Math.max(0, deps.audio.getCurrentTime() - offset);
        engine.seek(t);
      },
      seekForward: (offset) => {
        const d = deps.audio.getDuration();
        const t = Math.min(d || 0, deps.audio.getCurrentTime() + offset);
        engine.seek(t);
      },
      seekTo: (time) => engine.seek(time),
    });
  }

  playback.on((ev) => {
    if (ev.type === 'visited') {
      visited.add(ev.stopId);
      if (manifest) saveVisited(deps.storage, manifest.id, visited);
      emit('visited', ev.stopId);
    }
    if (ev.type === 'play') {
      if (manifest && ev.stop) setStopMetadata(mediaSession, ev.stop);
      setPlaybackStateSafe(mediaSession, 'playing');
      emit('play', ev.stop.id, ev.triggered, ev.more);
    }
    if (ev.type === 'ended') {
      setPlaybackStateSafe(mediaSession, 'none');
      emit('ended', ev.stop.id);
    }
    if (ev.type === 'queue') {
      emit('queue', ev.queue.map((s) => s.id));
    }
    if (ev.type === 'time') {
      updateMediaSessionPosition(mediaSession, ev.duration, ev.currentTime);
    }
    notifyState();
  });

  function emit(event: string, ...args: unknown[]): void {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of set) cb(...args);
  }

  function notifyState(): void {
    emit('state', engine.getState());
  }

  function updateHeading(np: LatLng): void {
    if (prevPos && haversine(prevPos, np) > HEADING_MIN_MOVE_M) {
      heading = bearing(prevPos, np);
    }
  }

  function checkTriggers(): void {
    if (!position) return;
    const pb = playback.getState();
    const candidates = evaluate(position, heading, stops, visited, {
      playingStopId: pb.playingStop?.id,
      queuedStopIds: pb.queue.map((s) => s.id),
    });

    for (const stop of candidates) {
      emit('trigger', stop.id);
      if (pb.playingStop) {
        playback.enqueue(stop);
      } else {
        playback.playStop(stop, true, position);
      }
      pb.playingStop = playback.getState().playingStop;
    }
  }

  function onPosition(lat: number, lng: number): void {
    const np = { lat, lng };
    updateHeading(np);
    position = np;
    prevPos = np;
    emit('position', np, heading);
    checkTriggers();
    notifyState();
  }

  function saveSimResume(): void {
    if (!manifest || mode !== 'sim') return;
    saveResume(deps.storage, manifest.id, {
      simIdx: fractionalIndex,
      speedIdx: speedIndex,
      mode: 'sim',
    });
  }

  function syncFromSource(src: PositionSource): void {
    mode = src.getMode?.() ?? null;
    if (src.getSpeedIndex) speedIndex = src.getSpeedIndex();
    if (src.getFractionalIndex) fractionalIndex = src.getFractionalIndex();
    if (src.isPaused) simPaused = src.isPaused();
  }

  const engine: TourEngine = {
    loadTour(m: TourManifest, s: Stop[], r: Route): void {
      void r;
      manifest = m;
      stops = s;
      visited = loadVisited(deps.storage, m.id);
      setActiveTour(deps.storage, m.id);
      const resume = loadResume(deps.storage, m.id);
      if (resume?.mode === 'sim') {
        fractionalIndex = resume.simIdx;
        speedIndex = Math.min(resume.speedIdx, SIM_SPEEDS.length - 1);
      }
      notifyState();
    },

    setPositionSource(src: PositionSource): void {
      positionSource?.stop();
      positionSource = src;
      syncFromSource(src);

      if (src.getMode?.() === 'sim' && 'setOnTick' in src && typeof src.setOnTick === 'function') {
        const sim = src as SimSource;
        if (fractionalIndex > 0 && src.setFractionalIndex) {
          src.setFractionalIndex(fractionalIndex);
        }
        if (src.setSpeedIndex) src.setSpeedIndex(speedIndex);
        if (src.setPaused) src.setPaused(simPaused);
        sim.setOnTick((idx) => {
          fractionalIndex = idx;
          saveSimResume();
        });
      } else if (src.getMode?.() === 'sim') {
        if (fractionalIndex > 0 && src.setFractionalIndex) {
          src.setFractionalIndex(fractionalIndex);
        }
        if (src.setSpeedIndex) src.setSpeedIndex(speedIndex);
        if (src.setPaused) src.setPaused(simPaused);
      }

      src.start((pos) => {
        if (src.getFractionalIndex) fractionalIndex = src.getFractionalIndex()!;
        onPosition(pos.lat, pos.lng);
      });

      wakeLock?.acquire();
      notifyState();
    },

    play(stopId: string, opts: PlayOptions = {}): void {
      const stop = stops.find((s) => s.id === stopId);
      if (!stop) return;

      if (opts.more) {
        playback.playMore(stop);
        return;
      }

      if (opts.manual) {
        playback.manualPlay(stop, position);
      } else {
        playback.playStop(stop, true, position);
      }
      notifyState();
    },

    pause(): void {
      playback.pause();
      setPlaybackStateSafe(mediaSession, 'paused');
      notifyState();
    },

    resume(): void {
      playback.resume();
      setPlaybackStateSafe(mediaSession, 'playing');
      notifyState();
    },

    next(): void {
      playback.next();
      notifyState();
    },

    prev(): void {
      playback.prev();
      notifyState();
    },

    seek(seconds: number): void {
      playback.seek(seconds);
      notifyState();
    },

    clearQueue(): void {
      playback.clearQueue();
      notifyState();
    },

    resetProgress(): void {
      if (!manifest) return;
      visited = new Set();
      saveVisited(deps.storage, manifest.id, visited);
      clearTourProgress(deps.storage, manifest.id);
      fractionalIndex = 0;
      speedIndex = 3;
      if (positionSource?.setFractionalIndex) positionSource.setFractionalIndex(0);
      notifyState();
    },

    cycleSpeed(): number {
      if (!positionSource?.cycleSpeed) return speedIndex;
      speedIndex = positionSource.cycleSpeed();
      saveSimResume();
      notifyState();
      return speedIndex;
    },

    setSimPaused(paused: boolean): void {
      simPaused = paused;
      positionSource?.setPaused?.(paused);
      if (paused) saveSimResume();
      notifyState();
    },

    hasResume(): boolean {
      if (!manifest) return false;
      return hasResume(deps.storage, manifest.id, RESUME_MIN_IDX);
    },

    on(event, cb): Unsub {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => listeners.get(event)?.delete(cb);
    },

    getState(): EngineState {
      const pb = playback.getState();
      return {
        tourId: manifest?.id ?? null,
        position,
        heading,
        mode,
        playingStopId: pb.playingStop?.id ?? null,
        playingTriggered: pb.playingTriggered,
        playingMore: pb.playingMore,
        queue: pb.queue.map((s) => s.id),
        visited: Array.from(visited),
        speedIndex,
        fractionalIndex,
        simPaused,
        currentTime: pb.currentTime,
        duration: pb.duration,
        isPaused: pb.isPaused,
      };
    },

    destroy(): void {
      positionSource?.stop();
      playback.destroy();
      wakeLock?.destroy();
      listeners.clear();
    },
  };

  return engine;
}
