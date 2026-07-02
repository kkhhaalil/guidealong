#!/usr/bin/env python3
"""Fetch road-following route for the tour via OSRM and write js/route-data.js"""
import json, os, ssl, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# CA override only needed behind a TLS-intercepting proxy (e.g. Claude Code cloud sandbox)
ctx = ssl.create_default_context(cafile=os.environ.get("TILE_CA_BUNDLE"))

# lng,lat waypoints in tour order (Lamar Valley is an out-and-back spur)
WP = [
    (-111.0940, 44.6586),  # West Entrance
    (-110.8600, 44.6455),  # Madison
    (-110.8069, 44.5497),  # Fountain Paint Pot
    (-110.8382, 44.5251),  # Grand Prismatic
    (-110.8535, 44.4855),  # Biscuit Basin
    (-110.8281, 44.4605),  # Old Faithful
    (-110.8047, 44.4437),  # Kepler Cascades
    (-110.5733, 44.4166),  # West Thumb
    (-110.4004, 44.5499),  # Lake Village
    (-110.3736, 44.5652),  # Fishing Bridge
    (-110.4344, 44.6247),  # Mud Volcano
    (-110.4680, 44.6600),  # Hayden Valley
    (-110.4996, 44.7115),  # Upper Falls
    (-110.4795, 44.7204),  # Artist Point
    (-110.4870, 44.7350),  # Canyon Village
    (-110.4436, 44.7856),  # Dunraven Pass
    (-110.3872, 44.8924),  # Tower Fall
    (-110.4160, 44.9160),  # Tower-Roosevelt
    (-110.2226, 44.8994),  # Lamar Valley
    (-110.4160, 44.9160),  # back to Tower-Roosevelt
    (-110.7028, 44.9699),  # Mammoth
    (-110.7290, 44.9330),  # Golden Gate
    (-110.7290, 44.7788),  # Roaring Mountain
    (-110.7031, 44.7267),  # Norris
    (-110.7409, 44.6957),  # Artists Paintpots
    (-110.7716, 44.6534),  # Gibbon Falls
    (-110.8600, 44.6455),  # back to Madison
]

coords = ";".join(f"{lng},{lat}" for lng, lat in WP)
url = f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&continue_straight=false"
with urllib.request.urlopen(url, context=ctx, timeout=120) as r:
    data = json.load(r)
assert data["code"] == "Ok", data.get("code")
route = data["routes"][0]
geom = route["geometry"]["coordinates"]  # [lng,lat]
print(f"distance {route['distance']/1000:.1f} km, {len(geom)} points")

# light downsample: keep every point but round to 5 decimals (~1m)
pts = [[round(lat, 5), round(lng, 5)] for lng, lat in geom]
# drop consecutive duplicates
out = [pts[0]]
for p in pts[1:]:
    if p != out[-1]:
        out.append(p)
print(f"{len(out)} points after dedupe")

with open(os.path.join(ROOT, "js", "route-data.js"), "w") as f:
    f.write("/* Grand Loop driving route (road-following, [lat,lng]) */\n")
    f.write("const TOUR_ROUTE = ")
    f.write(json.dumps(out, separators=(",", ":")))
    f.write(";\n")
print("written js/route-data.js")
