import { describe, expect, it, vi } from 'vitest';
import { createWakeLockManager } from '../wake-lock.ts';

describe('wake-lock adapter', () => {
  it('acquires and re-acquires on visibility change', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({
      addEventListener: vi.fn(),
      release,
    });
    let visibility = 'hidden';
    const listeners: Record<string, () => void> = {};
    Object.defineProperty(globalThis, 'navigator', {
      value: { wakeLock: { request } },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        get visibilityState() {
          return visibility;
        },
        addEventListener: (ev: string, cb: () => void) => {
          listeners[ev] = cb;
        },
        removeEventListener: vi.fn(),
      },
      configurable: true,
    });

    const mgr = createWakeLockManager();
    mgr.acquire();
    await Promise.resolve();
    expect(request).toHaveBeenCalledWith('screen');

    mgr.release();
    await Promise.resolve();
    visibility = 'visible';
    listeners.visibilitychange?.();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);

    mgr.release();
    mgr.destroy();
  });

  it('degrades silently without wakeLock API', () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    const mgr = createWakeLockManager();
    expect(() => mgr.acquire()).not.toThrow();
    mgr.destroy();
  });
});
