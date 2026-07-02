#!/usr/bin/env python3
"""Download USGS topo tiles for a tour: full bbox at low zooms, corridor at high zoom.
Polite: 2 concurrent, proper User-Agent, retries."""
import argparse
import asyncio
import json
import math
import os
import ssl
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX = ssl.create_default_context(cafile=os.environ.get("TILE_CA_BUNDLE"))
UA = "GuideAlongOfflineDemo/1.0 (personal offline demo; set a real contact email here)"


def deg2tile(lat, lng, z):
    n = 2**z
    x = int((lng + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return x, y


def tiles_for_bbox(bbox, z):
    s, w, n, e = bbox
    x0, y0 = deg2tile(n, w, z)
    x1, y1 = deg2tile(s, e, z)
    return {(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def tiles_for_corridor(z, route, buffer_tiles=1):
    base = set()
    for lat, lng in route:
        base.add(deg2tile(lat, lng, z))
    out = set()
    for x, y in base:
        for dx in range(-buffer_tiles, buffer_tiles + 1):
            for dy in range(-buffer_tiles, buffer_tiles + 1):
                out.add((z, x + dx, y + dy))
    return out


async def fetch(out_dir, z, x, y, sem):
    path = f"{out_dir}/{z}/{x}/{y}.png"
    if os.path.exists(path) and os.path.getsize(path) > 100:
        return True
    os.makedirs(os.path.dirname(path), exist_ok=True)
    url = f"https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
    async with sem:
        for attempt in range(3):
            try:
                def get():
                    req = urllib.request.Request(url, headers={"User-Agent": UA})
                    with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
                        return r.read()

                data = await asyncio.get_event_loop().run_in_executor(None, get)
                if not (data[:2] == b"\xff\xd8" or data[:4] == b"\x89PNG"):
                    raise RuntimeError("not an image")
                with open(path, "wb") as f:
                    f.write(data)
                await asyncio.sleep(0.05)
                return True
            except Exception:
                await asyncio.sleep(1.5 * (attempt + 1))
        print(f"FAIL {z}/{x}/{y}", file=sys.stderr)
        return False


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tour", required=True, help="tour id")
    ap.add_argument("--count", action="store_true", help="count tiles only")
    args = ap.parse_args()

    tour_dir = os.path.join(ROOT, "tours", args.tour)
    config_path = os.path.join(tour_dir, "tour.config.json")
    route_path = os.path.join(tour_dir, "route.json")
    out_dir = os.path.join(tour_dir, "tiles")

    with open(config_path, encoding="utf-8") as f:
        config = json.load(f)
    bbox = tuple(config["bbox"])
    zooms = config["zooms"]
    full_zooms = zooms.get("full", [9, 10, 11, 12])
    corridor_z = zooms.get("corridor", 13)

    with open(route_path, encoding="utf-8") as f:
        route = json.load(f)
    route_thin = route[::5]

    todo = set()
    for z in full_zooms:
        todo |= tiles_for_bbox(bbox, z)
    todo |= tiles_for_corridor(corridor_z, route_thin, buffer_tiles=1)

    if args.count:
        from collections import Counter

        c = Counter(z for z, _, _ in todo)
        print(dict(sorted(c.items())), "total", len(todo))
        return

    sem = asyncio.Semaphore(2)
    results = await asyncio.gather(*(fetch(out_dir, z, x, y, sem) for z, x, y in sorted(todo)))
    print(f"done: {sum(results)}/{len(results)} ok")


if __name__ == "__main__":
    asyncio.run(main())
