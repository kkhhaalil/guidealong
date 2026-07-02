/**
 * iOS/WebKit Audio Session API adapter (https://www.w3.org/TR/audio-session/).
 *
 * Without this, any playback — even the muted autoplay-unlock tap — makes the
 * page's audio session exclusive and iOS pauses the user's music. Declaring
 * the session lets the tour app coexist with Music/Spotify like a native
 * navigation app:
 *
 * - idle (no narration): `ambient` — page audio machinery mixes with and
 *   never interrupts other apps' audio;
 * - narration/chime: `transient-solo` — other audio pauses, narration plays
 *   exclusively, and the OS resumes the music when narration ends (the same
 *   pattern native turn-by-turn directions use).
 *
 * No-ops (feature-detected) on browsers without `navigator.audioSession`.
 */

export type AudioSessionKind =
  | 'auto'
  | 'playback'
  | 'transient'
  | 'transient-solo'
  | 'ambient'
  | 'play-and-record';

interface AudioSessionLike {
  type: AudioSessionKind;
}

function getAudioSession(): AudioSessionLike | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { audioSession?: AudioSessionLike };
  return nav.audioSession ?? null;
}

export function isAudioSessionSupported(): boolean {
  return getAudioSession() != null;
}

function setType(type: AudioSessionKind): void {
  const session = getAudioSession();
  if (!session) return;
  try {
    session.type = type;
  } catch {
    // degrade silently
  }
}

/** Idle: mix with (never interrupt) other apps' audio. */
export function setIdleAudioSession(): void {
  setType('ambient');
}

/** Narration/chime: play exclusively; other audio auto-resumes afterwards. */
export function setNarrationAudioSession(): void {
  setType('transient-solo');
}
