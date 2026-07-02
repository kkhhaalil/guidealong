import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import {
  routeSchema,
  stopsSchema,
  tourFilesSchema,
  tourIndexSchema,
  tourManifestSchema,
} from './tour';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(repoRoot, rel), 'utf-8')) as T;
}

function sumFileBytesOnDisk(tourId: string, files: { path: string; bytes: number }[]): number {
  let total = 0;
  for (const { path, bytes } of files) {
    const disk = readFileSync(join(repoRoot, 'tours', tourId, path)).length;
    expect(disk, `${tourId}/${path}`).toBe(bytes);
    total += disk;
  }
  return total;
}

describe('tour zod schemas', () => {
  for (const tourId of ['yellowstone', 'demo'] as const) {
    it(`validates ${tourId} manifest.json`, () => {
      const raw = readJson(`tours/${tourId}/manifest.json`);
      const manifest = tourManifestSchema.parse(raw);
      expect(manifest.schemaVersion).toBe(1);
      expect(manifest.language).toBe('zh-CN');
      expect(manifest.version).not.toBe('pending');
    });

    it(`validates ${tourId} stops.json as Stop[]`, () => {
      const stops = stopsSchema.parse(readJson(`tours/${tourId}/stops.json`));
      expect(stops.length).toBeGreaterThan(0);
      for (const stop of stops) {
        expect(stop.id).toBeTruthy();
        expect(stop.radius).toBeGreaterThan(0);
      }
    });

    it(`validates ${tourId} route.json`, () => {
      const route = routeSchema.parse(readJson(`tours/${tourId}/route.json`));
      expect(route.length).toBeGreaterThan(1);
    });

    it(`${tourId} files.json bytes match on-disk sizes`, () => {
      const manifest = tourManifestSchema.parse(readJson(`tours/${tourId}/manifest.json`));
      const files = tourFilesSchema.parse(readJson(`tours/${tourId}/files.json`));
      const diskTotal = sumFileBytesOnDisk(tourId, files);
      expect(diskTotal).toBe(manifest.bytes);
      expect(files.length).toBe(manifest.fileCount);
    });
  }

  it('validates tours/index.json', () => {
    const index = tourIndexSchema.parse(readJson('tours/index.json'));
    expect(index.length).toBeGreaterThanOrEqual(2);
    const ids = index.map((e) => e.id);
    expect(ids).toContain('yellowstone');
    expect(ids).toContain('demo');
  });

  it('rejects manifest missing required field', () => {
    const good = readJson<Record<string, unknown>>('tours/demo/manifest.json');
    const bad = { ...good };
    delete bad.title;
    expect(() => tourManifestSchema.parse(bad)).toThrow();
  });

  it('rejects manifest with wrong types', () => {
    const good = readJson<Record<string, unknown>>('tours/demo/manifest.json');
    const bad = { ...good, bytes: 'not-a-number' };
    expect(() => tourManifestSchema.parse(bad)).toThrow();
  });

  it('rejects stop missing radius', () => {
    const stops = readJson<Record<string, unknown>[]>('tours/demo/stops.json');
    const bad = stops.map((s) => ({ ...s }));
    delete bad[0].radius;
    expect(() => stopsSchema.parse(bad)).toThrow();
  });

  it('demo tour package stays under 300 KB', () => {
    const manifest = tourManifestSchema.parse(readJson('tours/demo/manifest.json'));
    expect(manifest.bytes).toBeLessThan(300 * 1024);
  });
});
