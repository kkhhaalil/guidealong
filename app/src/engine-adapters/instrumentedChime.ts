import { createWebChime } from '../engine/chime.ts';
import type { ChimePort, ClockPort } from '../engine/types.ts';
import { pushGaEvent } from '../test/gaSurface.ts';

export function createInstrumentedChime(clock: ClockPort): ChimePort {
  const inner = createWebChime(clock);
  return {
    play(done) {
      pushGaEvent({ type: 'chime' });
      inner.play(done);
    },
  };
}
