#!/usr/bin/env python3
"""Fetch road-following route for a tour via OSRM and write tours/<id>/route.json"""
import argparse
import json
import os
import ssl
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tour", required=True, help="tour id")
    args = ap.parse_args()

    tour_dir = os.path.join(ROOT, "tours", args.tour)
    config_path = os.path.join(tour_dir, "tour.config.json")
    out_path = os.path.join(tour_dir, "route.json")

    with open(config_path, encoding="utf-8") as f:
        config = json.load(f)
    wp = config["waypoints"]

    ctx = ssl.create_default_context(cafile=os.environ.get("TILE_CA_BUNDLE"))
    coords = ";".join(f"{lng},{lat}" for lng, lat in wp)
    url = (
        f"https://router.project-osrm.org/route/v1/driving/{coords}"
        "?overview=full&geometries=geojson&continue_straight=false"
    )
    with urllib.request.urlopen(url, context=ctx, timeout=120) as r:
        data = json.load(r)
    assert data["code"] == "Ok", data.get("code")
    route = data["routes"][0]
    geom = route["geometry"]["coordinates"]  # [lng,lat]
    print(f"distance {route['distance']/1000:.1f} km, {len(geom)} points")

    pts = [[round(lat, 5), round(lng, 5)] for lng, lat in geom]
    out = [pts[0]]
    for p in pts[1:]:
        if p != out[-1]:
            out.append(p)
    print(f"{len(out)} points after dedupe")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
        f.write("\n")
    print(f"written {out_path}")


if __name__ == "__main__":
    main()
