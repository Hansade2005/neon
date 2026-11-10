#!/usr/bin/env python3
"""Fetch commercially usable instrumental tracks (CC0 and plain CC-BY only) from Jamendo for the in-game radio.
Usage: JAMENDO_CLIENT_ID=... python3 fetch_jamendo.py   (the client SECRET is never needed or stored)"""
import json, os, re, subprocess, sys, urllib.parse, urllib.request, html
CID = os.environ['JAMENDO_CLIENT_ID']; OUT = '/home/user/neon/assets/music'; UA = {'User-Agent': 'NeonOverdrive-AssetFetch/0.1'}
OK = re.compile(r'^https?://creativecommons\.org/(licenses/by/[34]\.0/?|publicdomain/zero/1\.0/?)$')
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read()
STATIONS = [('synthwave', 'electronic synthwave'), ('house', 'house'), ('hiphop', 'hiphop'), ('funk', 'funk'), ('lounge', 'lounge'), ('rock', 'rock'), ('chill', 'chillout'), ('drive', 'electronic')]
picked, seen, credits = [], set(), []
for st, tag in STATIONS:
    got = 0
    for page in range(0, 6):
        q = urllib.parse.urlencode({'client_id': CID, 'format': 'json', 'limit': 50, 'offset': page * 50, 'audiodownload_allowed': 'true', 'order': 'popularity_total', 'tags': tag, 'vocalinstrumental': 'instrumental', 'durationbetween': '120_330', 'include': 'musicinfo'})
        d = json.loads(get('https://api.jamendo.com/v3.0/tracks/?' + q))
        for t in d.get('results', []):
            if t['id'] in seen or not OK.match(t.get('license_ccurl', '')): continue
            seen.add(t['id']); picked.append((st, t)); got += 1
            if got >= 2: break
        if got >= 2: break
print(len(picked), 'tracks selected')
for st, t in picked:
    f = f"{OUT}/{st}_{t['id']}.mp3"
    if not os.path.exists(f):
        raw = f + '.raw'; open(raw, 'wb').write(get(t['audiodownload']))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '2', '-ar', '44100', '-b:a', '96k', '-map_metadata', '-1', f], check=True); os.remove(raw)
    credits.append({'file': os.path.basename(f), 'station': st, 'title': html.unescape(t['name']), 'artist': html.unescape(t['artist_name']), 'license': t['license_ccurl'], 'url': t.get('shareurl') or f"https://www.jamendo.com/track/{t['id']}", 'duration': t['duration']})
    print('ok', st, t['name'], '|', t['artist_name'], '|', t['license_ccurl'][-12:])
json.dump(credits, open(OUT + '/tracks.json', 'w'), indent=1)
