/**
 * Best-effort page keepalive for touring in the background: a looping,
 * silent WebAudio buffer keeps the page's audio session active so iOS is
 * less eager to suspend JS timers / geolocation while the screen is locked
 * or another app (e.g. Music) is in the foreground.
 *
 * Runs under the `ambient` audio session type (see audioSession.ts), so it
 * mixes with — and never interrupts — the user's music. Must be started
 * from a user gesture (the start-overlay tap).
 */

type AudioContextCtor = new () => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof globalThis === 'undefined') return null;
  const w = globalThis as typeof globalThis & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let visibilityHandler: (() => void) | null = null;

export function startBackgroundKeepalive(): void {
  if (source) return; // already running
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();

    // 1 s of silence, looped forever. A zeroed buffer produces no output at
    // all (no gain node needed) but keeps the audio hardware session open.
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start();

    visibilityHandler = () => {
      if (!document.hidden && ctx?.state === 'suspended') void ctx.resume();
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  } catch {
    // degrade silently — keepalive is opportunistic
  }
}

export function stopBackgroundKeepalive(): void {
  try {
    source?.stop();
    source?.disconnect();
  } catch {
    // already stopped
  }
  source = null;
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (ctx) {
    void ctx.close().catch(() => {});
    ctx = null;
  }
}
