import { describe, expect, it, vi } from 'vitest';
import {
  bindMediaSessionHandlers,
  createMediaSessionAdapter,
  setStopMetadata,
  updateMediaSessionPosition,
} from '../media-session.ts';
import type { Stop } from '../types.ts';

function mockStop(): Stop {
  return {
    id: 'x',
    name: '测试',
    nameEn: 'Test',
    lat: 0,
    lng: 0,
    radius: 100,
    category: 'geyser',
    text: 't',
  };
}

describe('media-session adapter', () => {
  it('returns null when unsupported', () => {
    const prev = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    expect(createMediaSessionAdapter()).toBeNull();
    if (prev) Object.defineProperty(globalThis, 'navigator', prev);
  });

  it('sets metadata and handlers when supported', () => {
    const handlers: Record<string, (d?: { seekOffset?: number; seekTime?: number }) => void> = {};
    const ms = {
      metadata: null as unknown,
      playbackState: 'none',
      setMetadata(meta: unknown) {
        this.metadata = meta;
      },
      setPlaybackState(state: string) {
        this.playbackState = state;
      },
      setPositionState: vi.fn(),
      setActionHandler(action: string, fn: typeof handlers[string]) {
        handlers[action] = fn;
      },
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaSession: ms },
      configurable: true,
    });

    setStopMetadata(ms, mockStop());
    expect(ms.metadata).toBeTruthy();

    const play = vi.fn();
    const pause = vi.fn();
    const prev = vi.fn();
    const next = vi.fn();
    bindMediaSessionHandlers(ms, {
      play,
      pause,
      prev,
      next,
      seekBackward: vi.fn(),
      seekForward: vi.fn(),
      seekTo: vi.fn(),
    });
    handlers.play?.();
    handlers.pause?.();
    handlers.previoustrack?.();
    handlers.nexttrack?.();
    handlers.seekbackward?.({ seekOffset: 5 });
    handlers.seekforward?.({ seekOffset: 5 });
    handlers.seekto?.({ seekTime: 12 });
    expect(play).toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
    expect(prev).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();

    updateMediaSessionPosition(ms, 100, 50);
    expect(ms.setPositionState).toHaveBeenCalledWith({
      duration: 100,
      position: 50,
      playbackRate: 1,
    });
  });
});
