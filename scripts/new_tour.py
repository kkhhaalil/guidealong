#!/usr/bin/env python3
"""Scaffold a new tour from the demo fixture (PLAN §7.8) or remove a scaffolded tour."""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOURS_DIR = os.path.join(ROOT, "tours")
FIXTURE_ID = "demo"

NEUTRAL_THEME = {
    "light": {
        "surface": "#eef2f0",
        "ink": "#1a2420",
        "primary": "#3d6b5c",
        "accent": "#c47a3a",
        "posterSky": "#8ab4c4",
        "posterLand": "#4a7a62",
        "gradientHero": "linear-gradient(165deg, #8ab4c4 0%, #3d6b5c 45%, #4a7a62 100%)",
        "success": "#4a8b5c",
        "warn": "#d4762a",
        "danger": "#b83248",
    },
    "dark": {
        "surface": "#141a18",
        "ink": "#e8f0ec",
        "primary": "#6ab090",
        "accent": "#e09050",
        "posterSky": "#2a3840",
        "posterLand": "#243830",
        "gradientHero": "linear-gradient(165deg, #2a3840 0%, #6ab090 45%, #243830 100%)",
        "success": "#6ab080",
        "warn": "#e8a050",
        "danger": "#e86070",
    },
}


def slug_title(tour_id: str) -> tuple[str, str]:
    parts = tour_id.replace("_", "-").split("-")
    title_en = " ".join(p.capitalize() for p in parts)
    return f"{title_en} 测试公园", title_en + " Test Park"


def replace_demo_ids(obj, tour_id: str):
    """Recursively replace demo-* stop ids and demo tour id in JSON structures."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            nk = k
            if k == "id" and v == FIXTURE_ID:
                nk = "id"
                v = tour_id
            out[nk] = replace_demo_ids(v, tour_id)
        return out
    if isinstance(obj, list):
        return [replace_demo_ids(x, tour_id) for x in obj]
    if isinstance(obj, str):
        if obj == FIXTURE_ID:
            return tour_id
        if obj.startswith("demo-"):
            return f"{tour_id}-{obj[5:]}"
        return obj.replace(FIXTURE_ID, tour_id)
    return obj


def copy_fixture(tour_id: str) -> None:
    src = os.path.join(TOURS_DIR, FIXTURE_ID)
    dst = os.path.join(TOURS_DIR, tour_id)
    if not os.path.isdir(src):
        sys.exit(f"missing fixture tour at {src}")
    if os.path.exists(dst):
        sys.exit(f"tour already exists: {dst}")

    title, title_en = slug_title(tour_id)

    shutil.copytree(
        src,
        dst,
        ignore=shutil.ignore_patterns("files.json", "manifest.json", "poster.svg"),
    )

    with open(os.path.join(src, "stops.json"), encoding="utf-8") as f:
        stops = json.load(f)
    stops = replace_demo_ids(stops, tour_id)
    with open(os.path.join(dst, "stops.json"), "w", encoding="utf-8") as f:
        json.dump(stops, f, ensure_ascii=False, indent=2)
        f.write("\n")

    shutil.copy2(os.path.join(src, "route.json"), os.path.join(dst, "route.json"))
    shutil.copy2(os.path.join(src, "tour.config.json"), os.path.join(dst, "tour.config.json"))

    with open(os.path.join(src, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    manifest = replace_demo_ids(manifest, tour_id)
    manifest["title"] = title
    manifest["titleEn"] = title_en
    manifest["theme"] = NEUTRAL_THEME
    manifest["version"] = "pending"
    manifest["bytes"] = 0
    manifest["fileCount"] = 0
    with open(os.path.join(dst, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    audio_src = os.path.join(src, "audio")
    audio_dst = os.path.join(dst, "audio")
    os.makedirs(audio_dst, exist_ok=True)
    for name in os.listdir(audio_src):
        if not name.endswith(".mp3"):
            continue
        new_name = re.sub(r"^demo-", f"{tour_id}-", name)
        shutil.copy2(os.path.join(audio_src, name), os.path.join(audio_dst, new_name))

    subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", "gen_poster.py"), "--tour", tour_id],
        check=True,
        cwd=ROOT,
    )
    subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", "gen_tour_manifest.py"), "--tour", tour_id],
        check=True,
        cwd=ROOT,
    )
    print(f"scaffolded tours/{tour_id}/ from {FIXTURE_ID} fixture")


def remove_tour(tour_id: str) -> None:
    dst = os.path.join(TOURS_DIR, tour_id)
    if not os.path.isdir(dst):
        print(f"nothing to remove: {dst}")
    else:
        shutil.rmtree(dst)
        print(f"removed tours/{tour_id}/")
    subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", "gen_tour_manifest.py"), "--all"],
        check=True,
        cwd=ROOT,
    )


def main():
    ap = argparse.ArgumentParser(description="Scaffold or remove a tour package")
    ap.add_argument("--id", help="tour slug (e.g. test-park)")
    ap.add_argument(
        "--from-fixture",
        action="store_true",
        help=f"copy tours/{FIXTURE_ID}/ and substitute ids",
    )
    ap.add_argument("--remove", metavar="ID", help="delete tours/<id>/ and refresh index.json")
    args = ap.parse_args()

    if args.remove:
        remove_tour(args.remove)
        return

    if not args.id or not args.from_fixture:
        ap.error("--id and --from-fixture are required to scaffold")

    if args.id == FIXTURE_ID:
        sys.exit(f"refusing to overwrite fixture tour {FIXTURE_ID}")

    copy_fixture(args.id)


if __name__ == "__main__":
    main()
