#!/usr/bin/env python3
"""Download OSM tiles for Yellowstone: z9-12 full bbox, z13 corridor around route.
Polite: 2 concurrent, proper User-Agent, retries."""
import asyncio, json, math, os, ssl, sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# CA override only needed behind a TLS-intercepting proxy (e.g. Claude Code cloud sandbox)
CTX = ssl.create_default_context(cafile=os.environ.get("TILE_CA_BUNDLE"))
OUT = os.path.join(ROOT, "tiles")
UA = "GuideAlongOfflineDemo/1.0 (personal offline demo; set a real contact email here)"
BBOX = (44.10, -111.20, 45.15, -109.80)  # s, w, n, e

def deg2tile(lat, lng, z):
    n = 2 ** z
    x = int((lng + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return x, y

def tiles_for_bbox(z):
    s, w, n, e = BBOX
    x0, y0 = deg2tile(n, w, z)
    x1, y1 = deg2tile(s, e, z)
    return {(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}

def tiles_for_corridor(z, route, buffer_tiles=1):
    """tiles touched by route points, dilated by buffer_tiles"""
    base = set()
    for lat, lng in route:
        base.add(deg2tile(lat, lng, z))
    out = set()
    for x, y in base:
        for dx in range(-buffer_tiles, buffer_tiles + 1):
            for dy in range(-buffer_tiles, buffer_tiles + 1):
                out.add((z, x + dx, y + dy))
    return out

async def fetch(z, x, y, sem):
    path = f"{OUT}/{z}/{x}/{y}.png"
    if os.path.exists(path) and os.path.getsize(path) > 100:
        return True
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # USGS The National Map (public domain); note {z}/{y}/{x} order
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
            except Exception as e:
                await asyncio.sleep(1.5 * (attempt + 1))
        print(f"FAIL {z}/{x}/{y}", file=sys.stderr)
        return False

async def main():
    src = open(os.path.join(ROOT, "js", "route-data.js")).read()
    start = src.index("[", src.index("TOUR_ROUTE"))
    route = json.loads(src[start:src.rindex("]") + 1])
    route = route[::5]  # thin for tile calc
    todo = set()
    for z in (9, 10, 11, 12):
        todo |= tiles_for_bbox(z)
    todo |= tiles_for_corridor(13, route, buffer_tiles=1)
    if "--count" in sys.argv:
        from collections import Counter
        c = Counter(z for z, _, _ in todo)
        print(dict(sorted(c.items())), "total", len(todo))
        return
    sem = asyncio.Semaphore(2)
    results = await asyncio.gather(*(fetch(z, x, y, sem) for z, x, y in sorted(todo)))
    print(f"done: {sum(results)}/{len(results)} ok")

asyncio.run(main())
