# CC0 textures from ambientCG (ambientcg.com).
import json, urllib.request, urllib.parse, zipfile, io, os
UA = {'User-Agent': 'NeonOverdrive-AssetFetch/0.1'}
OUT = '/home/user/neon/assets/ambientcg'; os.makedirs(OUT, exist_ok=True)
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90).read()
terms = [('facade', 6), ('windows', 3), ('metal plates', 3), ('asphalt', 3), ('road', 3), ('pavement', 3), ('paving stones', 3), ('concrete', 3), ('bricks', 3), ('plaster', 2), ('tiles', 3), ('marble', 2), ('carpet', 2), ('wood floor', 2), ('corrugated', 2), ('glass', 2), ('wallpaper', 2)]
seen = {}; credits = {}
for q, n in terms:
    d = json.loads(get('https://ambientcg.com/api/v2/full_json?type=Material&sort=Popular&limit=%d&include=downloadData&q=%s' % (n + 2, urllib.parse.quote(q))))
    for a in d['foundAssets'][:n]:
        aid = a['assetId']
        if aid in seen: continue
        try:
            dl = a['downloadFolders']['default']['downloadFiletypeCategories']['zip']['downloads']
            url = next(x['fullDownloadPath'] for x in dl if x['attribute'] == '1K-JPG')
            z = zipfile.ZipFile(io.BytesIO(get(url))); os.makedirs(f'{OUT}/{aid}', exist_ok=True)
            for nme in z.namelist():
                low = nme.lower()
                for tag, dst in (('_color', 'diff'), ('_normalgl', 'nor'), ('_roughness', 'rough'), ('_ambientocclusion', 'ao'), ('_emission', 'emi')):
                    if low.endswith(tag + '.jpg'): open(f'{OUT}/{aid}/{dst}.jpg', 'wb').write(z.read(nme))
            seen[aid] = q; credits[aid] = {'name': a.get('displayName', aid), 'url': f'https://ambientcg.com/a/{aid}', 'license': 'CC0'}
            print('ok', q, aid)
        except Exception as e: print('fail', q, aid, e)
json.dump({'terms': seen, 'credits': credits}, open(OUT + '/CREDITS.json', 'w'), indent=1)
