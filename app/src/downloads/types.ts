export interface DownloadProgress {
  filesDone: number;
  filesTotal: number;
  bytesDone: number;
  bytesTotal: number;
}

export type TourDownloadStatus =
  | 'not-downloaded'
  | 'downloading'
  | 'paused'
  | 'ready'
  | 'update-available';

export interface TourDownloadStateBase {
  tourId: string;
  progress: DownloadProgress;
  percent: number;
}

export interface TourNotDownloaded extends TourDownloadStateBase {
  status: 'not-downloaded';
}

export interface TourDownloading extends TourDownloadStateBase {
  status: 'downloading';
}

export interface TourPaused extends TourDownloadStateBase {
  status: 'paused';
}

export interface TourReady extends TourDownloadStateBase {
  status: 'ready';
  cachedVersion: string;
}

export interface TourUpdateAvailable extends TourDownloadStateBase {
  status: 'update-available';
  cachedVersion: string;
  latestVersion: string;
}

export type TourDownloadState =
  | TourNotDownloaded
  | TourDownloading
  | TourPaused
  | TourReady
  | TourUpdateAvailable;

export interface CompleteMarker {
  version: string;
  ts: number;
}
