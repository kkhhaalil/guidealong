import type { AudioPort, Unsub } from '../engine/types.ts';
import { pushGaEvent } from '../test/gaSurface.ts';

/** HTMLAudioElement-backed AudioPort for tour narration. */
export function createHtmlAudio(): AudioPort & { element: HTMLAudioElement } {
  const audio = new Audio();
  audio.preload = 'auto';

  const endedCbs = new Set<() => void>();
  const timeCbs = new Set<(time: number, duration: number) => void>();

  audio.addEventListener('ended', () => {
    for (const cb of endedCbs) cb();
  });

  audio.addEventListener('timeupdate', () => {
    const t = audio.currentTime;
    const d = audio.duration;
    for (const cb of timeCbs) cb(t, Number.isFinite(d) ? d : 0);
  });

  return {
    element: audio,

    play(url: string) {
      if (audio.src !== url) audio.src = url;
      pushGaEvent({ type: 'audio-play', url });
      audio.play().catch(() => {
        // autoplay policy — user must tap play
      });
    },

    pause() {
      audio.pause();
    },

    resume() {
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
  const wasMuted = audio.muted;
  audio.muted = true;
  const p = audio.play();
  if (p?.catch) p.catch(() => {});
  audio.pause();
  audio.muted = wasMuted;
}
