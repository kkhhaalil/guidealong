#!/usr/bin/env python3
"""Generate Chinese narration MP3s for each tour stop using edge-tts.

Voice: zh-CN-YunjianNeural (male, warm/energetic) — chosen by ear over the
previous zh-CN-XiaoxiaoNeural and an ElevenLabs English premade voice whose
Mandarin carried a foreign accent.

Setup:
  pip install edge-tts
  # Behind a TLS-intercepting proxy, append its CA to certifi's bundle first:
  #   cat /root/.ccr/ca-bundle.crt >> $(python3 -c "import certifi; print(certifi.where())")

Usage:
  python3 scripts/gen_audio.py            # regenerate every stop
  python3 scripts/gen_audio.py id1 id2    # regenerate only the given stop ids
"""
import asyncio
import os
import re
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "js", "tour-data.js")
OUT = os.path.join(ROOT, "assets", "audio")

VOICE = os.environ.get("TTS_VOICE", "zh-CN-YunjianNeural")
RATE = os.environ.get("TTS_RATE", "-4%")
CONCURRENCY = 4


def parse_stops():
    src = open(SRC, encoding="utf-8").read()
    stops = [m.group(1) for m in re.finditer(r'id:\s*"([^"]+)"', src)]
    texts = re.findall(r'text:\s*"([^"]+)"', src)
    assert len(stops) == len(texts), f"{len(stops)} ids vs {len(texts)} texts"
    return list(zip(stops, texts))


async def gen(sem, stop_id, text):
    out = os.path.join(OUT, f"{stop_id}.mp3")
    async with sem:
        for attempt in range(4):
            try:
                tts = edge_tts.Communicate(text, VOICE, rate=RATE)
                await tts.save(out)
                if os.path.getsize(out) > 5000:
                    print(f"OK  {stop_id}  {os.path.getsize(out)//1024} KB  ({len(text)} chars)")
                    return
                raise RuntimeError("suspiciously small file")
            except Exception as e:
                print(f"retry {stop_id} ({attempt+1}): {e}", file=sys.stderr)
                await asyncio.sleep(2 * (attempt + 1))
    print(f"FAIL {stop_id}", file=sys.stderr)
    raise SystemExit(1)


async def main():
    os.makedirs(OUT, exist_ok=True)
    stops = parse_stops()
    only = set(sys.argv[1:])
    if only:
        stops = [s for s in stops if s[0] in only]
        missing = only - {s for s, _ in stops}
        if missing:
            sys.exit(f"unknown stop ids: {', '.join(sorted(missing))}")
    print(f"{len(stops)} stops, voice={VOICE}, rate={RATE}")
    sem = asyncio.Semaphore(CONCURRENCY)
    await asyncio.gather(*(gen(sem, sid, text) for sid, text in stops))
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
