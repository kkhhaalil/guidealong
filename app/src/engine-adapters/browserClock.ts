import type { ClockPort } from '../engine/types.ts';

export const browserClock: ClockPort = {
  setInterval(cb, ms) {
    return window.setInterval(cb, ms);
  },
  clearInterval(id) {
    window.clearInterval(id);
  },
  setTimeout(cb, ms) {
    return window.setTimeout(cb, ms);
  },
  clearTimeout(id) {
    window.clearTimeout(id);
  },
  now() {
    return Date.now();
  },
};
