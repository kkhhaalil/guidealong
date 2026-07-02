export interface WakeLockSentinel {
  addEventListener(type: 'release', listener: () => void): void;
  release(): Promise<void>;
}

export interface WakeLockPort {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

export interface WakeLockManager {
  acquire(): void;
  release(): void;
  destroy(): void;
}

function getWakeLockPort(): WakeLockPort | null {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return null;
  return navigator.wakeLock as unknown as WakeLockPort;
}

function getVisibilityState(): DocumentVisibilityState | null {
  if (typeof document === 'undefined') return null;
  return document.visibilityState;
}

function onVisibilityChange(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}

/** Screen wake lock with re-acquire on visibilitychange — matches js/app.js. */
export function createWakeLockManager(): WakeLockManager {
  let sentinel: WakeLockSentinel | null = null;
  const port = getWakeLockPort();

  const request = () => {
    if (!port) return;
    port
      .request('screen')
      .then((wl) => {
        sentinel = wl;
        wl.addEventListener('release', () => {
          sentinel = null;
        });
      })
      .catch(() => {
        // permission denied or unsupported
      });
  };

  const onVisible = () => {
    if (getVisibilityState() === 'visible' && !sentinel) request();
  };

  const unsub = onVisibilityChange(onVisible);

  return {
    acquire: request,
    release: () => {
      void sentinel?.release();
      sentinel = null;
    },
    destroy: () => {
      unsub();
      void sentinel?.release();
      sentinel = null;
    },
  };
}
