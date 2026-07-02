/** Ported from js/app.js — keep in sync for parity. */
export const SIM_SPEEDS = [1, 2, 4, 8, 16, 32] as const;
export const BASE_KMH = 60;
export const FWD_CONE = 100;
export const TICK_MS = 500;
export const HEADING_MIN_MOVE_M = 3;
export const DEFAULT_SPEED_IDX = 3;
export const CHIME_FREQS = [523.25, 783.99] as const;
export const CHIME_TONE_OFFSET_S = 0.18;
export const CHIME_RAMP_S = 0.03;
export const CHIME_DECAY_S = 0.5;
export const CHIME_STOP_S = 0.55;
export const CHIME_DONE_MS = 750;
export const RESUME_MIN_IDX = 2;
export const SAVE_POS_EVERY_TICKS = 10;
export const PERSIST_SCHEMA_VERSION = 1;
