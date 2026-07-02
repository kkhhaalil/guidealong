#!/usr/bin/env python3
"""One-shot: evaluate legacy js/tour-data.js + js/route-data.js → tours/yellowstone JSON.

Historical only — the legacy root app (js/, index.html, …) was removed in WP7.
To run this script, restore those files from git history, e.g.:

  git show 2178111:js/tour-data.js > js/tour-data.js
  git show 2178111:js/route-data.js > js/route-data.js
  mkdir -p js
  # … then run: python3 scripts/convert_legacy.py
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOUR_ID = "yellowstone"
TOUR_DIR = os.path.join(ROOT, "tours", TOUR_ID)
TOUR_DATA = os.path.join(ROOT, "js", "tour-data.js")
ROUTE_DATA = os.path.join(ROOT, "js", "route-data.js")


def eval_js(path, export_name):
    node = (
        "const fs=require('fs');"
        "eval(fs.readFileSync(%r,'utf8')+';globalThis.__E=%s');"
        "process.stdout.write(JSON.stringify(globalThis.__E));" % (path, export_name)
    )
    return json.loads(subprocess.check_output(["node", "-e", node]).decode("utf-8"))


def main():
    os.makedirs(TOUR_DIR, exist_ok=True)
    stops = eval_js(TOUR_DATA, "TOUR_STOPS")
    route = eval_js(ROUTE_DATA, "TOUR_ROUTE")

    with open(os.path.join(TOUR_DIR, "stops.json"), "w", encoding="utf-8") as f:
        json.dump(stops, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with open(os.path.join(TOUR_DIR, "route.json"), "w", encoding="utf-8") as f:
        json.dump(route, f, separators=(",", ":"))
        f.write("\n")

    print(f"wrote {len(stops)} stops, {len(route)} route points → tours/{TOUR_ID}/")


if __name__ == "__main__":
    main()
