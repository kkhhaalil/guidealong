import type { Stop } from './types.ts';

export interface MediaSessionMetadata {
  title: string;
  artist: string;
  album: string;
  artwork: { src: string; sizes: string; type: string }[];
}

export interface MediaSessionPort {
  setMetadata(meta: MediaSessionMetadata): void;
  setPlaybackState(state: 'playing' | 'paused' | 'none'): void;
  setPositionState?(state: { duration: number; position: number; playbackRate: number }): void;
  setActionHandler(
    action: 'play' | 'pause' | 'previoustrack' | 'nexttrack' | 'seekbackward' | 'seekforward' | 'seekto',
    handler: ((details?: { seekOffset?: number; seekTime?: number }) => void) | null,
  ): void;
}

export interface MediaSessionAdapterOptions {
  categoryLabel?: (category: string) => string;
  albumTitle?: string;
  artwork?: { src: string; sizes: string; type: string }[];
}

const DEFAULT_ARTWORK = [
  { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
];

const CAT_LABEL: Record<string, string> = {
  geyser: '间歇泉',
  spring: '热泉',
  falls: '瀑布',
  wildlife: '野生动物',
  landmark: '地标',
  info: '信息',
  story: '趣闻故事',
};

function getNavigatorMediaSession(): MediaSessionPort | null {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return null;
  const ms = navigator.mediaSession as unknown as MediaSessionPort;
  return ms;
}

export function createMediaSessionAdapter(): MediaSessionPort | null {
  return getNavigatorMediaSession();
}

export function setStopMetadata(
  ms: MediaSessionPort | null,
  stop: Stop,
  options: MediaSessionAdapterOptions = {},
): void {
  if (!ms) return;
  try {
    const labelFn = options.categoryLabel ?? ((c: string) => CAT_LABEL[c] ?? '');
    const album = options.albumTitle ?? '黄石国家公园 · 中文语音导览';
    const artwork = options.artwork ?? DEFAULT_ARTWORK;
    ms.setMetadata({
      title: stop.name,
      artist: `${labelFn(stop.category)} · ${stop.nameEn || ''}`,
      album,
      artwork,
    });
  } catch {
    // degrade silently
  }
}

export function bindMediaSessionHandlers(
  ms: MediaSessionPort | null,
  handlers: {
    play: () => void;
    pause: () => void;
    prev: () => void;
    next: () => void;
    seekBackward: (offset: number) => void;
    seekForward: (offset: number) => void;
    seekTo: (time: number) => void;
  },
): void {
  if (!ms) return;
  const set = (
    action: Parameters<MediaSessionPort['setActionHandler']>[0],
    fn: Parameters<MediaSessionPort['setActionHandler']>[1],
  ) => {
    try {
      ms.setActionHandler(action, fn);
    } catch {
      // unsupported action
    }
  };
  set('play', handlers.play);
  set('pause', handlers.pause);
  set('previoustrack', handlers.prev);
  set('nexttrack', handlers.next);
  set('seekbackward', (d) => handlers.seekBackward(d?.seekOffset ?? 10));
  set('seekforward', (d) => handlers.seekForward(d?.seekOffset ?? 10));
  set('seekto', (d) => {
    if (d?.seekTime != null) handlers.seekTo(d.seekTime);
  });
}

export function updateMediaSessionPosition(
  ms: MediaSessionPort | null,
  duration: number,
  position: number,
): void {
  if (!ms?.setPositionState || !duration || !Number.isFinite(duration)) return;
  try {
    ms.setPositionState({ duration, position, playbackRate: 1 });
  } catch {
    // ignore
  }
}
