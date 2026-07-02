# Add a new park (tour)

End-to-end recipe for scaffolding a tour package under `tours/<id>/` and getting it
on the shelf. Yellowstone (`tours/yellowstone/`) is the reference implementation;
`demo` is a tiny synthetic fixture used by CI.

## Prerequisites

- **Python 3.10+** with `pip install edge-tts` (audio generation)
- **Node.js 22+** on PATH (scripts evaluate JSON; app checks run from `app/`)
- **Network** for OSRM route fetch, USGS tile download, and edge-tts (one-time per asset regen)
- Behind a TLS-intercepting proxy: set `TILE_CA_BUNDLE` and append the proxy CA to certifi
  before edge-tts (see [Environment gotchas](#environment-gotchas) below)

All commands assume repo root unless noted.

## Quick scaffold (fixture)

For a smoke-test park identical in shape to `demo`:

```bash
python3 scripts/new_tour.py --id my-park --from-fixture
```

This copies the demo fixture, renames stop ids, applies a neutral palette, runs
`gen_poster.py` and `gen_tour_manifest.py`, and updates `tours/index.json`.

Remove a scaffolded tour:

```bash
python3 scripts/new_tour.py --id my-park --remove
```

## Manual authoring (production park)

### 1. Create `tours/<id>/` and `tour.config.json`

Input file for the Python pipeline (not downloaded by the app). Example shape
(from `tours/yellowstone/tour.config.json`):

```json
{
  "waypoints": [[lng, lat], ...],
  "bbox": [south, west, north, east],
  "zooms": { "full": [9, 10, 11, 12], "corridor": 13 },
  "voice": "zh-CN-YunjianNeural",
  "rate": "-4%"
}
```

- **waypoints** — `[lng, lat]` pairs in driving order; OSRM connects them.
  Include spurs/out-and-backs explicitly (Yellowstone passes Tower-Roosevelt twice).
- **bbox** — `[south, west, north, east]` decimal degrees for low-zoom tile coverage.
- **zooms.full** — download every tile in bbox at these zooms (park overview).
- **zooms.corridor** — download tiles along the route (thinned) at this zoom only
  (road detail). Run `get_tiles.py --count` first to estimate size.

### 2. Write `stops.json`

Array of stops; fields per PLAN §6.2:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Slug; doubles as audio filename (`audio/<id>.mp3`) |
| `name` | string | Chinese display name |
| `nameEn` | string | English subtitle in stop list |
| `lat`, `lng` | number | WGS84 trigger coordinates |
| `radius` | number | Meters; auto-trigger when within this distance |
| `category` | string | One of: `geyser`, `spring`, `falls`, `wildlife`, `landmark`, `info`, `story` |
| `text` | string | Main narration script (~150–230 chars, 您-form, warm tour-guide tone) |
| `more` | string? | Deep-dive text; generates `audio/<id>-more.mp3` and 「了解更多」 UI |
| `season` | string? | Season/timing chip |
| `wildlife` | string? | Wildlife chip |

**Category emojis** (must match `app/src/theme/categoryIcons.ts`):

| category | emoji |
|---|---|
| geyser | ⛲ |
| spring | ♨️ |
| falls | 🌊 |
| wildlife | 🦬 |
| landmark | 🏞️ |
| info | ℹ️ |
| story | 📖 |

**Radius guidance:** scenic overlooks 80–120 m; geysers/springs 60–100 m; story
stops along roads 100–150 m. Too small misses triggers; too large fires early.

**Narration style:** original content, Mandarin, ~45–60 s spoken per stop.
Facts from general knowledge — not verified against live sources.

### 3. Draft `manifest.json`

Minimum skeleton (scripts fill `version`, `bytes`, `fileCount` later):

```json
{
  "schemaVersion": 1,
  "id": "my-park",
  "title": "我的公园",
  "titleEn": "My Park",
  "language": "zh-CN",
  "version": "pending",
  "bytes": 0,
  "fileCount": 0,
  "map": {
    "center": [lat, lng],
    "minZoom": 9,
    "maxZoom": 13,
    "bounds": [[south, west], [north, east]],
    "attribution": "USGS The National Map"
  },
  "theme": { "light": { ... }, "dark": { ... } },
  "posterArt": "poster.svg"
}
```

### 4. Generate route

```bash
python3 scripts/gen_route.py --tour my-park
```

Writes `tours/my-park/route.json` via the public OSRM demo server. Waypoints
must stay in sync with stop order along the drive.

### 5. Download map tiles

```bash
python3 scripts/get_tiles.py --tour my-park --count   # dry run — check tile counts
python3 scripts/get_tiles.py --tour my-park
```

Writes `tours/my-park/tiles/{z}/{x}/{y}.png` from **USGS The National Map**
(public domain). Do not use OpenStreetMap bulk download — blocked.

### 6. Generate narration audio

```bash
python3 scripts/gen_audio.py --tour my-park
# Regen subset:
python3 scripts/gen_audio.py --tour my-park stop-id another-id stop-id-more
```

Writes `tours/my-park/audio/<id>.mp3` and `<id>-more.mp3` where applicable.
Voice/rate come from `tour.config.json`.

### 7. Generate stop hero cards

```bash
python3 scripts/gen_photos.py --tour my-park
```

Writes `tours/my-park/photos/<id>.svg` placeholders (category gradient + emoji).
Replace with `<id>.jpg` later if desired; update `files.json` after.

### 8. Design palette

Edit `manifest.json` → `theme.light` and `theme.dark`. Ten semantic tokens
each (must match `app/src/types/tour.ts`):

`surface`, `ink`, `primary`, `accent`, `posterSky`, `posterLand`, `gradientHero`,
`success`, `warn`, `danger`

```bash
cd app && npm run check:contrast
```

Must pass. Pair rules enforced (WCAG AA minimum; AAA for now-playing title):

- body text (ink/surface) ≥ 4.5:1
- muted text ≥ 4.5:1
- now-playing title (ink/surface) ≥ **7.0:1** (AAA)
- primary button text ≥ 4.5:1
- primary on surface ≥ 4.5:1
- poster ink on sky/land ≥ 3.0:1

### 9. Generate poster shelf art

```bash
python3 scripts/gen_poster.py --tour my-park
```

Writes `tours/my-park/poster.svg` from palette tokens.

### 10. Regenerate manifests (required after ANY tour asset change)

```bash
python3 scripts/gen_tour_manifest.py --tour my-park
```

Walks `tours/my-park/`, writes `files.json` (every file + byte size), computes
content hash → `manifest.json.version`, updates **`tours/index.json`** for all
tours. Re-run after any add/rename/delete under the tour directory.

## Verify

```bash
cd app
npm run typecheck
npm test -- --run
npm run build
npm run check:budgets      # shell precache only — tour packages are NOT precached
npm run check:contrast
npm run check:recipe     # scaffolds test-park from fixture; full recipe eval
npm run e2e              # uses demo tour; add targeted tests if needed
```

Manual smoke: `npm run dev` → shelf shows new tour → download → open map → sim
drive → offline reload works.

## Environment gotchas

- **Proxy TLS:** `export TILE_CA_BUNDLE=/path/to/ca-bundle.crt` for `urllib` in
  `get_tiles.py` / `gen_route.py`. For edge-tts:
  `cat $TILE_CA_BUNDLE >> $(python3 -c "import certifi; print(certifi.where())")`
- **OSM tiles blocked** for bulk download — USGS only.
- **cloudflared tunnels** do not work in some sandboxes (egress blocks port 7844).

## Attribution

Keep `map.attribution` as `"USGS The National Map"` for USGS tiles. Route geometry
derives from OpenStreetMap via OSRM (ODbL) — credit in README.
