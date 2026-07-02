import type { StoragePort } from '../engine/types.ts';

export const browserStorage: StoragePort = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore quota
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
