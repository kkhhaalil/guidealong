import type { AudioPort, ClockPort, StoragePort, LatLng } from '../types.ts';

export function createMemoryStorage(): StoragePort & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

export function createFakeClock(): ClockPort & {
  intervals: Map<number, () => void>;
  timeouts: Map<number, () => void>;
  tickInterval: (id: number) => void;
  tickTimeout: (id: number) => void;
  now: () => number;
} {
  let nextId = 1;
  const currentTime = 0;
  const intervals = new Map<number, () => void>();
  const timeouts = new Map<number, () => void>();

  return {
    intervals,
    timeouts,
    setInterval(cb) {
      const id = nextId++;
      intervals.set(id, cb);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout(cb) {
      const id = nextId++;
      timeouts.set(id, cb);
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
    now: () => currentTime,
    tickInterval(id: number) {
      intervals.get(id)?.();
    },
    tickTimeout(id: number) {
      const cb = timeouts.get(id);
      if (cb) {
        timeouts.delete(id);
        cb();
      }
    },
  };
}

export function createMockAudio(): AudioPort & {
  url: string | null;
  endedCbs: Set<() => void>;
  timeCbs: Set<(t: number, d: number) => void>;
  fireEnded: () => void;
  paused: boolean;
} {
  let currentTime = 0;
  const duration = 60;
  const endedCbs = new Set<() => void>();
  const timeCbs = new Set<(t: number, d: number) => void>();
  const state = { url: null as string | null, paused: true };

  return {
    get url() {
      return state.url;
    },
    get paused() {
      return state.paused;
    },
    endedCbs,
    timeCbs,
    play(url: string) {
      state.url = url;
      state.paused = false;
    },
    pause() {
      state.paused = true;
    },
    resume() {
      state.paused = false;
    },
    seek(t: number) {
      currentTime = t;
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    isPaused: () => state.paused,
    onEnded(cb) {
      endedCbs.add(cb);
      return () => endedCbs.delete(cb);
    },
    onTimeUpdate(cb) {
      timeCbs.add(cb);
      return () => timeCbs.delete(cb);
    },
    fireEnded() {
      for (const cb of endedCbs) cb();
    },
  };
}

export class TracePositionSource {
  private positions: LatLng[] = [];
  private idx = 0;
  private cb: ((pos: LatLng) => void) | null = null;

  constructor(positions: LatLng[]) {
    this.positions = positions;
  }

  getMode() {
    return 'sim' as const;
  }

  start(cb: (pos: LatLng) => void): void {
    this.cb = cb;
    this.idx = 0;
    this.emitAll();
  }

  stop(): void {
    this.cb = null;
  }

  getFractionalIndex(): number {
    return this.idx;
  }

  private emitAll(): void {
    while (this.idx < this.positions.length && this.cb) {
      this.cb(this.positions[this.idx]!);
      this.idx++;
    }
  }
}
