#!/usr/bin/env python3
"""Generate Chinese narration MP3s for each tour stop using edge-tts.

Reads tours/<id>/stops.json; voice/rate from tours/<id>/tour.config.json.
Writes tours/<id>/audio/<id>.mp3 and <id>-more.mp3 for stops with `more`.

Setup:
  pip install edge-tts    # and Node.js on PATH
  # Behind a TLS-intercepting proxy, append its CA to certifi's bundle first:
  #   cat /root/.ccr/ca-bundle.crt >> $(python3 -c "import certifi; print(certifi.where())")

Usage:
  python3 scripts/gen_audio.py --tour yellowstone
  python3 scripts/gen_audio.py --tour yellowstone intro madison
  python3 scripts/gen_audio.py --tour yellowstone grand-prismatic-more
"""
import argparse
import asyncio
import json
import os
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def tour_paths(tour_id):
    tour_dir = os.path.join(ROOT, "tours", tour_id)
    return (
        tour_dir,
        os.path.join(tour_dir, "stops.json"),
        os.path.join(tour_dir, "tour.config.json"),
        os.path.join(tour_dir, "audio"),
    )


def load_config(config_path):
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def parse_stops(stops_path):
    """Return list of (audio_id, text). Deep-dives get an id of '<id>-more'."""
    with open(stops_path, encoding="utf-8") as f:
        stops = json.load(f)
    items = []
    for s in stops:
        items.append((s["id"], s["text"]))
        if s.get("more"):
            items.append((s["id"] + "-more", s["more"]))
    return items


async def gen(sem, out_dir, voice, rate, audio_id, text):
    out = os.path.join(out_dir, f"{audio_id}.mp3")
    async with sem:
        for attempt in range(4):
            try:
                tts = edge_tts.Communicate(text, voice, rate=rate)
                await tts.save(out)
                if os.path.getsize(out) > 5000:
                    print(f"OK  {audio_id}  {os.path.getsize(out)//1024} KB  ({len(text)} chars)")
                    return
                raise RuntimeError("suspiciously small file")
            except Exception as e:
                print(f"retry {audio_id} ({attempt+1}): {e}", file=sys.stderr)
                await asyncio.sleep(2 * (attempt + 1))
    print(f"FAIL {audio_id}", file=sys.stderr)
    raise SystemExit(1)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tour", required=True, help="tour id")
    ap.add_argument("ids", nargs="*", help="optional stop/audio ids to regenerate")
    args = ap.parse_args()

    _tour_dir, stops_path, config_path, out_dir = tour_paths(args.tour)
    config = load_config(config_path)
    voice = os.environ.get("TTS_VOICE", config.get("voice", "zh-CN-YunjianNeural"))
    rate = os.environ.get("TTS_RATE", config.get("rate", "-4%"))

    os.makedirs(out_dir, exist_ok=True)
    stops = parse_stops(stops_path)
    only = set(args.ids)
    if only:
        stops = [s for s in stops if s[0] in only]
        missing = only - {s for s, _ in stops}
        if missing:
            sys.exit(f"unknown audio ids: {', '.join(sorted(missing))}")
    print(f"{len(stops)} clips, tour={args.tour}, voice={voice}, rate={rate}")
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(gen(sem, out_dir, voice, rate, aid, text) for aid, text in stops))
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
