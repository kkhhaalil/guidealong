#!/usr/bin/env python3
"""Generate bundled hero SVG per stop at tours/<id>/photos/<id>.svg."""
import argparse
import hashlib
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CAT_EMOJI = {
    "geyser": "⛲",
    "spring": "♨️",
    "falls": "\U0001f30a",
    "wildlife": "\U0001f9ac",
    "landmark": "\U0001f3de️",
    "info": "ℹ️",
    "story": "\U0001f4d6",
}
CAT_COLORS = {
    "geyser": ("#1b6ca8", "#2a9d8f", "#8fd3c7"),
    "spring": ("#c1440e", "#e8743d", "#f4c675"),
    "falls": ("#0b4f6c", "#1b8a9e", "#7fd1d8"),
    "wildlife": ("#3d2c14", "#7a5a2e", "#c9a15a"),
    "landmark": ("#14342b", "#2c6e57", "#6fae86"),
    "info": ("#2b2d42", "#4a5578", "#9aa4c4"),
    "story": ("#4a2c5a", "#7d4a8c", "#c79bd6"),
}


def esc(s):
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def ridge_path(seed, y, amp):
    rnd = seed
    pts = []
    for x in range(0, 421, 35):
        rnd = (rnd * 1103515245 + 12345) & 0x7FFFFFFF
        dy = (rnd % (amp * 2)) - amp
        pts.append(f"{x},{y + dy}")
    return "M0,300 L0," + f"{y} L" + " L".join(pts) + " L420,300 Z"


def svg_for(stop):
    cat = stop["category"]
    c0, c1, c2 = CAT_COLORS.get(cat, CAT_COLORS["landmark"])
    emoji = CAT_EMOJI.get(cat, "\U0001f4cd")
    seed = int(hashlib.sha1(stop["id"].encode()).hexdigest(), 16) & 0x7FFFFFFF
    r1 = ridge_path(seed, 205, 22)
    r2 = ridge_path(seed // 7 + 3, 240, 16)
    name = esc(stop["name"])
    name_en = esc(stop["nameEn"])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" font-family="-apple-system,'PingFang SC','Noto Sans SC',sans-serif">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{c0}"/>
      <stop offset="0.55" stop-color="{c1}"/>
      <stop offset="1" stop-color="{c2}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <circle cx="330" cy="70" r="34" fill="#fff" opacity="0.16"/>
  <path d="{r2}" fill="#000" opacity="0.10"/>
  <path d="{r1}" fill="#000" opacity="0.16"/>
  <text x="28" y="120" font-size="86" opacity="0.92">{emoji}</text>
  <rect width="400" height="300" fill="url(#shade)"/>
  <text x="28" y="250" fill="#fff" font-size="30" font-weight="700">{name}</text>
  <text x="28" y="278" fill="#fff" font-size="15" opacity="0.85">{name_en}</text>
</svg>
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tour", required=True, help="tour id")
    args = ap.parse_args()

    tour_dir = os.path.join(ROOT, "tours", args.tour)
    stops_path = os.path.join(tour_dir, "stops.json")
    out_dir = os.path.join(tour_dir, "photos")

    with open(stops_path, encoding="utf-8") as f:
        stops = json.load(f)

    os.makedirs(out_dir, exist_ok=True)
    for s in stops:
        with open(os.path.join(out_dir, f"{s['id']}.svg"), "w", encoding="utf-8") as f:
            f.write(svg_for(s))
    print(f"wrote {len(stops)} photos to tours/{args.tour}/photos/")


if __name__ == "__main__":
    main()
