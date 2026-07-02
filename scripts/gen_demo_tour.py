#!/usr/bin/env python3
"""Scaffold the tiny synthetic demo tour fixture (PLAN §7.2)."""
import json
import math
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOUR_ID = "demo"
TOUR_DIR = os.path.join(ROOT, "tours", TOUR_ID)

# Fictional "Painted Desert Demo Park" loop near Petrified Forest area
CENTER_LAT, CENTER_LNG = 35.065, -109.78
BBOX = (34.98, -109.92, 35.15, -109.64)  # s, w, n, e

DEMO_THEME = {
    "light": {
        "surface": "#f5e8e0",
        "ink": "#2a1820",
        "primary": "#8b3a62",
        "accent": "#c44d2a",
        "posterSky": "#c98a9e",
        "posterLand": "#7a3d52",
        "gradientHero": "linear-gradient(165deg, #c98a9e 0%, #8b3a62 45%, #7a3d52 100%)",
        "success": "#4a8b5c",
        "warn": "#d4762a",
        "danger": "#b83248",
    },
    "dark": {
        "surface": "#1a1218",
        "ink": "#f0e4e8",
        "primary": "#d47aa8",
        "accent": "#e87850",
        "posterSky": "#4a2838",
        "posterLand": "#3a2030",
        "gradientHero": "linear-gradient(165deg, #4a2838 0%, #d47aa8 45%, #3a2030 100%)",
        "success": "#6ab080",
        "warn": "#e8a050",
        "danger": "#e86070",
    },
}

STOPS = [
    {
        "id": "demo-welcome",
        "name": "欢迎来到演示公园",
        "nameEn": "Welcome to Demo Park",
        "lat": 35.072,
        "lng": -109.805,
        "radius": 400,
        "category": "info",
        "text": "欢迎体验离线导览演示！这是一条虚构的沙漠环线，用于测试多公园切换。",
    },
    {
        "id": "demo-ridge",
        "name": "彩绘山脊",
        "nameEn": "Painted Ridge",
        "lat": 35.088,
        "lng": -109.755,
        "radius": 350,
        "category": "landmark",
        "text": "眼前这道赭红色山脊是沉积岩层层叠染色的结果，夕阳下尤其艳丽。",
        "more": "延伸讲解：数百万年的风化与氧化铁沉积，让岩层呈现出从紫红到锈橙的渐变。",
    },
    {
        "id": "demo-spring",
        "name": "紫泉洼地",
        "nameEn": "Violet Spring Basin",
        "lat": 35.055,
        "lng": -109.735,
        "radius": 300,
        "category": "spring",
        "text": "这处浅洼地因矿物质富集而呈现淡紫色，是干旱区难得的水源痕迹。",
        "season": "春季",
        "wildlife": "沙漠蜥蜴",
    },
    {
        "id": "demo-finish",
        "name": "环线终点",
        "nameEn": "Loop Finish",
        "lat": 35.045,
        "lng": -109.795,
        "radius": 350,
        "category": "info",
        "text": "演示环线即将闭合。您可以切换回黄石公园，体验不同的海报配色。",
    },
]


def synthetic_route(n=40):
    """Ellipse loop around center."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        lat = CENTER_LAT + 0.045 * math.sin(t)
        lng = CENTER_LNG + 0.055 * math.cos(t)
        pts.append([round(lat, 5), round(lng, 5)])
    pts.append(pts[0])
    return pts


def deg2tile(lat, lng, z):
    n = 2**z
    x = int((lng + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return x, y


def tiles_for_route(route, zooms=(13, 14, 15)):
    seen = set()
    for z in zooms:
        for lat, lng in route:
            x, y = deg2tile(lat, lng, z)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    seen.add((z, x + dx, y + dy))
    return sorted(seen)


def write_png(path, r, g, b, size=256):
    """Minimal uncompressed RGB PNG (small for solid colors)."""
    import struct
    import zlib

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b""
    row = bytes([0] + [r, g, b] * size)
    for _ in range(size):
        raw += row
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))


TILE_COLORS = [
    (0x8b, 0x3a, 0x62),
    (0xc4, 0x4d, 0x2a),
    (0xc9, 0x8a, 0x9e),
    (0x7a, 0x3d, 0x52),
    (0xf5, 0xe8, 0xe0),
    (0x2a, 0x18, 0x20),
]


def gen_mp3(path, freq=440):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency={freq}:duration=1",
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "9",
            path,
        ],
        check=True,
    )


def main():
    os.makedirs(TOUR_DIR, exist_ok=True)
    route = synthetic_route(40)

    with open(os.path.join(TOUR_DIR, "stops.json"), "w", encoding="utf-8") as f:
        json.dump(STOPS, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with open(os.path.join(TOUR_DIR, "route.json"), "w", encoding="utf-8") as f:
        json.dump(route, f, separators=(",", ":"))
        f.write("\n")

    config = {
        "waypoints": [
            [-109.805, 35.072],
            [-109.755, 35.088],
            [-109.735, 35.055],
            [-109.795, 35.045],
            [-109.805, 35.072],
        ],
        "bbox": list(BBOX),
        "zooms": {"full": [13, 14], "corridor": 15},
        "voice": "zh-CN-YunjianNeural",
        "rate": "-4%",
    }
    with open(os.path.join(TOUR_DIR, "tour.config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
        f.write("\n")

    s, w, n, e = BBOX
    manifest = {
        "schemaVersion": 1,
        "id": TOUR_ID,
        "title": "演示公园",
        "titleEn": "Demo Park",
        "language": "zh-CN",
        "version": "pending",
        "bytes": 0,
        "fileCount": 0,
        "map": {
            "center": [round((s + n) / 2, 4), round((w + e) / 2, 4)],
            "minZoom": 13,
            "maxZoom": 15,
            "bounds": [[s, w], [n, e]],
            "attribution": "Demo fixture — not real map data",
        },
        "theme": DEMO_THEME,
        "posterArt": "poster.svg",
    }
    with open(os.path.join(TOUR_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    freqs = [440, 523, 659, 784, 880]
    audio_ids = [s["id"] for s in STOPS]
    audio_ids.append("demo-ridge-more")
    for i, aid in enumerate(audio_ids):
        gen_mp3(os.path.join(TOUR_DIR, "audio", f"{aid}.mp3"), freqs[i % len(freqs)])

    tiles = tiles_for_route(route)
    for i, (z, x, y) in enumerate(tiles):
        r, g, b = TILE_COLORS[i % len(TILE_COLORS)]
        write_png(
            os.path.join(TOUR_DIR, "tiles", str(z), str(x), f"{y}.png"),
            r,
            g,
            b,
        )

    subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", "gen_poster.py"), "--tour", TOUR_ID],
        check=True,
        cwd=ROOT,
    )
    subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", "gen_tour_manifest.py"), "--tour", TOUR_ID],
        check=True,
        cwd=ROOT,
    )

    total = sum(
        os.path.getsize(os.path.join(dirpath, f))
        for dirpath, _, files in os.walk(TOUR_DIR)
        for f in files
    )
    print(f"demo tour total: {total} bytes ({len(tiles)} tiles, {len(audio_ids)} mp3s)")


if __name__ == "__main__":
    main()
