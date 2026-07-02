import { z } from 'zod';

/** Semantic color token keys — must match CSS vars in theme/global.css */
export const SEMANTIC_COLOR_TOKENS = [
  'surface',
  'ink',
  'primary',
  'accent',
  'posterSky',
  'posterLand',
  'gradientHero',
  'success',
  'warn',
  'danger',
] as const;

export type SemanticColorToken = (typeof SEMANTIC_COLOR_TOKENS)[number];

const themePaletteSchema = z.object(
  Object.fromEntries(
    SEMANTIC_COLOR_TOKENS.map((k) => [k, z.string().min(1)]),
  ) as Record<SemanticColorToken, z.ZodString>,
);

export const semanticColorTokenSchema = z.enum(SEMANTIC_COLOR_TOKENS);

export const tourManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  language: z.literal('zh-CN'),
  version: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  fileCount: z.number().int().nonnegative(),
  map: z.object({
    center: z.tuple([z.number(), z.number()]),
    minZoom: z.number().int(),
    maxZoom: z.number().int(),
    bounds: z.tuple([
      z.tuple([z.number(), z.number()]),
      z.tuple([z.number(), z.number()]),
    ]),
    attribution: z.string().min(1),
  }),
  theme: z.object({
    light: themePaletteSchema,
    dark: themePaletteSchema,
  }),
  posterArt: z.string().min(1),
});

export const stopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  radius: z.number().positive(),
  category: z.string().min(1),
  text: z.string().min(1),
  more: z.string().optional(),
  season: z.string().optional(),
  wildlife: z.string().optional(),
});

export const routeSchema = z.array(z.tuple([z.number(), z.number()]));

export const tourFileEntrySchema = z.object({
  path: z.string().min(1),
  bytes: z.number().int().nonnegative(),
});

export const tourIndexEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  version: z.string().min(1),
  posterArt: z.string().min(1),
});

export const tourIndexSchema = z.array(tourIndexEntrySchema);

export const stopsSchema = z.array(stopSchema);

export const tourFilesSchema = z.array(tourFileEntrySchema);

export type TourManifest = z.infer<typeof tourManifestSchema>;
export type Stop = z.infer<typeof stopSchema>;
export type Route = z.infer<typeof routeSchema>;
export type TourFileEntry = z.infer<typeof tourFileEntrySchema>;
export type TourIndexEntry = z.infer<typeof tourIndexEntrySchema>;
export type TourIndex = z.infer<typeof tourIndexSchema>;
export type ThemePalette = z.infer<typeof themePaletteSchema>;
