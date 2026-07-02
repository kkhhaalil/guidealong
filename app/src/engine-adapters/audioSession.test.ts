import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAudioSessionSupported,
  setIdleAudioSession,
  setNarrationAudioSession,
} from './audioSession.ts';
import { createHtmlAudio, unlockAudio } from './htmlAudio.ts';
import { createInstrumentedChime } from './instrumentedChime.ts';

type NavWithSession = Navigator & { audioSession?: { type: string } };

function installFakeSession(): { type: string } {
  const session = { type: 'auto' };
  (navigator as NavWithSession).audioSession = session;
  return session;
}

afterEach(() => {
  delete (navigator as NavWithSession).audioSession;
});

describe('audioSession adapter', () => {
  it('is unsupported when navigator.audioSession is missing', () => {
    expect(isAudioSessionSupported()).toBe(false);
    // no-ops must not throw
    setIdleAudioSession();
    setNarrationAudioSession();
  });

  it('sets ambient for idle and transient-solo for narration', () => {
    const session = installFakeSession();
    expect(isAudioSessionSupported()).toBe(true);
    setIdleAudioSession();
    expect(session.type).toBe('ambient');
    setNarrationAudioSession();
    expect(session.type).toBe('transient-solo');
  });
});

describe('unlockAudio', () => {
  it('declares a mixing session before the unlock play()', () => {
    const session = installFakeSession();
    const order: string[] = [];
    const fakeElement = {
      muted: false,
      play: () => {
        order.push(`play(session=${session.type})`);
        return { catch: () => {} };
      },
      pause: () => {},
    } as unknown as HTMLAudioElement;

    unlockAudio(fakeElement);
    expect(order).toEqual(['play(session=ambient)']);
  });
});

describe('narration session lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('chime claims the exclusive session before tones', () => {
    const session = installFakeSession();
    session.type = 'ambient';
    const chime = createInstrumentedChime({
      setTimeout: (cb: () => void) => {
        cb();
        return 1;
      },
      clearTimeout: () => {},
      setInterval: () => 1,
      clearInterval: () => {},
      now: () => 0,
    });
    chime.play(() => {});
    expect(session.type).toBe('transient-solo');
  });

  it('releases back to ambient shortly after narration ends', () => {
    const session = installFakeSession();
    const port = createHtmlAudio();
    setNarrationAudioSession();
    expect(session.type).toBe('transient-solo');

    port.element.dispatchEvent(new Event('ended'));
    // release is delayed so queued stops do not flap the session
    expect(session.type).toBe('transient-solo');
    vi.advanceTimersByTime(1100);
    expect(session.type).toBe('ambient');
  });

  it('a queued play cancels the pending release', () => {
    const session = installFakeSession();
    const port = createHtmlAudio();
    const playStub = vi
      .spyOn(port.element, 'play')
      .mockReturnValue(Promise.resolve());

    port.element.dispatchEvent(new Event('ended'));
    port.play('next.mp3');
    vi.advanceTimersByTime(2000);
    expect(session.type).toBe('transient-solo');
    playStub.mockRestore();
  });
});
