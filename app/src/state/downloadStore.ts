import { create } from 'zustand';
import { getTourIndex } from '../downloads/tourSource.ts';
import { downloadManager } from '../downloads/downloadManager.ts';
import type { DownloadProgress, TourDownloadState } from '../downloads/types.ts';
import type { TourIndexEntry } from '../types/tour.ts';

export interface StorageEstimate {
  usage: number;
  quota: number;
}

interface DownloadStoreState {
  initialized: boolean;
  initError: string | null;
  tourIndex: TourIndexEntry[];
  tourStates: Record<string, TourDownloadState>;
  storageEstimate: StorageEstimate | null;
  init: () => Promise<void>;
  refreshTourState: (tourId: string) => Promise<void>;
  refreshAllStates: () => Promise<void>;
  refreshStorageEstimate: () => Promise<void>;
  downloadTour: (tourId: string) => Promise<void>;
  updateTour: (tourId: string) => Promise<void>;
  abortDownload: (tourId: string) => void;
  deleteTour: (tourId: string) => Promise<void>;
  getStateFor: (tourId: string) => TourDownloadState | undefined;
}

function indexVersion(index: TourIndexEntry[], tourId: string): string | undefined {
  return index.find((e) => e.id === tourId)?.version;
}

function applyProgress(
  tourId: string,
  percent: number,
  progress: DownloadProgress,
): TourDownloadState {
  return {
    status: 'downloading',
    tourId,
    progress,
    percent,
  };
}

export const useDownloadStore = create<DownloadStoreState>((set, get) => ({
  initialized: false,
  initError: null,
  tourIndex: [],
  tourStates: {},
  storageEstimate: null,

  async init() {
    if (get().initialized) return;
    try {
      const index = await getTourIndex();
      const tourStates = await downloadManager.scanAllTourStates(index);
      set({ tourIndex: index, tourStates, initialized: true, initError: null });
      void get().refreshStorageEstimate();
    } catch (e) {
      set({
        initialized: true,
        initError: e instanceof Error ? e.message : String(e),
      });
    }
  },

  async refreshTourState(tourId) {
    const { tourIndex } = get();
    const latest = indexVersion(tourIndex, tourId);
    const state = await downloadManager.getTourState(tourId, latest);
    set((s) => ({ tourStates: { ...s.tourStates, [tourId]: state } }));
  },

  async refreshAllStates() {
    const index = await getTourIndex();
    const tourStates = await downloadManager.scanAllTourStates(index);
    set({ tourIndex: index, tourStates });
  },

  async refreshStorageEstimate() {
    if (!navigator.storage?.estimate) return;
    const est = await navigator.storage.estimate();
    set({
      storageEstimate: {
        usage: est.usage ?? 0,
        quota: est.quota ?? 0,
      },
    });
  },

  async downloadTour(tourId) {
    const { tourIndex } = get();
    const entry = tourIndex.find((e) => e.id === tourId);
    const current = get().tourStates[tourId];
    const isUpdate = current?.status === 'update-available';

    set((s) => ({
      tourStates: {
        ...s.tourStates,
        [tourId]: applyProgress(tourId, 0, {
          filesDone: 0,
          filesTotal: 0,
          bytesDone: 0,
          bytesTotal: entry?.bytes ?? 0,
        }),
      },
    }));

    try {
      await downloadManager.downloadTour(tourId, {
        version: entry?.version,
        isUpdate,
        onProgress: (progress: DownloadProgress) => {
          const percent =
            progress.bytesTotal > 0
              ? Math.min(100, Math.round((progress.bytesDone / progress.bytesTotal) * 100))
              : 0;
          set((s) => ({
            tourStates: {
              ...s.tourStates,
              [tourId]: applyProgress(tourId, percent, progress),
            },
          }));
        },
      });
      await get().refreshTourState(tourId);
      await get().refreshStorageEstimate();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        await get().refreshTourState(tourId);
        return;
      }
      throw err;
    }
  },

  async updateTour(tourId) {
    await get().downloadTour(tourId);
  },

  abortDownload(tourId) {
    downloadManager.abortDownload(tourId);
    void get().refreshTourState(tourId);
  },

  async deleteTour(tourId) {
    await downloadManager.deleteTour(tourId);
    await get().refreshTourState(tourId);
    await get().refreshStorageEstimate();
  },

  getStateFor(tourId) {
    return get().tourStates[tourId];
  },
}));
