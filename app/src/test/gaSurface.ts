import type { EngineState } from '../engine/types.ts';

export interface GaEvent {
  type: string;
  [key: string]: unknown;
}

export interface GaSurface {
  events: GaEvent[];
  getState: () => EngineState | null;
  chimeCount: number;
  /** Set by MapScreen while a tour is loaded; reads the live element volume. */
  getAudioVolume?: () => number;
}

declare global {
  interface Window {
    __ga?: GaSurface;
  }
}

const MAX_EVENTS = 500;

export function initGaSurface(getState: () => EngineState | null): void {
  if (typeof window === 'undefined') return;
  window.__ga = {
    events: [],
    getState,
    get chimeCount() {
      return window.__ga?.events.filter((e) => e.type === 'chime').length ?? 0;
    },
  };
}

export function pushGaEvent(ev: GaEvent): void {
  const ga = window.__ga;
  if (!ga) return;
  ga.events.push({ ...ev, ts: Date.now() });
  if (ga.events.length > MAX_EVENTS) ga.events.splice(0, ga.events.length - MAX_EVENTS);
}
