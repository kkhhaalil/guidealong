export interface Stop {
  id: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  radius: number;
  category: string;
  text: string;
  more?: string;
  season?: string;
  wildlife?: string;
}

export type Route = [number, number][];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TourManifest {
  id: string;
  title: string;
  titleEn?: string;
  language?: string;
}

export type PositionMode = 'sim' | 'gps';

export interface ResumeState {
  v: number;
  simIdx: number;
  speedIdx: number;
  mode: PositionMode;
  ts: number;
}

export type Unsub = () => void;

export interface AudioPort {
  play(url: string): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPaused(): boolean;
  onEnded(cb: () => void): Unsub;
  onTimeUpdate(cb: (time: number, duration: number) => void): Unsub;
}

export interface ChimePort {
  play(done: () => void): void;
}

export interface ClockPort {
  setInterval(cb: () => void, ms: number): number;
  clearInterval(id: number): void;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
  now(): number;
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeolocationError {
  message: string;
}

export interface GeolocationPort {
  watchPosition(
    success: (coords: GeolocationCoords) => void,
    error?: (err: GeolocationError) => void,
    options?: { enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number },
  ): number;
  clearWatch(watchId: number): void;
}

export interface PositionSource {
  start(cb: (pos: LatLng) => void): void;
  stop(): void;
  getMode?(): PositionMode;
  setSpeedIndex?(idx: number): void;
  getSpeedIndex?(): number;
  cycleSpeed?(): number;
  setFractionalIndex?(idx: number): void;
  getFractionalIndex?(): number;
  setPaused?(paused: boolean): void;
  isPaused?(): boolean;
}

export interface EngineState {
  tourId: string | null;
  position: LatLng | null;
  heading: number | null;
  mode: PositionMode | null;
  playingStopId: string | null;
  playingTriggered: boolean;
  playingMore: boolean;
  queue: string[];
  visited: string[];
  speedIndex: number;
  fractionalIndex: number;
  simPaused: boolean;
  currentTime: number;
  duration: number;
  isPaused: boolean;
}

export type EngineEvent =
  | 'trigger'
  | 'play'
  | 'ended'
  | 'visited'
  | 'position'
  | 'queue'
  | 'state';

export interface PlayOptions {
  manual?: boolean;
  more?: boolean;
}

export interface TourEngine {
  loadTour(manifest: TourManifest, stops: Stop[], route: Route): void;
  setPositionSource(src: PositionSource): void;
  play(stopId: string, opts?: PlayOptions): void;
  pause(): void;
  resume(): void;
  next(): void;
  prev(): void;
  seek(seconds: number): void;
  clearQueue(): void;
  resetProgress(): void;
  cycleSpeed(): number;
  setSimPaused(paused: boolean): void;
  hasResume(): boolean;
  on(event: EngineEvent, cb: (...args: unknown[]) => void): Unsub;
  getState(): EngineState;
  destroy(): void;
}
