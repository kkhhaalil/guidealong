import { describe, expect, it, vi } from 'vitest';
import { GpsSource } from '../position.ts';
import type { GeolocationPort } from '../types.ts';

describe('GpsSource', () => {
  it('wraps geolocation watchPosition', () => {
    const watch = vi.fn().mockReturnValue(42);
    const clear = vi.fn();
    const geo: GeolocationPort = { watchPosition: watch, clearWatch: clear };
    const gps = new GpsSource(geo);
    const cb = vi.fn();
    gps.start(cb);
    expect(watch).toHaveBeenCalled();
    const success = watch.mock.calls[0]![0] as (c: { latitude: number; longitude: number }) => void;
    success({ latitude: 44.5, longitude: -110.5 });
    expect(cb).toHaveBeenCalledWith({ lat: 44.5, lng: -110.5 });
    gps.stop();
    expect(clear).toHaveBeenCalledWith(42);
  });
});
