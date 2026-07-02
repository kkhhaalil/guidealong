#!/usr/bin/env python3
"""Generate retro WPA-style poster SVG for a tour from manifest theme colors."""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def poster_svg(light: dict, tour_id: str) -> str:
    sky = light["posterSky"]
    land = light["posterLand"]
    primary = light["primary"]
    accent = light["accent"]
    ink = light["ink"]
    surface = light["surface"]

    # Layered WPA landscape: sky band, distant peaks, mid hills, tree line, foreground land.
    geyser = ""
    if tour_id == "yellowstone":
        geyser = (
            f'  <ellipse cx="88" cy="248" rx="14" ry="38" fill="{accent}" opacity="0.55"/>\n'
            f'  <ellipse cx="88" cy="210" rx="22" ry="14" fill="{surface}" opacity="0.35"/>\n'
            f'  <path d="M72,248 Q88,200 104,248" fill="none" stroke="{surface}" stroke-width="3" opacity="0.5"/>'
        )

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560" role="img" aria-hidden="true">
  <rect width="400" height="560" fill="{surface}"/>
  <!-- sky -->
  <rect width="400" height="240" fill="{sky}"/>
  <rect y="200" width="400" height="40" fill="{sky}" opacity="0.35"/>
  <!-- sun -->
  <circle cx="318" cy="78" r="46" fill="{accent}" opacity="0.9"/>
  <circle cx="318" cy="78" r="34" fill="{accent}" opacity="0.55"/>
  <!-- distant mountain band -->
  <path d="M0,240 L0,195 L35,178 L78,192 L118,158 L162,172 L205,138 L248,155 L292,128 L336,148 L378,132 L400,142 L400,240 Z" fill="{primary}" opacity="0.88"/>
  <!-- mid ridge -->
  <path d="M0,240 L0,215 L52,205 L108,222 L158,198 L214,218 L268,192 L322,210 L372,198 L400,208 L400,240 Z" fill="{ink}" opacity="0.14"/>
  <!-- tree line silhouettes -->
  <path d="M0,300 L18,268 L32,300 Z" fill="{ink}" opacity="0.55"/>
  <path d="M42,300 L58,262 L74,300 Z" fill="{ink}" opacity="0.5"/>
  <path d="M96,300 L112,255 L128,300 Z" fill="{ink}" opacity="0.58"/>
  <path d="M148,300 L166,248 L184,300 Z" fill="{ink}" opacity="0.52"/>
  <path d="M210,300 L228,258 L246,300 Z" fill="{ink}" opacity="0.56"/>
  <path d="M268,300 L286,250 L304,300 Z" fill="{ink}" opacity="0.54"/>
  <path d="M330,300 L348,260 L366,300 Z" fill="{ink}" opacity="0.5"/>
  <path d="M378,300 L392,270 L400,300 Z" fill="{ink}" opacity="0.48"/>
  {geyser}
  <!-- rolling hills -->
  <path d="M0,360 L0,300 L48,288 L98,308 L148,282 L198,302 L248,276 L298,296 L348,278 L400,290 L400,360 Z" fill="{land}"/>
  <path d="M0,560 L0,360 L62,348 L124,368 L186,342 L248,362 L310,336 L372,354 L400,362 L400,560 Z" fill="{primary}" opacity="0.62"/>
  <!-- foreground accent band -->
  <path d="M0,560 L0,430 L80,418 L160,438 L240,412 L320,432 L400,420 L400,560 Z" fill="{land}" opacity="0.85"/>
  <!-- poster frame accent -->
  <rect x="12" y="12" width="376" height="536" fill="none" stroke="{accent}" stroke-width="4" opacity="0.45" rx="8"/>
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
    svg = poster_svg(manifest["theme"]["light"], args.tour)
    with open(out, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
