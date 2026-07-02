import { createWebChime } from '../engine/chime.ts';
import type { ChimePort, ClockPort } from '../engine/types.ts';
import { setNarrationAudioSession } from './audioSession.ts';
import { getVolume } from '../state/volumePreference.ts';
import { pushGaEvent } from '../test/gaSurface.ts';

export function createInstrumentedChime(clock: ClockPort): ChimePort {
  const inner = createWebChime(clock, { getVolume });
  return {
    play(done) {
      // The chime precedes auto-triggered narration — claim the exclusive
      // session now so the music fades before the tones (iOS).
      setNarrationAudioSession();
      pushGaEvent({ type: 'chime' });
      inner.play(done);
    },
  };
}
