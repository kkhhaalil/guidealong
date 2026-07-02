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

/** Browser WebAudio two-tone chime matching js/app.js. */
export function createWebChime(clock: {
  setTimeout(cb: () => void, ms: number): number;
}): ChimePort {
  let audioCtx: AudioContext | null = null;

  return {
    play(done: () => void): void {
      try {
        const Ctor = getAudioContextCtor();
        if (!Ctor) {
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
          g.gain.exponentialRampToValueAtTime(0.25, start + CHIME_RAMP_S);
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
