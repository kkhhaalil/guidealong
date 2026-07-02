import { create } from 'zustand';
import { createTourEngine, type TourEngineDeps } from '../engine/engine.ts';
import type { EngineState, PlayOptions, PositionSource, Route, Stop, TourEngine, TourManifest } from '../engine/types.ts';

interface TourStoreState extends EngineState {
  engine: TourEngine | null;
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

function syncFromEngine(engine: TourEngine): EngineState {
  return engine.getState();
}

export const useTourStore = create<TourStoreState>((set, get) => ({
  ...EMPTY_STATE,
  engine: null,

  initEngine(deps) {
    const existing = get().engine;
    existing?.destroy();
    const engine = createTourEngine(deps);
    const unsubs = [
      engine.on('state', () => set(syncFromEngine(engine))),
      engine.on('position', () => set(syncFromEngine(engine))),
      engine.on('play', () => set(syncFromEngine(engine))),
      engine.on('ended', () => set(syncFromEngine(engine))),
      engine.on('visited', () => set(syncFromEngine(engine))),
      engine.on('queue', () => set(syncFromEngine(engine))),
      engine.on('trigger', () => set(syncFromEngine(engine))),
    ];
    (engine as TourEngine & { _unsubs?: (() => void)[] })._unsubs = unsubs;
    set({ engine, ...syncFromEngine(engine) });
  },

  loadTour(manifest, stops, route) {
    get().engine?.loadTour(manifest, stops, route);
    const engine = get().engine;
    if (engine) set(syncFromEngine(engine));
  },

  setPositionSource(src) {
    get().engine?.setPositionSource(src);
    const engine = get().engine;
    if (engine) set(syncFromEngine(engine));
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
    set({ ...EMPTY_STATE, engine: null });
  },
}));
