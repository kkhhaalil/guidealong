import type { AudioPort, ChimePort, LatLng, Stop, Unsub } from './types.ts';
import { shouldMarkVisited } from './triggers.ts';

export interface PlaybackDeps {
  audio: AudioPort;
  chime: ChimePort;
  audioUrl: (stopId: string, more?: boolean) => string;
  getPosition: () => LatLng | null;
}

export interface PlaybackState {
  playingStop: Stop | null;
  playingTriggered: boolean;
  playingMore: boolean;
  queue: Stop[];
  currentTime: number;
  duration: number;
  isPaused: boolean;
}

export type PlaybackEvent =
  | { type: 'play'; stop: Stop; triggered: boolean; more: boolean }
  | { type: 'ended'; stop: Stop; triggered: boolean; more: boolean }
  | { type: 'visited'; stopId: string }
  | { type: 'queue'; queue: Stop[] }
  | { type: 'time'; currentTime: number; duration: number };

export class PlaybackController {
  private playingStop: Stop | null = null;
  private playingTriggered = false;
  private playingMore = false;
  private queue: Stop[] = [];
  private currentTime = 0;
  private duration = 0;
  private isPaused = true;
  private listeners = new Set<(ev: PlaybackEvent) => void>();
  private unsubs: Unsub[] = [];
  private readonly deps: PlaybackDeps;

  constructor(deps: PlaybackDeps) {
    this.deps = deps;
    this.unsubs.push(
      this.deps.audio.onEnded(() => this.handleEnded(this.deps.getPosition())),
      this.deps.audio.onTimeUpdate((t, d) => {
        this.currentTime = t;
        this.duration = d;
        this.emit({ type: 'time', currentTime: t, duration: d });
      }),
    );
  }

  destroy(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.listeners.clear();
  }

  on(cb: (ev: PlaybackEvent) => void): Unsub {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getState(): PlaybackState {
    return {
      playingStop: this.playingStop,
      playingTriggered: this.playingTriggered,
      playingMore: this.playingMore,
      queue: [...this.queue],
      currentTime: this.currentTime,
      duration: this.duration,
      isPaused: this.isPaused,
    };
  }

  playStop(stop: Stop, triggered: boolean, pos: LatLng | null): void {
    void pos;
    this.playingStop = stop;
    this.playingTriggered = triggered;
    this.playingMore = false;
    this.isPaused = false;

    const start = () => {
      this.deps.audio.play(this.deps.audioUrl(stop.id));
      this.emit({ type: 'play', stop, triggered, more: false });
    };

    if (triggered) {
      this.deps.chime.play(start);
    } else {
      start();
    }
  }

  playMore(stop: Stop): void {
    if (!this.playingStop || this.playingStop.id !== stop.id) return;
    this.playingMore = true;
    this.isPaused = false;
    this.deps.audio.play(this.deps.audioUrl(stop.id, true));
    this.emit({ type: 'play', stop, triggered: this.playingTriggered, more: true });
  }

  /** Manual play — clears queue per reference behavior. */
  manualPlay(stop: Stop, pos: LatLng | null): void {
    this.queue = [];
    this.emit({ type: 'queue', queue: [] });
    this.playStop(stop, false, pos);
  }

  enqueue(stop: Stop): void {
    this.queue.push(stop);
    this.emit({ type: 'queue', queue: [...this.queue] });
  }

  clearQueue(): void {
    this.queue = [];
    this.emit({ type: 'queue', queue: [] });
  }

  pause(): void {
    this.deps.audio.pause();
    this.isPaused = true;
  }

  resume(): void {
    this.deps.audio.resume();
    this.isPaused = false;
  }

  /** Restart current track (media session prev). */
  prev(): void {
    this.deps.audio.seek(0);
    this.deps.audio.resume();
    this.isPaused = false;
  }

  /** Skip to next — finish current and advance queue. */
  next(): void {
    this.deps.audio.pause();
    this.handleEnded(this.deps.getPosition());
  }

  seek(seconds: number): void {
    this.deps.audio.seek(seconds);
  }

  handleEnded(pos: LatLng | null = null): void {
    this.playingMore = false;
    const finished = this.playingStop;
    const wasTriggered = this.playingTriggered;

    if (finished) {
      if (shouldMarkVisited(wasTriggered, pos, finished)) {
        this.emit({ type: 'visited', stopId: finished.id });
      }
      this.playingStop = null;
      this.playingTriggered = false;
      this.emit({ type: 'ended', stop: finished, triggered: wasTriggered, more: false });
    }

    if (this.queue.length) {
      const next = this.queue.shift()!;
      this.emit({ type: 'queue', queue: [...this.queue] });
      this.playStop(next, true, pos);
    } else {
      this.isPaused = true;
      this.currentTime = 0;
      this.duration = 0;
    }
  }

  private emit(ev: PlaybackEvent): void {
    for (const cb of this.listeners) cb(ev);
  }
}
