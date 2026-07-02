#!/usr/bin/env python3
"""Generate retro WPA-style poster SVG for a tour from manifest theme colors."""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def poster_svg(light: dict) -> str:
    sky = light["posterSky"]
    land = light["posterLand"]
    primary = light["primary"]
    accent = light["accent"]
    ink = light["ink"]
    surface = light["surface"]

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
  <rect width="400" height="560" fill="{surface}"/>
  <rect width="400" height="220" fill="{sky}"/>
  <path d="M0,220 L0,175 L45,155 L95,168 L140,130 L185,145 L230,105 L275,125 L320,95 L365,115 L400,100 L400,220 Z" fill="{primary}" opacity="0.92"/>
  <path d="M0,220 L0,195 L60,185 L120,200 L180,175 L240,190 L300,170 L360,185 L400,175 L400,220 Z" fill="{ink}" opacity="0.18"/>
  <ellipse cx="310" cy="72" rx="42" ry="42" fill="{accent}" opacity="0.85"/>
  <path d="M0,340 L0,280 L55,265 L110,290 L165,255 L220,275 L275,245 L330,268 L385,250 L400,260 L400,340 Z" fill="{land}"/>
  <path d="M0,560 L0,340 L70,325 L140,345 L210,315 L280,335 L350,310 L400,320 L400,560 Z" fill="{primary}" opacity="0.55"/>
  <rect y="480" width="400" height="80" fill="{ink}" opacity="0.08"/>
  <path d="M175,95 L185,55 L195,95 L220,95 L200,118 L208,145 L185,128 L162,145 L170,118 L150,95 Z" fill="{accent}" opacity="0.7"/>
</svg>
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tour", required=True, help="tour id (e.g. yellowstone, demo)")
    args = ap.parse_args()

    tour_dir = os.path.join(ROOT, "tours", args.tour)
    manifest_path = os.path.join(tour_dir, "manifest.json")
    if not os.path.isfile(manifest_path):
        sys.exit(f"missing {manifest_path}")

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    poster_name = manifest.get("posterArt", "poster.svg")
    out = os.path.join(tour_dir, poster_name)
    svg = poster_svg(manifest["theme"]["light"])
    with open(out, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
