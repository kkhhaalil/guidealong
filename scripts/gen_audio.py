#!/usr/bin/env python3
"""Generate Chinese narration MP3s for each tour stop using edge-tts.

Voice: zh-CN-YunjianNeural (male, warm/energetic).

For every stop this writes assets/audio/<id>.mp3 from `text`. Stops that also
carry a `more` field (layered "了解更多" deep-dive) additionally get
assets/audio/<id>-more.mp3.

Stops are read by evaluating js/tour-data.js with Node (after the STOP_EXTRAS
merge runs), so the data stays the single source of truth — no brittle regex.

Setup:
  pip install edge-tts    # and Node.js on PATH
  # Behind a TLS-intercepting proxy, append its CA to certifi's bundle first:
  #   cat /root/.ccr/ca-bundle.crt >> $(python3 -c "import certifi; print(certifi.where())")

Usage:
  python3 scripts/gen_audio.py                 # regenerate everything
  python3 scripts/gen_audio.py intro madison   # only these stop ids
  python3 scripts/gen_audio.py grand-prismatic-more   # a specific -more clip
"""
import asyncio
import json
import os
import subprocess
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "js", "tour-data.js")
OUT = os.path.join(ROOT, "assets", "audio")

VOICE = os.environ.get("TTS_VOICE", "zh-CN-YunjianNeural")
RATE = os.environ.get("TTS_RATE", "-4%")
CONCURRENCY = 4


def parse_stops():
    """Return list of (audio_id, text). Deep-dives get an id of '<id>-more'."""
    node = (
        "const fs=require('fs');"
        "eval(fs.readFileSync(%r,'utf8')+';globalThis.__S=TOUR_STOPS');"
        "process.stdout.write(JSON.stringify(globalThis.__S.map("
        "s=>({id:s.id,text:s.text,more:s.more||null}))));" % SRC
    )
    raw = subprocess.check_output(["node", "-e", node]).decode("utf-8")
    items = []
    for s in json.loads(raw):
        items.append((s["id"], s["text"]))
        if s.get("more"):
            items.append((s["id"] + "-more", s["more"]))
    return items


async def gen(sem, audio_id, text):
    out = os.path.join(OUT, f"{audio_id}.mp3")
    async with sem:
        for attempt in range(4):
            try:
                tts = edge_tts.Communicate(text, VOICE, rate=RATE)
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
    os.makedirs(OUT, exist_ok=True)
    stops = parse_stops()
    only = set(sys.argv[1:])
    if only:
        stops = [s for s in stops if s[0] in only]
        missing = only - {s for s, _ in stops}
        if missing:
            sys.exit(f"unknown audio ids: {', '.join(sorted(missing))}")
    print(f"{len(stops)} clips, voice={VOICE}, rate={RATE}")
    sem = asyncio.Semaphore(CONCURRENCY)
    await asyncio.gather(*(gen(sem, aid, text) for aid, text in stops))
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
