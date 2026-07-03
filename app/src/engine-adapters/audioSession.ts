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
 * - narration/chime: `playback` — the only category iOS keeps AUDIBLE when
 *   the screen locks or the app goes to background.
 *
 * Why not `transient-solo` (the native turn-by-turn pattern, which would
 * auto-resume the user's music afterwards)? Two field-verified reasons:
 * 1. it maps to a solo-ambient-family category that iOS fades to silence on
 *    backgrounding ("progress bar moves but no sound");
 * 2. WebKit evaluates background-playback eligibility from the session type
 *    at PLAYBACK START (see WebKit #17812) — changing the type mid-clip on
 *    visibilitychange does NOT re-categorize an already-active session, so
 *    a visibility-aware upgrade cannot rescue a clip that began as
 *    transient-solo. Narration must therefore START under `playback`.
 *
 * Trade-off: after narration, iOS may not auto-resume the user's music (that
 * courtesy belongs to transient-solo). Audible-in-background wins.
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

/** Narration/chime: exclusive `playback` — survives screen lock/background. */
export function setNarrationAudioSession(): void {
  setType('playback');
}
