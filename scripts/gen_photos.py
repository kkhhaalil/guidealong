#!/usr/bin/env python3
"""Generate a bundled hero image per tour stop at assets/photos/<id>.svg.

These are lightweight, offline, license-free placeholder cards (category-themed
gradient + emoji + names + a subtle topographic texture). They give the
now-playing card and MediaSession a visual without any runtime network request.

To use real photography instead, drop <id>.jpg files into assets/photos/ and
point the UI at them (js/app.js photoUrl()); keep them small (~40-80 KB) so the
offline precache stays lean. Public-domain NPS/USGS imagery is a good source.

Run after adding/renaming stops, then regenerate sw.js.
"""
import hashlib
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "js", "tour-data.js")
OUT = os.path.join(ROOT, "assets", "photos")

CAT_EMOJI = {
    "geyser": "⛲", "spring": "♨️", "falls": "\U0001f30a",
    "wildlife": "\U0001f9ac", "landmark": "\U0001f3de️", "info": "ℹ️",
    "story": "\U0001f4d6",
}
# base gradient stops per category (top, mid, bottom)
CAT_COLORS = {
    "geyser":   ("#1b6ca8", "#2a9d8f", "#8fd3c7"),
    "spring":   ("#c1440e", "#e8743d", "#f4c675"),
    "falls":    ("#0b4f6c", "#1b8a9e", "#7fd1d8"),
    "wildlife": ("#3d2c14", "#7a5a2e", "#c9a15a"),
    "landmark": ("#14342b", "#2c6e57", "#6fae86"),
    "info":     ("#2b2d42", "#4a5578", "#9aa4c4"),
    "story":    ("#4a2c5a", "#7d4a8c", "#c79bd6"),
}


def parse_stops():
    node = (
        "const fs=require('fs');"
        "eval(fs.readFileSync(%r,'utf8')+';globalThis.__S=TOUR_STOPS');"
        "process.stdout.write(JSON.stringify(globalThis.__S.map("
        "s=>({id:s.id,name:s.name,nameEn:s.nameEn,category:s.category}))));" % SRC
    )
    raw = subprocess.check_output(["node", "-e", node]).decode("utf-8")
    return json.loads(raw)


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def ridge_path(seed, y, amp):
    """A gentle deterministic mountain-ridge polyline across the 400-wide card."""
    rnd = seed
    pts = []
    for x in range(0, 421, 35):
        rnd = (rnd * 1103515245 + 12345) & 0x7fffffff
        dy = (rnd % (amp * 2)) - amp
        pts.append(f"{x},{y + dy}")
    return "M0,300 L0," + f"{y} L" + " L".join(pts) + " L420,300 Z"


def svg_for(stop):
    cat = stop["category"]
    c0, c1, c2 = CAT_COLORS.get(cat, CAT_COLORS["landmark"])
    emoji = CAT_EMOJI.get(cat, "\U0001f4cd")
    seed = int(hashlib.sha1(stop["id"].encode()).hexdigest(), 16) & 0x7fffffff
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
    os.makedirs(OUT, exist_ok=True)
    stops = parse_stops()
    for s in stops:
        with open(os.path.join(OUT, f"{s['id']}.svg"), "w", encoding="utf-8") as f:
            f.write(svg_for(s))
    print(f"wrote {len(stops)} photos to assets/photos/")


if __name__ == "__main__":
    main()
