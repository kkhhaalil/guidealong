import { haversine } from '../engine/geo.ts';
import { create } from 'zustand';
import { createTourEngine, type TourEngineDeps } from '../engine/engine.ts';
import type { EngineState, PlayOptions, PositionSource, Route, Stop, TourEngine, TourManifest } from '../engine/types.ts';
import { initGaSurface, pushGaEvent } from '../test/gaSurface.ts';

interface TourStoreState extends EngineState {
  engine: TourEngine | null;
  stops: Stop[];
  manifest: TourManifest | null;
  route: Route | null;
  stopDistances: Record<string, number | null>;
  initEngine: (deps: TourEngineDeps) => void;
  loadTour: (manifest: TourManifest, stops: Stop[], route: Route) => void;
  setPositionSource: (src: PositionSource) => void;
  play: (stopId: string, opts?: PlayOptions) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  clearQueue: () => void;
  resetProgress: () => void;
  cycleSpeed: () => number;
  setSimPaused: (paused: boolean) => void;
  hasResume: () => boolean;
  destroy: () => void;
}

const EMPTY_STATE: EngineState = {
  tourId: null,
  position: null,
  heading: null,
  mode: null,
  playingStopId: null,
  playingTriggered: false,
  playingMore: false,
  queue: [],
  visited: [],
  speedIndex: 3,
  fractionalIndex: 0,
  simPaused: false,
  currentTime: 0,
  duration: 0,
  isPaused: true,
};

function computeDistances(stops: Stop[], position: EngineState['position']): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const stop of stops) {
    out[stop.id] = position ? haversine(position, stop) : null;
  }
  return out;
}

function syncFromEngine(engine: TourEngine, stops: Stop[]): Partial<TourStoreState> {
  const state = engine.getState();
  return {
    ...state,
    stopDistances: computeDistances(stops, state.position),
  };
}

export const useTourStore = create<TourStoreState>((set, get) => ({
  ...EMPTY_STATE,
  engine: null,
  stops: [],
  manifest: null,
  route: null,
  stopDistances: {},

  initEngine(deps) {
    const existing = get().engine;
    existing?.destroy();
    const engine = createTourEngine(deps);
    initGaSurface(() => get().engine?.getState() ?? null);

    const unsubs = [
      engine.on('state', () => {
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
      engine.on('position', () => {
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
      engine.on('play', (...args) => {
        pushGaEvent({ type: 'play', stopId: args[0], triggered: args[1], more: args[2] });
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
      engine.on('ended', (stopId) => {
        pushGaEvent({ type: 'ended', stopId });
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
      engine.on('visited', (stopId) => {
        pushGaEvent({ type: 'visited', stopId });
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
      engine.on('queue', (ids) => {
        pushGaEvent({ type: 'queue', queue: ids });
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
      engine.on('trigger', (stopId) => {
        pushGaEvent({ type: 'trigger', stopId });
        const { stops } = get();
        set(syncFromEngine(engine, stops));
      }),
    ];
    (engine as TourEngine & { _unsubs?: (() => void)[] })._unsubs = unsubs;
    set({ engine, ...syncFromEngine(engine, get().stops) });
  },

  loadTour(manifest, stops, route) {
    set({ manifest, stops, route });
    get().engine?.loadTour(manifest, stops, route);
    const engine = get().engine;
    if (engine) set(syncFromEngine(engine, stops));
  },

  setPositionSource(src) {
    get().engine?.setPositionSource(src);
    const engine = get().engine;
    if (engine) set(syncFromEngine(engine, get().stops));
  },

  play(stopId, opts) {
    get().engine?.play(stopId, opts);
  },

  pause() {
    get().engine?.pause();
  },

  resume() {
    get().engine?.resume();
  },

  next() {
    get().engine?.next();
  },

  prev() {
    get().engine?.prev();
  },

  seek(seconds) {
    get().engine?.seek(seconds);
  },

  clearQueue() {
    get().engine?.clearQueue();
  },

  resetProgress() {
    get().engine?.resetProgress();
    const engine = get().engine;
    if (engine) set(syncFromEngine(engine, get().stops));
  },

  cycleSpeed() {
    const idx = get().engine?.cycleSpeed() ?? get().speedIndex;
    set({ speedIndex: idx });
    return idx;
  },

  setSimPaused(paused) {
    get().engine?.setSimPaused(paused);
  },

  hasResume() {
    return get().engine?.hasResume() ?? false;
  },

  destroy() {
    const engine = get().engine as (TourEngine & { _unsubs?: (() => void)[] }) | null;
    engine?._unsubs?.forEach((u) => u());
    engine?.destroy();
    set({
      ...EMPTY_STATE,
      engine: null,
      stops: [],
      manifest: null,
      route: null,
      stopDistances: {},
    });
  },
}));
