# CLAUDE.md — Agent handover notes

Offline, mobile-first **multi-park GPS audio tour PWA** (GuideAlong-style).
React 18 + TypeScript + Vite + Tailwind; hash routing; on-demand tour downloads.
Shipped tours: **Yellowstone** (~28 MB, 53 stops, Mandarin narration) and a tiny
**demo** fixture for CI. HTTPS/PWA only — no `file://` support.

## Repository layout

```
app/                 Vite React TS PWA (shell)
  src/sw.ts          custom injectManifest service worker
  src/engine/        framework-free tour engine (no React imports)
  src/downloads/     tour download manager (runs in window, not SW)
  src/theme/         design tokens + per-park CSS-var applier
  src/components/ui/ plain React+Tailwind primitives (R1 fallback; see DECISIONS.md)
  public/icons/      PWA icons
  vite-plugin-tours.ts  dev/preview middleware serves ../tours; copies index.json to dist
tours/
  index.json         tour registry (precached in shell)
  <id>/              per-tour package: manifest.json, stops.json, route.json,
                     files.json, tour.config.json, audio/, tiles/, photos/, poster.svg
scripts/             parameterized Python pipeline (--tour <id>) + Node check scripts
e2e/                 Playwright suites + visual baselines
docs/
  ADD-A-PARK.md      end-to-end recipe for new parks
  DECISIONS.md       architecture decisions (incl. R1 gluestack fallback)
.github/workflows/
  ci.yml             full verify matrix on PR/push
  static.yml         build app + deploy dist + tours/ to GitHub Pages
```

## Runtime model

- **App shell** (HTML, JS/CSS bundles, fonts, icons, `tours/index.json`) is
  precached by the SW at install. Budget: **≤ 2.5 MB** precache (`npm run check:budgets`).
- **Tour packages** download on demand into per-tour caches. States:
  `not-downloaded` → `downloading (n%)` → `ready` (+ `update-available` when
  `tours/index.json` shows a newer `version`).
- **Routing:** hash-based — `#/` shelf → `#/tour/<id>` detail → `#/tour/<id>/map`.
  Works on GitHub Pages with no SPA rewrites; `vite.config.ts` uses `base: './'`
  so subpath deploys (`https://<user>.github.io/<repo>/`) resolve assets correctly.
- **Active tour:** fetch `stops.json` / `route.json` from cache (once downloaded);
  exactly one active tour; per-tour localStorage keys never clobber each other.
- **Offline after download:** zero network needed for a `ready` tour (D1). Shell
  alone works offline before any tour download (shelf + PWA install).

### Cache names

| Cache | Pattern | Contents |
|---|---|---|
| Shell | `shell-<buildHash>` | precache manifest from vite-plugin-pwa |
| Tour | `tour-<id>-v<version>` | all files from `files.json` + `__complete__` marker |
| Workbox | `workbox-*` | allowed; not deleted on activate |

On SW activate: delete caches not matching `shell-*` / `tour-*` / `workbox-*`
(kills legacy `ynp-*` caches). Post `ga-cleanup-legacy` to windows; app removes
`ynp-tour-visited`, `ynp-tour-pos` from localStorage.

### localStorage keys (§6.4)

| Key | Purpose |
|---|---|
| `ga.settings` | theme override (`light`/`dark`/`auto`), locale |
| `ga.activeTour` | last opened tour id |
| `ga.tour.<id>.visited` | `{v, ids[]}` visited stop ids |
| `ga.tour.<id>.resume` | `{v, simIdx, speedIdx, mode, ts}` auto-resume |

## Engine (`app/src/engine/`)

Ported from legacy `js/app.js` with behavior parity. Pure TS — testable without DOM.

| Module | Role |
|---|---|
| `geo.ts` | haversine, bearing, angleDiff |
| `position.ts` | `GpsSource` (watchPosition) + `SimSource` (route index, 500 ms tick) |
| `triggers.ts` | radius + forward-cone + half-radius direction gating |
| `playback.ts` | queue, chime-then-play, manual-preview-not-visited, `-more` playback |
| `persist.ts` | visited/resume per tour |
| `chime.ts` | WebAudio two-tone chime before auto-triggers only |
| `media-session.ts`, `wake-lock.ts` | browser API adapters |

**Parity constants** (`constants.ts`): `FWD_CONE=100°`, `BASE_KMH=60`,
`SIM_SPEEDS=[1,2,4,8,16,32]`, `TICK_MS=500`, `HEADING_MIN_MOVE_M=3`,
chime freqs 523.25/783.99 Hz. Unit tests include a recorded position-trace
parity fixture.

React consumes the engine via zustand; components never compute geometry.

## Download manager (`app/src/downloads/`)

Runs in the **window**, not the SW:

1. Fetch `tours/<id>/manifest.json` + `files.json`
2. For each file: `fetch()` + `cache.put()` into `tour-<id>-v<version>`
3. Concurrency 4; resumable (skips files already in cache via `cache.match`)
4. After all files verified: write synthetic `tours/<id>/__complete__` marker
5. `navigator.storage.persist()` after first successful download

Delete tour: `caches.delete('tour-<id>-v<n>')` + clear that tour's localStorage.
Update flow: compare `files.json` paths/bytes against cached version; re-download
changed files only.

SW fetch handler (`src/sw.ts`): shell assets → shell cache; `tours/<id>/**` →
tour cache (network fallback only if not downloaded); navigate → `index.html`.

## Design tokens + a11y

Three layers (PLAN §5.1):

1. **Primitives** — `app/src/theme/tokens.ts` + `tailwind.config.ts`
2. **Semantic CSS vars** — `--color-surface`, `--color-ink`, `--color-primary`, …
3. **Park palettes** — each `manifest.json` `theme.light` / `theme.dark` applied
   via `:root[data-tour]` when a tour is active

Road-trip baseline (enforced in CI):

- Touch targets ≥ 48×48 px (playback trio ≥ 56 px)
- WCAG AA contrast; **AAA for now-playing title** (both themes)
- Auto day/night + manual override; `prefers-reduced-motion`; Chinese `aria-label`s
- No page pinch-zoom; map keeps Leaflet zoom (`touch-action: none` on container)

`npm run check:contrast` — token pairs over shell + every tour palette × theme.

## R1 decision — plain React + Tailwind (no gluestack runtime)

WP0 gate failed on NativeWind v4 + gluestack v2 web interop. Fallback: token
architecture preserved; `components/ui/*` are semantic-token-styled React +
Tailwind with gluestack-compatible export names. See `docs/DECISIONS.md`.
Do not re-add `react-native-web` / NativeWind without revisiting that doc.

## Commands (from `app/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server; `/tours/` served by vite-plugin-tours middleware |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | preview server (also serves `/tours/`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint |
| `npm test -- --run` | vitest unit tests (engine coverage gate ≥ 90 %) |
| `npm run e2e` | build + Playwright (17 specs, visual baselines) |
| `npm run check:budgets` | shell precache ≤ 2.5 MB; main bundle ≤ 900 KB gzip |
| `npm run check:contrast` | WCAG token contrast over all palettes |
| `npm run check:lighthouse` | mobile perf ≥ 85 on shelf (needs Chrome) |
| `npm run check:recipe` | scaffold test-park from fixture + shelf smoke |
| `npm run icons` | regenerate PWA icons (`app/scripts/gen-icons.mjs`) |

E2E uses system Chrome: `PLAYWRIGHT_CHROME_PATH` / `CHROME_PATH`; launch args
include `--no-sandbox` for CI sandboxes.

## Content pipeline (`scripts/`)

All scripts accept `--tour <id>` and read/write `tours/<id>/`. Input config:
`tour.config.json` (waypoints, bbox, zooms, voice). Runtime manifest is
**generated** — do not hand-edit `version`/`bytes`/`fileCount`.

| Script | When to run | Notes |
|---|---|---|
| `gen_route.py --tour <id>` | after waypoint changes | OSRM public demo server |
| `get_tiles.py --tour <id>` | bbox/zoom changes | USGS topo; `--count` dry run; 2 concurrent |
| `gen_audio.py --tour <id>` | narration text edits | edge-tts; voice/rate from tour config |
| `gen_photos.py --tour <id>` | add/rename stops | SVG placeholders → `photos/<id>.svg` |
| `gen_poster.py --tour <id>` | palette changes | WPA-style shelf `poster.svg` |
| `gen_tour_manifest.py --tour <id>` | **after ANY tour asset change** | `files.json`, version hash, `tours/index.json` |
| `new_tour.py --id <id> --from-fixture` | scaffold test park | copies demo fixture |
| `gen_demo_tour.py` | regen CI fixture | deterministic tiny demo tour |
| `convert_legacy.py` | historical one-shot | needs legacy `js/` from git history (2178111) |

**Rule:** run `gen_tour_manifest.py` after any add/rename/delete under a tour
directory. Replaces the old `gen_sw.py` workflow — tours are NOT shell-precached.

## Environment gotchas (Claude Code cloud sandbox)

- Outbound TLS re-terminated by proxy. Python `urllib`/`edge-tts` need CA bundle:
  `TILE_CA_BUNDLE=/root/.ccr/ca-bundle.crt`; for edge-tts append to certifi
  (`cat /root/.ccr/ca-bundle.crt >> $(python3 -c "import certifi; print(certifi.where())")`).
- **openstreetmap.org tile server blocks bulk downloads** — use USGS only.
- **cloudflared tunnels do not work here** — egress blocks port 7844.
- GitHub access repo-scoped; downloading release binaries from other GitHub repos fails.
- Playwright: use system Chrome (`/usr/bin/google-chrome-stable`) with `--no-sandbox`.

## Deployment

`.github/workflows/static.yml`: `npm ci && npm run build` in `app/`, copy full
`tours/` to `app/dist/tours/`, upload `app/dist` as Pages artifact. SW does not
precache tour packages — total deploy size (shell + tours on disk) is fine for
Pages ≤ 1 GB.

Repo is **private**; GitHub Pages on private repos needs a paid plan
(`has_pages: false` as of 2026-07-02). Workflow must still be correct; publish
by making the repo public or using another HTTPS static host.

`base: './'` + hash routing + relative SW registration (`./sw.js`, scope `./`)
→ subpath-safe under `https://<user>.github.io/<repo>/`.

## Content notes

- Narration scripts are original text (warm 您-form, ~150–230 chars/stop).
  Facts from general knowledge — not verified against live sources.
- Tile attribution: "USGS The National Map" in Leaflet control; route from OSRM/OSM (ODbL).
- UI language Chinese; `nameEn` shown as secondary labels in stop list.
- Category icons: `app/src/theme/categoryIcons.ts` (`geyser`, `spring`, `falls`,
  `wildlife`, `landmark`, `info`, `story`).

## Adding a park

Follow `docs/ADD-A-PARK.md`. CI recipe eval (`npm run check:recipe`) proves the
scaffold path end-to-end.
