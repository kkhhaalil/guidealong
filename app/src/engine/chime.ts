import {
  CHIME_DECAY_S,
  CHIME_DONE_MS,
  CHIME_FREQS,
  CHIME_RAMP_S,
  CHIME_STOP_S,
  CHIME_TONE_OFFSET_S,
} from './constants.ts';
import type { ChimePort } from './types.ts';

type AudioContextCtor = new () => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof globalThis === 'undefined') return null;
  const w = globalThis as typeof globalThis & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

const CHIME_PEAK_GAIN = 0.25;

/**
 * Browser WebAudio two-tone chime matching js/app.js. `getVolume` (0–1,
 * injected so the engine stays framework-free) scales the peak gain; at 0
 * the tones are skipped entirely but `done` still fires on schedule.
 */
export function createWebChime(
  clock: {
    setTimeout(cb: () => void, ms: number): number;
  },
  opts?: { getVolume?: () => number },
): ChimePort {
  let audioCtx: AudioContext | null = null;

  return {
    play(done: () => void): void {
      try {
        const volume = Math.min(1, Math.max(0, opts?.getVolume?.() ?? 1));
        const Ctor = getAudioContextCtor();
        if (!Ctor || volume === 0) {
          clock.setTimeout(done, CHIME_DONE_MS);
          return;
        }
        audioCtx = audioCtx ?? new Ctor();
        const t = audioCtx.currentTime;
        CHIME_FREQS.forEach((f, i) => {
          const o = audioCtx!.createOscillator();
          const g = audioCtx!.createGain();
          o.frequency.value = f;
          o.type = 'sine';
          const start = t + i * CHIME_TONE_OFFSET_S;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(CHIME_PEAK_GAIN * volume, start + CHIME_RAMP_S);
          g.gain.exponentialRampToValueAtTime(0.0001, start + CHIME_DECAY_S);
          o.connect(g);
          g.connect(audioCtx!.destination);
          o.start(start);
          o.stop(start + CHIME_STOP_S);
        });
      } catch {
        // degrade silently
      }
      clock.setTimeout(done, CHIME_DONE_MS);
    },
  };
}

/** Test double that records chime invocations. */
export function createMockChime(): ChimePort & { count: number } {
  const state = { count: 0 };
  return {
    get count() {
      return state.count;
    },
    play(done: () => void): void {
      state.count++;
      done();
    },
  };
}
