import { describe, expect, it, vi } from 'vitest';
import { createMockChime } from '../chime.ts';
import { PlaybackController } from '../playback.ts';
import type { Stop } from '../types.ts';
import { createMockAudio } from './helpers.ts';

function stop(id: string): Stop {
  return {
    id,
    name: id,
    nameEn: id,
    lat: 0,
    lng: 0,
    radius: 100,
    category: 'landmark',
    text: 't',
  };
}

describe('PlaybackController', () => {
  it('queues second stop when first is playing', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });
    const queueEvents: string[][] = [];
    pb.on((ev) => {
      if (ev.type === 'queue') queueEvents.push(ev.queue.map((s) => s.id));
    });

    pb.playStop(stop('a'), true, null);
    pb.enqueue(stop('b'));
    expect(pb.getState().queue.map((s) => s.id)).toEqual(['b']);

    pb.handleEnded(null);
    expect(audio.url).toBe('b.mp3');
    expect(chime.count).toBe(2);
  });

  it('plays chime only for auto-triggered narration', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });

    pb.playStop(stop('a'), true, null);
    expect(chime.count).toBe(1);
    pb.playStop(stop('b'), false, null);
    expect(chime.count).toBe(1);
  });

  it('manual preview does not mark visited when far', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const visited: string[] = [];
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => ({ lat: 1, lng: 0 }),
    });
    pb.on((ev) => {
      if (ev.type === 'visited') visited.push(ev.stopId);
    });

    const s = { ...stop('a'), lat: 0, lng: 0, radius: 100 };
    pb.manualPlay(s, { lat: 1, lng: 0 });
    pb.handleEnded({ lat: 1, lng: 0 });
    expect(visited).toEqual([]);
  });

  it('clears queue on manual play', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });
    pb.enqueue(stop('a'));
    pb.manualPlay(stop('b'), null);
    expect(pb.getState().queue).toEqual([]);
  });

  it('more playback does not mark visited on end if still far', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const visited: string[] = [];
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id, more) => `${id}${more ? '-more' : ''}.mp3`,
      getPosition: () => ({ lat: 5, lng: 0 }),
    });
    pb.on((ev) => {
      if (ev.type === 'visited') visited.push(ev.stopId);
    });
    const s = { ...stop('a'), lat: 0, lng: 0, radius: 100 };
    pb.manualPlay(s, { lat: 5, lng: 0 });
    pb.playMore(s);
    pb.handleEnded({ lat: 5, lng: 0 });
    expect(visited).toEqual([]);
  });

  it('prev restarts track and next skips', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });
    pb.playStop(stop('a'), true, null);
    pb.prev();
    expect(audio.getCurrentTime()).toBe(0);
    pb.enqueue(stop('b'));
    pb.next();
    expect(audio.url).toBe('b.mp3');
  });

  it('pause and resume toggle state', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });
    pb.playStop(stop('a'), false, null);
    pb.pause();
    expect(pb.getState().isPaused).toBe(true);
    pb.resume();
    expect(pb.getState().isPaused).toBe(false);
  });

  it('seek delegates to audio port', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });
    pb.seek(30);
    expect(audio.getCurrentTime()).toBe(30);
  });

  it('destroy unsubscribes audio listeners', () => {
    const audio = createMockAudio();
    const chime = createMockChime();
    const pb = new PlaybackController({
      audio,
      chime,
      audioUrl: (id) => `${id}.mp3`,
      getPosition: () => null,
    });
    pb.destroy();
    audio.fireEnded();
    expect(audio.endedCbs.size).toBe(0);
  });
});

describe('createMockChime', () => {
  it('invokes done callback', () => {
    const chime = createMockChime();
    const done = vi.fn();
    chime.play(done);
    expect(done).toHaveBeenCalled();
  });
});
