import { describe, expect, it } from 'vitest';
import {
  BASE_KMH,
  CHIME_DONE_MS,
  CHIME_FREQS,
  DEFAULT_SPEED_IDX,
  FWD_CONE,
  HEADING_MIN_MOVE_M,
  RESUME_MIN_IDX,
  SAVE_POS_EVERY_TICKS,
  SIM_SPEEDS,
  TICK_MS,
} from '../constants.ts';

/** Values extracted from js/app.js — parity gate. */
const REFERENCE = {
  SIM_SPEEDS: [1, 2, 4, 8, 16, 32],
  BASE_KMH: 60,
  FWD_CONE: 100,
  TICK_MS: 500,
  HEADING_MIN_MOVE_M: 3,
  DEFAULT_SPEED_IDX: 3,
  CHIME_FREQS: [523.25, 783.99],
  CHIME_DONE_MS: 750,
  RESUME_MIN_IDX: 2,
  SAVE_POS_EVERY_TICKS: 10,
};

describe('reference constants parity', () => {
  it('matches js/app.js constants', () => {
    expect(SIM_SPEEDS).toEqual(REFERENCE.SIM_SPEEDS);
    expect(BASE_KMH).toBe(REFERENCE.BASE_KMH);
    expect(FWD_CONE).toBe(REFERENCE.FWD_CONE);
    expect(TICK_MS).toBe(REFERENCE.TICK_MS);
    expect(HEADING_MIN_MOVE_M).toBe(REFERENCE.HEADING_MIN_MOVE_M);
    expect(DEFAULT_SPEED_IDX).toBe(REFERENCE.DEFAULT_SPEED_IDX);
    expect(CHIME_FREQS).toEqual(REFERENCE.CHIME_FREQS);
    expect(CHIME_DONE_MS).toBe(REFERENCE.CHIME_DONE_MS);
    expect(RESUME_MIN_IDX).toBe(REFERENCE.RESUME_MIN_IDX);
    expect(SAVE_POS_EVERY_TICKS).toBe(REFERENCE.SAVE_POS_EVERY_TICKS);
  });

  it('FWD_CONE is full angle diff threshold (not half)', () => {
    // js/app.js: angleDiff(heading, bearing(pos, s)) <= FWD_CONE
    expect(FWD_CONE).toBe(100);
  });
});
