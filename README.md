# 沿途向导 · 离线 GPS 语音导览

A fully offline, mobile-first **Progressive Web App** for national-park GPS audio
tours — GuideAlong-style direction-aware narration, lock-screen controls, and
simulated driving. **Multi-park architecture:** download each tour on demand;
after download, **zero network** is needed in the park.

Shipped content:

- **黄石国家公园** — Yellowstone Grand Loop, 53 Mandarin-narrated stops (~28 MB)
- **演示公园** — tiny synthetic fixture for development and CI

UI is Chinese throughout; narration uses pre-generated neural TTS (云健 voice).

## Features

- Offline USGS topo map (per-tour tile packages, zoom 9–13)
- GPS auto-trigger with **direction-aware gating** (forward cone + half-radius rules)
- Simulator along the real road route at ×1–×32 speed
- Two-tone chime before auto-triggered narration; manual preview does not mark visited
- Layered 「了解更多」 deep-dive narration where stops have `more` text
- MediaSession (lock screen / car head unit) + Screen Wake Lock while touring
- Auto-resume sim position; per-tour visited progress
- Retro national-park poster design with per-park palettes and day/night themes
- PWA installable; app shell precached; tours downloaded separately

## Quick start

```bash
cd app
npm ci
npm run dev
```

Open the printed URL (default `http://localhost:5173`). The dev server serves
`tours/` from the repo root via Vite middleware — no copy step needed.

Production build:

```bash
cd app
npm run build          # → app/dist/
npm run preview        # serves dist/ + tours/
```

## Tests

From `app/`:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run check:budgets
npm run check:contrast
npm run e2e
npm run check:lighthouse    # needs Chrome
npm run check:recipe
```

E2E uses Playwright with system Chrome. In sandboxes, Chrome is launched with
`--no-sandbox`.

## Deploy (GitHub Pages)

`.github/workflows/static.yml` builds the Vite app, copies the full `tours/`
directory into `app/dist/tours/`, and deploys `app/dist` via GitHub Pages
actions. Triggers on push to `main` and `workflow_dispatch`.

The app uses `base: './'` and hash routing, so it works under a project subpath
(`https://<user>.github.io/<repo>/`) without extra configuration.

> **Note:** this repo is currently private; GitHub Pages on private repos
> requires a paid plan. Make the repo public (or use Netlify/Vercel/etc.) to publish.

## Add a new park

See **[docs/ADD-A-PARK.md](docs/ADD-A-PARK.md)** — scaffold from the demo
fixture or author `tour.config.json` + `stops.json`, run the Python pipeline,
design a palette (must pass `npm run check:contrast`), regenerate manifests.

## Repository layout

```
app/           React + Vite PWA (shell)
tours/         tour packages (yellowstone, demo, index.json)
scripts/       asset generation pipeline (--tour <id>)
e2e/           Playwright tests
docs/          ADD-A-PARK.md, DECISIONS.md
```

Agent-oriented notes: [CLAUDE.md](CLAUDE.md). Historical rebuild plan: [PLAN.md](PLAN.md).

## Credits & licenses

| Asset | Source | License / terms |
|---|---|---|
| Map tiles | [USGS The National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map) | US Government work (public domain) |
| Route geometry | [OSRM](http://project-osrm.org/) demo server on © OpenStreetMap contributors | ODbL |
| Narration audio | [edge-tts](https://github.com/rany2/edge-tts) (zh-CN-YunjianNeural) | scripts are original project content |
| Map library | [Leaflet](https://leafletjs.com/) | BSD-2-Clause |
| Display font | [Alfa Slab One](https://fonts.google.com/specimen/Alfa+Slab+One) | SIL Open Font License |
| Body font | [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3) | SIL Open Font License |

This is a personal offline demo project, not affiliated with GuideAlong.
