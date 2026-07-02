#!/usr/bin/env python3
"""Walk tours/<id>/, write files.json, update manifest version/bytes/fileCount, tours/index.json."""
import argparse
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOURS_DIR = os.path.join(ROOT, "tours")
SKIP_IN_FILES = {"manifest.json", "files.json", "tour.config.json"}


def file_content_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def package_version(tour_dir: str, entries: list[dict]) -> str:
    parts = []
    for e in sorted(entries, key=lambda x: x["path"]):
        full = os.path.join(tour_dir, e["path"])
        parts.append(f"{e['path']}:{file_content_hash(full)}")
    digest = hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()
    return digest[:12]


def collect_files(tour_dir: str) -> list[dict]:
    entries = []
    for dirpath, _dirnames, filenames in os.walk(tour_dir):
        for name in filenames:
            if name in SKIP_IN_FILES:
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, tour_dir).replace(os.sep, "/")
            entries.append({"path": rel, "bytes": os.path.getsize(full)})
    entries.sort(key=lambda x: x["path"])
    return entries


def update_tour(tour_id: str) -> dict:
    tour_dir = os.path.join(TOURS_DIR, tour_id)
    manifest_path = os.path.join(tour_dir, "manifest.json")
    if not os.path.isfile(manifest_path):
        sys.exit(f"missing {manifest_path}")

    entries = collect_files(tour_dir)
    total_bytes = sum(e["bytes"] for e in entries)
    version = package_version(tour_dir, entries)

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    manifest["version"] = version
    manifest["bytes"] = total_bytes
    manifest["fileCount"] = len(entries)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    files_path = os.path.join(tour_dir, "files.json")
    with open(files_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(
        f"{tour_id}: {len(entries)} files, {total_bytes} bytes, version={version}"
    )
    return manifest


def write_index(tour_ids: list[str]) -> None:
    index = []
    for tid in sorted(tour_ids):
        manifest_path = os.path.join(TOURS_DIR, tid, "manifest.json")
        with open(manifest_path, encoding="utf-8") as f:
            m = json.load(f)
        index.append(
            {
                "id": m["id"],
                "title": m["title"],
                "titleEn": m["titleEn"],
                "bytes": m["bytes"],
                "version": m["version"],
                "posterArt": m["posterArt"],
            }
        )
    index_path = os.path.join(TOURS_DIR, "index.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {index_path} ({len(index)} tours)")


def discover_tours() -> list[str]:
    if not os.path.isdir(TOURS_DIR):
        return []
    return sorted(
        d
        for d in os.listdir(TOURS_DIR)
        if os.path.isdir(os.path.join(TOURS_DIR, d))
        and os.path.isfile(os.path.join(TOURS_DIR, d, "manifest.json"))
    )


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--tour", help="single tour id")
    g.add_argument("--all", action="store_true", help="all tours with manifest.json")
    args = ap.parse_args()

    if args.all:
        tour_ids = discover_tours()
        if not tour_ids:
            sys.exit("no tours found")
    else:
        tour_ids = [args.tour]

    for tid in tour_ids:
        update_tour(tid)
    write_index(discover_tours())


if __name__ == "__main__":
    main()
