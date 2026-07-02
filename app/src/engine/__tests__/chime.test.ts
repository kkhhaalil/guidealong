import { describe, expect, it, vi } from 'vitest';
import { createMockChime, createWebChime } from '../chime.ts';
import { CHIME_DONE_MS } from '../constants.ts';

describe('createWebChime', () => {
  it('schedules done callback via clock', () => {
    const timeouts: Array<() => void> = [];
    const clock = {
      setTimeout: (cb: () => void, ms: number) => {
        expect(ms).toBe(CHIME_DONE_MS);
        timeouts.push(cb);
        return 1;
      },
    };
    const chime = createWebChime(clock);
    const done = vi.fn();
    chime.play(done);
    expect(timeouts).toHaveLength(1);
    timeouts[0]!();
    expect(done).toHaveBeenCalled();
  });

  it('uses WebAudio when available', () => {
    const connect = vi.fn();
    const start = vi.fn();
    const stop = vi.fn();
    const oscillator = {
      frequency: { value: 0 },
      type: 'sine',
      connect,
      start,
      stop,
    };
    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return oscillator;
      }
      createGain() {
        return gain;
      }
    }
    const prev = (globalThis as { AudioContext?: unknown }).AudioContext;
    (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
    try {
      const chime = createWebChime({ setTimeout: (cb) => { cb(); return 1; } });
      chime.play(vi.fn());
      expect(start).toHaveBeenCalled();
    } finally {
      (globalThis as { AudioContext?: unknown }).AudioContext = prev;
    }
  });

  it('scales peak gain by injected volume and skips tones at zero', () => {
    const ramps: number[] = [];
    const start = vi.fn();
    const oscillator = {
      frequency: { value: 0 },
      type: 'sine',
      connect: vi.fn(),
      start,
      stop: vi.fn(),
    };
    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: (v: number) => ramps.push(v),
      },
      connect: vi.fn(),
    };
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return oscillator;
      }
      createGain() {
        return gain;
      }
    }
    const prev = (globalThis as { AudioContext?: unknown }).AudioContext;
    (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
    try {
      const clock = { setTimeout: (cb: () => void) => { cb(); return 1; } };

      const half = createWebChime(clock, { getVolume: () => 0.5 });
      half.play(vi.fn());
      expect(Math.max(...ramps)).toBeCloseTo(0.125);

      start.mockClear();
      const muted = createWebChime(clock, { getVolume: () => 0 });
      const done = vi.fn();
      muted.play(done);
      expect(start).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalled();
    } finally {
      (globalThis as { AudioContext?: unknown }).AudioContext = prev;
    }
  });
});

describe('createMockChime', () => {
  it('increments count', () => {
    const chime = createMockChime();
    chime.play(() => {});
    chime.play(() => {});
    expect(chime.count).toBe(2);
  });
});
