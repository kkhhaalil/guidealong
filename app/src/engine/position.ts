import {
  BASE_KMH,
  DEFAULT_SPEED_IDX,
  SAVE_POS_EVERY_TICKS,
  SIM_SPEEDS,
  TICK_MS,
} from './constants.ts';
import { interpolateRoute, segmentLengths } from './geo.ts';
import type { ClockPort, GeolocationPort, LatLng, PositionSource, Route } from './types.ts';

export class GpsSource implements PositionSource {
  private watchId: number | null = null;
  private readonly geo: GeolocationPort;

  constructor(geo: GeolocationPort) {
    this.geo = geo;
  }

  getMode(): 'gps' {
    return 'gps';
  }

  start(cb: (pos: LatLng) => void): void {
    this.watchId = this.geo.watchPosition(
      (coords) => cb({ lat: coords.latitude, lng: coords.longitude }),
      undefined,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
  }

  stop(): void {
    if (this.watchId != null) {
      this.geo.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export interface SimSourceOptions {
  route: Route;
  initialIndex?: number;
  speedIndex?: number;
  onWrap?: () => void;
  onTick?: (fractionalIndex: number) => void;
}

export class SimSource implements PositionSource {
  private route: Route;
  private segLen: number[];
  private simIdx = 0;
  private speedIdx = DEFAULT_SPEED_IDX;
  private paused = false;
  private timerId: number | null = null;
  private cb: ((pos: LatLng) => void) | null = null;
  private saveTick = 0;
  private readonly onWrap?: () => void;
  private onTick?: (fractionalIndex: number) => void;
  private readonly clock: ClockPort;

  constructor(clock: ClockPort, options: SimSourceOptions) {
    this.clock = clock;
    this.route = options.route;
    this.segLen = segmentLengths(options.route);
    if (options.initialIndex != null) this.simIdx = options.initialIndex;
    if (options.speedIndex != null) this.speedIdx = options.speedIndex;
    this.onWrap = options.onWrap;
    this.onTick = options.onTick;
  }

  getMode(): 'sim' {
    return 'sim';
  }

  start(cb: (pos: LatLng) => void): void {
    this.cb = cb;
    this.emitPosition();
    this.timerId = this.clock.setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timerId != null) {
      this.clock.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.cb = null;
  }

  setSpeedIndex(idx: number): void {
    this.speedIdx = Math.max(0, Math.min(idx, SIM_SPEEDS.length - 1));
  }

  getSpeedIndex(): number {
    return this.speedIdx;
  }

  cycleSpeed(): number {
    this.speedIdx = (this.speedIdx + 1) % SIM_SPEEDS.length;
    return this.speedIdx;
  }

  setFractionalIndex(idx: number): void {
    this.simIdx = idx;
  }

  getFractionalIndex(): number {
    return this.simIdx;
  }

  setOnTick(cb: (fractionalIndex: number) => void): void {
    this.onTick = cb;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** Advance one sim tick — exposed for deterministic tests. */
  tick(): void {
    if (this.paused || !this.cb) return;

    let meters = (BASE_KMH / 3.6) * SIM_SPEEDS[this.speedIdx]! * (TICK_MS / 1000);
    let i = Math.floor(this.simIdx);
    let frac = this.simIdx - i;

    while (meters > 0 && i < this.segLen.length) {
      const remain = this.segLen[i]! * (1 - frac);
      if (meters < remain) {
        frac += meters / this.segLen[i]!;
        meters = 0;
      } else {
        meters -= remain;
        i++;
        frac = 0;
      }
    }

    if (i >= this.segLen.length) {
      i = 0;
      frac = 0;
      this.onWrap?.();
    }

    this.simIdx = i + frac;

    if (++this.saveTick % SAVE_POS_EVERY_TICKS === 0) {
      this.onTick?.(this.simIdx);
    }

    this.emitPosition();
  }

  private emitPosition(): void {
    if (!this.cb) return;
    this.cb(interpolateRoute(this.route, this.simIdx));
  }
}
