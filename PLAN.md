# PLAN — React + gluestack multi-park rebuild

Handover plan for rebuilding the GuideAlong-style offline GPS audio tour PWA in
**React + gluestack-ui**, with **multi-tour (multi-park) support**, **on-demand
offline tour downloads**, and a **shared design-token system** ("retro park
poster" design language). Deployment target stays **GitHub Pages**.

This document is the single source of truth for the rebuild. It is written so
that each work package (WP0–WP7, §8) can be handed to a different coding agent.
Every WP lists its scope, the contracts it must honor (§6), and machine-checkable
acceptance criteria. The cross-cutting eval harness is §7.

---

## 1. Decisions already made (do not re-litigate)

Confirmed with the project owner on 2026-07-02:

| # | Decision | Choice |
|---|---|---|
| D1 | Offline model | **On-demand tour downloads.** App shell precached (small); each tour is a separately downloadable package cached by the SW. "Zero network requests" is relaxed to: **zero network needed after a tour is downloaded** — the app must be fully functional offline in the park. |
| D2 | Multi-park scope | **Architecture + recipe only.** Yellowstone is the only real tour shipped. A tiny synthetic **demo tour** fixture proves multi-tour switching and powers tests. A documented "add a new park" recipe + parameterized scripts make new parks straightforward. |
| D3 | Stack | **gluestack-ui v2 (copy-paste components) + NativeWind v4 + react-native-web, bundled with Vite + React 18 + TypeScript.** Note: gluestack v5 dropped web support (NativeWind v5 is native-only), so the v2 line is deliberate. See risk R1 and its decision gate. |
| D4 | Design | **Retro national-park poster** (WPA style): bold flat color blocks, chunky display type, per-park signature palette delivered via design tokens. Road-trip a11y baseline is mandatory (§5.3). |
| D5 | Language | **i18n-ready, Chinese-only.** All UI strings extracted to a locale module; each tour manifest declares its narration language. Only `zh-CN` ships. |
| D6 | file:// support | **Dropped.** HTTPS/PWA only. `fetch()` is now allowed (required by D1). |
| D7 | Cutover | **Replace, fresh start.** New app replaces the old one at the site root. Old localStorage keys (`ynp-tour-visited`, `ynp-tour-pos`) and old SW caches are deleted, not migrated. |

Non-negotiable carryovers from the current app (see `js/app.js` on `main` for
reference implementations — the logic is battle-tested; port it, don't reinvent):

- Direction-aware triggering: stop auto-triggers only if within `radius` AND
  (bearing within `FWD_CONE = 100°` of heading, OR already within half radius).
  Heading derived from consecutive position deltas.
- Trigger queue: new triggers play immediately or queue behind current narration.
- Two-tone WebAudio chime before auto-triggered narration (not before manual play).
- Manual preview of a distant stop does NOT mark it visited (it must still
  auto-play on arrival).
- MediaSession metadata + play/pause/next/prev/seek handlers; Screen Wake Lock
  re-acquired on `visibilitychange`.
- Auto-resume: sim position + speed persisted; start screen offers 「继续上次行程」.
- Layered narration: stops with `more` get a detail panel (transcript,
  season/wildlife chips, 「播放延伸讲解」 playing `<id>-more.mp3`).
- Simulator: fractional index along route at 60 km/h × multiplier (×1…×32),
  tick 500 ms. Keep it — it's the dev/demo/test harness.
- No page pinch/double-tap zoom; map keeps its own zoom.

---

## 2. Current state (what exists on `main`)

Plain static HTML/JS app, no build step. ~29 MB total: 15 MB USGS tiles
(`tiles/{z}/{x}/{y}.png`, z9–13), 13 MB Mandarin TTS audio (53 stops + `-more`
variants), Leaflet vendored, generated `sw.js` precaching all 770 files.
`js/tour-data.js` (stops + `STOP_EXTRAS`), `js/route-data.js` (~8500-point OSRM
polyline), `js/app.js` (one IIFE). Generation pipeline in `scripts/`
(edge-tts audio, USGS tiles, OSRM route, SVG photo placeholders, SW manifest).
Deploy: `.github/workflows/static.yml` uploads the raw repo to GitHub Pages on
push to `main`. Pages note: the repo is private; Pages requires the repo to be
public or a paid plan — unchanged by this rebuild, still an open item.

---

## 3. Target architecture

### 3.1 Repository layout

```
/app/                          # Vite + React + TS app
  index.html
  vite.config.ts               # RNW alias, NativeWind, vite-plugin-pwa (injectManifest)
  tailwind.config.ts           # tokens (§5.1) — colors reference CSS variables
  gluestack-ui.config.json
  src/
    main.tsx
    sw.ts                      # custom service worker (injectManifest source)
    components/ui/             # gluestack-ui v2 copy-paste components (unmodified)
    components/                # app components (PosterCard, MapScreen, NowPlaying, …)
    screens/                   # TourShelf, TourDetail, MapScreen
    engine/                    # framework-free TS (no React imports) — §3.3
    downloads/                 # tour download manager — §3.4
    state/                     # zustand stores wrapping engine + downloads
    theme/                     # base tokens, palette→CSS-var applier, day/night
    i18n/                      # strings.zh-CN.ts + typed t() helper
    types/                     # TourManifest, Stop, … + zod schemas (§6.1)
/tours/
  index.json                   # tour registry: [{id, title, titleEn, bytes, version, …}]
  yellowstone/                 # converted from current js/tour-data.js etc.
    manifest.json
    stops.json
    route.json
    files.json                 # flat list of every file+bytes (downloader input)
    audio/<id>.mp3, <id>-more.mp3
    tiles/{z}/{x}/{y}.png
    photos/<id>.svg
  demo/                        # tiny synthetic fixture tour (§7.2)
/scripts/                      # generation pipeline, parameterized by --tour <id> (§4)
/docs/
  ADD-A-PARK.md                # the recipe (WP7)
/e2e/                          # Playwright suites (§7)
/.github/workflows/
  ci.yml                       # typecheck, lint, unit, e2e, budgets, axe (§7.7)
  static.yml                   # updated: build app, assemble dist + /tours, deploy Pages
```

The old root app (`index.html`, `js/`, `css/`, `sw.js`, `tiles/`, `assets/`,
`vendor/`) is deleted in WP7 after content is migrated into `/tours/yellowstone/`
(use `git mv` for audio/tiles/photos so blobs are reused and repo size doesn't
grow). Until WP7, old and new coexist on the branch.

### 3.2 Runtime model

- **App shell** (HTML, JS/CSS bundles, icons, fonts, `tours/index.json`,
  demo-tour metadata) is precached by the SW at install. Budget: **≤ 2.5 MB**
  precache (enforced, §7.6).
- **Tour packages** are downloaded on demand (§3.4) into per-tour caches.
  A tour has three states: `not-downloaded` → `downloading (n%)` → `ready`
  (+ `update-available` when `index.json` shows a newer version).
- **Routing**: hash-based client routing (GitHub Pages has no SPA rewrites;
  hash routes also work offline with zero server config). Screens:
  `#/` tour shelf → `#/tour/<id>` tour detail (download/open/delete) →
  `#/tour/<id>/map` the tour experience (map, list, now-playing).
- **Active tour** is loaded by fetching `stops.json` / `route.json` (served
  from cache once downloaded) and feeding them to the engine. Exactly one tour
  is active at a time. Per-tour persistence keys (§6.4) mean switching tours
  never clobbers another tour's progress.

### 3.3 Engine (framework-free core)

Port `js/app.js` logic into pure TS modules under `app/src/engine/` with **no
React or DOM imports** (WebAudio/Audio/geolocation behind thin injected
interfaces) so it is unit-testable:

- `geo.ts` — haversine, bearing, angleDiff (straight port).
- `position.ts` — `PositionSource` interface with two impls: `GpsSource`
  (watchPosition) and `SimSource` (route + speed multiplier, fractional index,
  500 ms tick). Emits `{lat, lng, heading}`.
- `triggers.ts` — pure function `evaluate(pos, heading, stops, visited) →
  Stop[]` implementing radius + forward-cone + half-radius rules.
- `playback.ts` — queue, chime-then-play, visited bookkeeping, manual-preview
  rule, layered `-more` playback. Drives an injected `AudioPort`.
- `persist.ts` — visited/resume state per tour (§6.4 keys), versioned schema.
- `media-session.ts`, `wake-lock.ts` — browser API adapters.

React consumes the engine via a zustand store; components never compute
geometry themselves.

### 3.4 Tour download manager + service worker

- Custom SW via `vite-plugin-pwa` **injectManifest** (not generateSW): precache
  manifest injected for the shell; tour caches are managed explicitly.
- **Download manager runs in the window, not the SW**: it fetches
  `tours/<id>/files.json`, then fetches each file and `cache.put()`s it into
  cache **`tour-<id>-v<version>`**, reporting progress (files + bytes done /
  total) to the UI. Downloads are **resumable**: on restart it skips files
  already in the cache (`cache.match`). Uses limited concurrency (4).
- SW fetch handler: shell → precache; `tours/<id>/**` → cache-first from the
  tour cache (fall back to network only if the tour isn't downloaded, e.g.
  online preview); never a silent network dependency for a `ready` tour.
- A tour is marked `ready` only after every file in `files.json` is verified
  present; the marker itself lives in the cache (a synthetic `__complete__`
  entry) so state survives localStorage clears.
- Delete tour = `caches.delete('tour-<id>-v<n>')` + clear that tour's
  localStorage keys. Show size via `navigator.storage.estimate()` and request
  `navigator.storage.persist()` after first download.
- Old-app cleanup: on activate, delete any cache not matching
  `shell-*` / `tour-*` (kills the legacy `ynp-*` cache), and remove legacy
  localStorage keys `ynp-tour-visited`, `ynp-tour-pos` (D7).

### 3.5 Map

Keep **Leaflet** (vendored via npm, bundled) with raster tiles — the tile
pipeline, offline story, and attribution are proven. Wrap it in one
`MapScreen` component (imperative Leaflet inside a ref; do NOT fight
react-leaflet vs react-native-web — plain Leaflet in a div is simpler and is
what we have today). Tile URL template comes from the active tour:
`tours/<id>/tiles/{z}/{x}/{y}.png`, zoom bounds + attribution from the manifest.

---

## 4. Content pipeline changes (scripts/)

All scripts gain `--tour <id>` and read/write `/tours/<id>/…`; waypoints,
bbox, and voice move out of script constants into each tour's
**`tour.config.json`** (checked in next to the manifest, input to scripts —
distinct from the runtime `manifest.json` which scripts *generate*):

| Script | Change |
|---|---|
| `gen_audio.py` | reads `stops.json`; voice/rate from tour config (default `zh-CN-YunjianNeural`, −4%); writes `tours/<id>/audio/` |
| `gen_route.py` | waypoints from tour config; writes `route.json` |
| `get_tiles.py` | bbox/zooms from tour config; writes `tours/<id>/tiles/` |
| `gen_photos.py` | writes `tours/<id>/photos/` |
| `gen_sw.py` | **retired** (vite-plugin-pwa replaces it); replaced by `gen_tour_manifest.py` which walks `tours/<id>/`, writes `files.json` (path+bytes), computes total size + content hash → `manifest.json.version`, and updates `tours/index.json` |
| new: `convert_legacy.py` | one-shot: evaluates old `js/tour-data.js` (Node, so `STOP_EXTRAS` merges apply) + `js/route-data.js` → `tours/yellowstone/{stops,route}.json` |

Environment gotchas (proxy CA bundle, OSM blocks bulk tiles → use USGS, edge-tts
certifi append) carry over unchanged from CLAUDE.md.

---

## 5. Design system — "Park Poster"

### 5.1 Token architecture (shared, three layers)

1. **Primitive tokens** (`app/src/theme/tokens.ts`, mirrored in
   `tailwind.config.ts`): type scale (chunky display face for headings — pick a
   bundled OFL font with full Latin + fallback stack for CJK, e.g. display font
   for numerals/EN + `PingFang SC / Noto Sans SC / sans-serif` for Chinese),
   spacing (4-pt grid), radii (large, poster-like), elevation, motion durations,
   z-indices.
2. **Semantic tokens** as CSS variables: `--color-surface`, `--color-ink`,
   `--color-primary`, `--color-accent`, `--color-poster-sky`,
   `--color-poster-land`, `--gradient-hero`, `--color-success/warn/danger`.
   Tailwind colors reference the variables, so **components never hardcode a
   park color**.
3. **Park palettes**: each tour manifest carries a `theme` block (§6.1) that the
   theme applier writes onto `:root[data-tour]`. Yellowstone: geyser teal +
   canyon gold + sunset orange. Demo tour: distinct palette (proves theming in
   tests, §7.5). Day/night: each palette ships `light` + `dark` variant sets;
   selected by `prefers-color-scheme` with a manual override persisted globally.

gluestack-ui components are themed through the same Tailwind config, so
gluestack primitives (Button, Actionsheet, Progress, Badge, Switch…) and custom
poster components share one token source.

### 5.2 Signature screens (bold, but buildable)

- **Tour shelf (`#/`)**: full-bleed poster cards, one per tour — flat layered
  landscape (SVG, generated per park from palette tokens; no photography
  needed), chunky title, download state chip (size / progress ring / ✓已下载).
- **Tour experience**: map with poster-tinted UI chrome; bottom **now-playing
  poster card** (hero art, stop name, progress bar, prev/play/next at ≥ 56 px);
  stop list as a bottom sheet (gluestack Actionsheet) with category emoji,
  distance, visited ticks.
- **Chips/badges** for season/wildlife; 「了解更多」 detail panel restyled as a
  poster back-page.

### 5.3 Road-trip accessibility baseline (hard requirements, all evaluated §7.5)

- Touch targets **≥ 48×48 px** (primary playback controls ≥ 56 px).
- Contrast **WCAG AA minimum; AAA for now-playing text** (glare). Both themes.
- Auto **day/night**; night theme avoids large bright surfaces.
- Glanceable: current stop name + play state readable at arm's length —
  now-playing title ≥ 24 px.
- Full function without pinch-zoom; `prefers-reduced-motion` respected;
  all controls have `aria-label`s (Chinese); focus-visible styles; audio never
  autoplays before a user gesture has unlocked the page (browser policy).

---

## 6. Contracts (all WPs must honor; defined precisely in WP1 with zod)

### 6.1 `TourManifest` (`tours/<id>/manifest.json`)

```ts
{
  schemaVersion: 1,
  id: string,                    // slug; doubles as cache-name component
  title: string, titleEn: string,
  language: "zh-CN",             // narration + content language (BCP 47)
  version: string,               // content hash from gen_tour_manifest.py
  bytes: number, fileCount: number,
  map: { center: [lat, lng], minZoom: number, maxZoom: number,
         bounds: [[s,w],[n,e]], attribution: string },
  theme: { light: Record<SemanticColorToken, string>,
           dark:  Record<SemanticColorToken, string> },
  posterArt: string,             // relative path to shelf-card SVG
}
```

`tours/index.json` = array of manifest summaries (id, title, titleEn, bytes,
version, posterArt) — the only file the shelf needs before download.

### 6.2 `Stop` (`stops.json`) — same fields as today's `TOUR_STOPS` with
`STOP_EXTRAS` pre-merged: `{id, name, nameEn, lat, lng, radius, category,
text, more?, season?, wildlife?}`. `id` still doubles as the audio filename.
`route.json` = `[[lat, lng], …]`.

### 6.3 Engine API (WP2 exports, WP3/WP6 consume)

```ts
createTourEngine(deps: {audio: AudioPort, clock, storage}): {
  loadTour(manifest, stops, route): void
  setPositionSource(src: PositionSource): void
  play(stopId, opts?: {manual?: boolean, more?: boolean}): void
  pause/resume/next/prev/seek(...)
  on(event: "trigger"|"play"|"ended"|"visited"|"position"|"queue", cb): Unsub
  getState(): EngineState   // serializable; drives the zustand store
}
```

### 6.4 Persistence keys (localStorage)

`ga.settings` (theme override, locale), `ga.activeTour`,
`ga.tour.<id>.visited` (string[]), `ga.tour.<id>.resume`
(`{simIdx, speedIdx, mode, ts}`). Caches: `shell-<buildHash>`,
`tour-<id>-v<version>`. Nothing else touches storage.

---

## 7. Eval harness (build alongside, not after)

Every WP's acceptance criteria reference these. All run in CI (§7.7); all
runnable locally (`npm run test`, `npm run e2e`, `npm run check:budgets`).

1. **Unit (vitest)** — engine geometry (haversine/bearing/cone against known
   fixtures), trigger rules incl. half-radius + manual-preview-not-visited,
   queue ordering, resume round-trip, zod schema validation of both real
   manifests. Coverage gate ≥ 90 % on `src/engine/`.
2. **Demo tour fixture** (`tours/demo/`): 4 stops (one with `more`), ~40-point
   route, 1-second generated tone MP3s, a handful of tiny solid-color tiles,
   distinct palette. Total < 300 KB. Deterministic, fast — E2E never needs the
   29 MB Yellowstone package.
3. **E2E (Playwright, Chromium at `/opt/pw-browsers/chromium`)** against
   `vite preview` +static `/tours`:
   - *drive*: download demo tour → sim ×32 → assert chime fired, narration
     element played (stubbed clock ok), stops become visited in order, queue
     behaves when two stops trigger close together.
   - *switching*: download demo → open Yellowstone detail → back → demo
     progress intact; palettes visibly differ (computed `--color-primary`).
   - *offline*: download demo → `context.setOffline(true)` → reload → shelf,
     map, tiles, narration all work; **request log asserts zero non-cached
     network requests while offline** (the D1 replacement for the old
     zero-request test).
   - *download UX*: progress advances; abort mid-download → resume completes;
     delete tour frees the cache and returns state to `not-downloaded`.
   - *resume*: mid-tour reload → 「继续上次行程」 restores position + speed.
4. **PWA install**: manifest valid, SW controls page after reload, shell loads
   offline pre-download (Lighthouse PWA checks + a Playwright reload-offline
   smoke on the shell alone).
5. **Accessibility + theming**: `@axe-core/playwright` on shelf / detail / map /
   now-playing / detail-panel in both themes — **zero serious/critical
   violations**; automated bounding-box assertion: every interactive element
   ≥ 48×48 (≥ 56 for playback trio); token contrast check script (computed
   fg/bg pairs meet §5.3) run over both palettes × both themes.
6. **Budgets (script, CI-enforced)**: SW precache total ≤ 2.5 MB; main JS
   bundle ≤ 900 KB gzip (react-native-web tax is why this isn't 300 KB — if
   exceeded, see R1 gate); Lighthouse (mobile, throttled) performance ≥ 85 on
   the shelf route.
7. **CI (`ci.yml`)**: on PR + push — install, typecheck (`tsc --noEmit`), lint
   (eslint), unit, build, budgets, E2E (demo tour), axe. Visual regression:
   Playwright screenshots of the 5 key screens × 2 themes committed as
   baselines, compared with `maxDiffPixelRatio: 0.02`.
8. **Recipe eval (proves D2)**: `scripts/new_tour.py --id test-park --from-fixture`
   scaffolds a valid tour skeleton; a CI job runs it into a temp dir, runs
   `gen_tour_manifest.py`, serves it, and asserts the new tour appears on the
   shelf and passes the *drive* E2E. If an agent can't add a park by following
   `docs/ADD-A-PARK.md` + this script, D2 has failed.

---

## 8. Work packages

Dependency graph: `WP0 → {WP1, WP2} → WP3 → {WP4, WP5} → WP6 → WP7`
(WP1 ∥ WP2; WP4 ∥ WP5; WP6 hardening pass — its *suites* are built inside
earlier WPs, WP6 finishes visual baselines, budgets, recipe eval, CI wiring).
Each agent: work on this branch, keep CI green, conventional commits.

### WP0 — Scaffold + stack spike (blocking; contains the R1 decision gate)
Vite + React 18 + TS + react-native-web alias + NativeWind v4 + Tailwind +
gluestack-ui v2 init (copy in Button, Box, Text, Progress, Actionsheet, Badge,
Switch, Spinner); vite-plugin-pwa injectManifest skeleton SW; hash router;
zustand; vitest + Playwright + eslint wiring; `ci.yml` running the empty
suites; base tokens (§5.1 layers 1–2) in Tailwind config.
**Accept**: `npm run build` + `preview` shows a gluestack Button styled by
tokens; SW registers + precaches; CI green; bundle budget script reports.
**Gate (R1)**: if gluestack-v2-on-Vite cannot be made to work cleanly in ~a day
of effort (NativeWind v4 babel/CSS interop is the known risk), STOP and record
a decision: fall back to *gluestack token architecture + plain React/Tailwind
components* (owner-approved fallback), keeping every other WP unchanged.

### WP1 — Tour data model + content conversion
zod schemas + TS types for §6.1/6.2; `convert_legacy.py`; build
`tours/yellowstone/` (git-mv audio/tiles/photos, generated stops/route/
manifest/files/index); build `tours/demo/` fixture (§7.2) + its generator
script; parameterize `scripts/` per §4; `gen_tour_manifest.py`; Yellowstone +
demo palettes + poster SVGs.
**Accept**: both manifests validate; unit schema tests pass; `files.json`
byte-accurate (checked against `du`); legacy JS data files still untouched on
disk (deleted only in WP7).

### WP2 — Engine port + unit tests
`app/src/engine/*` per §3.3 + §6.3, ported from `js/app.js` with behavior
parity; zustand store binding; chime, MediaSession, wake-lock, persist adapters.
**Accept**: §7.1 suite green with ≥ 90 % engine coverage; a parity fixture test
replays a recorded position trace from the current app and asserts the same
trigger sequence.

### WP3 — Core experience UI
Screens: tour shelf (cards read `tours/index.json`), tour detail, map screen
(Leaflet per §3.5) with markers/route/user puck/follow toggle, now-playing
poster card, stop-list actionsheet, 「了解更多」 panel, start/resume overlay,
sim controls (speed stepper, GPS/sim switch). Chinese strings via i18n module.
**Accept**: *drive*, *switching*, *resume* E2E suites green against demo tour;
manual-preview rule observable in E2E; no gluestack/DOM console errors.

### WP4 — Downloads + offline
Download manager + SW behavior per §3.4 (progress, resume, verify-complete,
delete, storage estimate/persist, legacy cache cleanup), shelf/detail download
UI states, update-available flow (new version → re-download changed files only,
by comparing `files.json` hashes).
**Accept**: *offline* + *download UX* E2E suites green; PWA checks (§7.4) pass;
zero-uncached-requests-offline assertion holds.

### WP5 — Poster design system pass
Implement §5.1–5.3 fully: per-park CSS-var theming from manifests, day/night +
manual override, poster shelf art, typography, motion, reduced-motion, focus
states, aria labels, target sizes.
**Accept**: §7.5 (axe, target sizes, contrast script) green in both themes ×
both palettes; screenshot baselines recorded.

### WP6 — Eval hardening + budgets
Finish §7: visual-regression wiring, Lighthouse CI job, budget scripts,
recipe eval (§7.8) incl. `scripts/new_tour.py` and flake-proofing the E2E
suites (retry once, deterministic clocks).
**Accept**: full CI matrix green twice in a row; budgets enforced (build fails
when exceeded — verified by a deliberate over-budget test commit reverted).

### WP7 — Cutover + docs
Update `static.yml`: checkout → `npm ci && npm run build` → assemble
`dist/ + tours/` → deploy. Delete legacy app files (root `index.html`, `js/`,
`css/`, `sw.js`, `tiles/`, `assets/`, `vendor/`, `manifest.webmanifest`) after
confirming `/tours/yellowstone` is complete. Write `docs/ADD-A-PARK.md`
(end-to-end recipe: config → scripts → palette → manifest → shelf) and rewrite
`CLAUDE.md` + `README.md` for the new architecture.
**Accept**: Pages workflow builds green from this branch (workflow_dispatch dry
run); deployed artifact serves shelf + full Yellowstone download + offline
drive on a real phone-sized viewport; docs recipe validated by §7.8 job.

---

## 9. Risks

- **R1 — gluestack v2 web-on-Vite fragility** (highest): v2 is a maintenance
  line (v5 dropped web); NativeWind v4 + Vite needs babel/JSX interop care.
  Mitigation: WP0 spike + explicit fallback gate (tokens + plain Tailwind).
- **R2 — Storage eviction**: browsers can evict Cache Storage. Mitigation:
  `storage.persist()`, verify-complete markers, cheap re-download resume.
- **R3 — Bundle weight** (react-native-web + Leaflet + gluestack): 900 KB gzip
  budget with CI enforcement; code-split Yellowstone-independent routes.
- **R4 — iOS quirks**: WakeLock/MediaSession partial support — feature-detect,
  degrade silently (as today); audio unlock requires first user gesture (start
  overlay already provides it).
- **R5 — Pages availability**: private repo still can't publish Pages (§2).
  Not this project's blocker; workflow must still be correct.

---

## 10. Definition of done (whole project)

Every §7 suite green in CI; a user on a phone can: install the PWA → download
Yellowstone with visible progress → turn on airplane mode → complete a
simulated (or GPS) Grand Loop drive with direction-aware auto-narration,
chimes, lock-screen controls, resume after force-quit → switch to the demo
tour and see a different park palette; and a new agent, given only
`docs/ADD-A-PARK.md`, can scaffold a working third tour that passes §7.8.
