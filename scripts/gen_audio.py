#!/usr/bin/env python3
"""Generate Chinese narration MP3s for each tour stop using edge-tts."""
import asyncio, json, re, sys, os
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SRC = os.path.join(ROOT, "js", "tour-data.js")
OUT = os.path.join(ROOT, "assets", "audio")
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-4%"   # slightly slower, guide-like pacing

def parse_stops():
    src = open(SRC, encoding="utf-8").read()
    stops = []
    for m in re.finditer(r'id:\s*"([^"]+)"', src):
        stops.append(m.group(1))
    texts = re.findall(r'text:\s*"([^"]+)"', src)
    assert len(stops) == len(texts), f"{len(stops)} ids vs {len(texts)} texts"
    return list(zip(stops, texts))

async def gen(stop_id, text, sem):
    async with sem:
        out = os.path.join(OUT, f"{stop_id}.mp3")
        for attempt in range(4):
            try:
                tts = edge_tts.Communicate(text, VOICE, rate=RATE)
                await tts.save(out)
                sz = os.path.getsize(out)
                if sz > 10000:
                    print(f"OK  {stop_id}  {sz//1024} KB")
                    return
                raise RuntimeError(f"too small: {sz}")
            except Exception as e:
                print(f"retry {stop_id} ({attempt+1}): {e}", file=sys.stderr)
                await asyncio.sleep(2 * (attempt + 1))
        print(f"FAIL {stop_id}", file=sys.stderr)

async def main():
    os.makedirs(OUT, exist_ok=True)
    sem = asyncio.Semaphore(3)
    stops = parse_stops()
    print(f"{len(stops)} stops")
    await asyncio.gather(*(gen(i, t, sem) for i, t in stops))

asyncio.run(main())
