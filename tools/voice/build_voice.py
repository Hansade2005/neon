#!/usr/bin/env python3
"""Render game voice lines with Kokoro (hosted endpoint, same as Pitch Clash commentary) into small mono MP3s + manifest.json."""
import json, os, subprocess, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
BASE = "https://tts.voice-generator.com"
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
lines = json.load(open(os.path.join(os.path.dirname(__file__), sys.argv[2] if len(sys.argv) > 2 else "lines.json")))
def fetch(text, out, voice, speed=1.0):
    if os.path.exists(out) and os.path.getsize(out) > 500: return True
    q = urllib.parse.urlencode({"text": text, "voice": voice, "lang": voice[0], "format": "wav", "speed": str(speed)})
    last = None
    for i in range(4):
        try:
            with urllib.request.urlopen(f"{BASE}/tts?{q}", timeout=120) as r: ct, data = r.headers.get("content-type", ""), r.read()
            if ct.startswith("audio/"):
                tmp = out + ".wav"; open(tmp, "wb").write(data)
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5", "-ac", "1", "-ar", "24000", "-b:a", "48k", out], check=True); os.remove(tmp); return True
            last = data[:200]
        except Exception as e: last = e
        time.sleep(2 * (i + 1))
    print("FAILED", text, last, file=sys.stderr); return False
jobs, man = [], {}
for cat, d in lines.items():
    man[cat] = []
    for i, t in enumerate(d["lines"]): f = f"{cat}_{i}.mp3"; man[cat].append({"file": f, "text": t}); jobs.append((t, os.path.join(OUT, f), d["voice"], 1.12 if cat == "police" else 1.0))
print(len(jobs), "clips")
with ThreadPoolExecutor(4) as ex: res = list(ex.map(lambda j: fetch(*j), jobs))
print("ok", sum(res), "failed", len(res) - sum(res)); json.dump(man, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
