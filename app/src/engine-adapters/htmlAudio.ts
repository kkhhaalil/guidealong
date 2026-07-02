import type { AudioPort, Unsub } from '../engine/types.ts';
import { setIdleAudioSession, setNarrationAudioSession } from './audioSession.ts';
import { pushGaEvent } from '../test/gaSurface.ts';

/** HTMLAudioElement-backed AudioPort for tour narration. */
export function createHtmlAudio(): AudioPort & {
  element: HTMLAudioElement;
  destroy: () => void;
} {
  const audio = new Audio();
  audio.preload = 'auto';

  const endedCbs = new Set<() => void>();
  const timeCbs = new Set<(time: number, duration: number) => void>();

  // After narration ends, release the exclusive audio session so the user's
  // music resumes (iOS). Delayed slightly: when another stop is queued the
  // engine starts it right away, and flapping the session type would blip
  // the music in and out between queue items.
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleSessionRelease = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (audio.paused) setIdleAudioSession();
    }, 1000);
  };
  const claimSession = () => {
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    setNarrationAudioSession();
  };

  audio.addEventListener('ended', () => {
    scheduleSessionRelease();
    for (const cb of endedCbs) cb();
  });

  audio.addEventListener('timeupdate', () => {
    const t = audio.currentTime;
    const d = audio.duration;
    for (const cb of timeCbs) cb(t, Number.isFinite(d) ? d : 0);
  });

  // Locking the screen mid-narration: the session was claimed for the
  // foreground (transient-solo, silenced on lock) — re-claim so it upgrades
  // to 'playback' and stays audible. Returning to foreground downgrades
  // back, restoring music auto-resume behavior for the current clip.
  const onVisibilityChange = () => {
    if (!audio.paused) setNarrationAudioSession();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    element: audio,

    destroy() {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (releaseTimer) clearTimeout(releaseTimer);
      audio.pause();
    },

    play(url: string) {
      if (audio.src !== url) audio.src = url;
      claimSession();
      pushGaEvent({ type: 'audio-play', url });
      audio.play().catch(() => {
        // autoplay policy — user must tap play
      });
    },

    pause() {
      audio.pause();
      scheduleSessionRelease();
    },

    resume() {
      claimSession();
      audio.play().catch(() => {});
    },

    seek(seconds: number) {
      audio.currentTime = seconds;
    },

    getCurrentTime() {
      return audio.currentTime;
    },

    getDuration() {
      const d = audio.duration;
      return Number.isFinite(d) ? d : 0;
    },

    isPaused() {
      return audio.paused;
    },

    onEnded(cb: () => void): Unsub {
      endedCbs.add(cb);
      return () => endedCbs.delete(cb);
    },

    onTimeUpdate(cb: (time: number, duration: number) => void): Unsub {
      timeCbs.add(cb);
      return () => timeCbs.delete(cb);
    },
  };
}

/** Unlock audio on a user gesture (muted play/pause). Call from start overlay click. */
export function unlockAudio(audio: HTMLAudioElement): void {
  // Declare a mixing session BEFORE the unlock play(), otherwise the unlock
  // itself grabs an exclusive session on iOS and stops the user's music.
  setIdleAudioSession();
  const wasMuted = audio.muted;
  audio.muted = true;
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  audio.pause();
  audio.muted = wasMuted;
}
