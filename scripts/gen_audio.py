#!/usr/bin/env python3
"""Generate Chinese narration MP3s for each tour stop using ElevenLabs TTS.

State-of-the-art neural TTS (model eleven_multilingual_v2) for higher-quality,
more natural Mandarin than the previous edge-tts pipeline.

Setup:
  pip install requests
  export ELEVENLABS_API_KEY=sk_...        # required; never commit the key
  # optional overrides:
  export ELEVENLABS_VOICE_ID=<voice_id>   # default: a premade multilingual voice
  export ELEVENLABS_MODEL_ID=eleven_multilingual_v2

Notes:
  - Free-tier keys can only use ElevenLabs' *premade* voices via the API
    (library / cloned voices return HTTP 402). The default below is a premade
    voice. If you upgrade the plan, set ELEVENLABS_VOICE_ID to a native
    Mandarin voice for an even more natural result.
  - Free tier is capped at 10,000 characters / month; the full script is
    ~7k characters, so a single regeneration pass fits within the quota.
  - Behind a TLS-intercepting proxy, set TILE_CA_BUNDLE=/path/to/ca-bundle.crt.
"""
import os
import re
import sys
import time

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "js", "tour-data.js")
OUT = os.path.join(ROOT, "assets", "audio")

API_KEY = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")  # premade "Sarah"
MODEL_ID = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
OUTPUT_FORMAT = os.environ.get("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")
CA_BUNDLE = os.environ.get("TILE_CA_BUNDLE")  # optional CA override for proxies

VOICE_SETTINGS = {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.0,
    "use_speaker_boost": True,
}


def parse_stops():
    src = open(SRC, encoding="utf-8").read()
    stops = [m.group(1) for m in re.finditer(r'id:\s*"([^"]+)"', src)]
    texts = re.findall(r'text:\s*"([^"]+)"', src)
    assert len(stops) == len(texts), f"{len(stops)} ids vs {len(texts)} texts"
    return list(zip(stops, texts))


def gen(session, stop_id, text):
    out = os.path.join(OUT, f"{stop_id}.mp3")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": VOICE_SETTINGS,
    }
    params = {"output_format": OUTPUT_FORMAT}
    for attempt in range(4):
        try:
            r = session.post(url, params=params, json=payload, timeout=120,
                             verify=CA_BUNDLE or True)
            if r.status_code == 200 and len(r.content) > 5000:
                with open(out, "wb") as f:
                    f.write(r.content)
                print(f"OK  {stop_id}  {len(r.content)//1024} KB  ({len(text)} chars)")
                return len(text)
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"retry {stop_id} ({attempt+1}): {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    print(f"FAIL {stop_id}", file=sys.stderr)
    return 0


def main():
    if not API_KEY:
        sys.exit("ELEVENLABS_API_KEY is not set")
    os.makedirs(OUT, exist_ok=True)
    stops = parse_stops()
    total_chars = sum(len(t) for _, t in stops)
    print(f"{len(stops)} stops, {total_chars} characters, voice={VOICE_ID}, model={MODEL_ID}")

    session = requests.Session()
    session.headers.update({"xi-api-key": API_KEY, "Content-Type": "application/json"})

    spent = 0
    # Sequential (not concurrent) to stay friendly to the free-tier rate limits.
    for stop_id, text in stops:
        spent += gen(session, stop_id, text)
    print(f"done; ~{spent} characters generated")


if __name__ == "__main__":
    main()
