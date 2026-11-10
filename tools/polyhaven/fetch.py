# Downloads a curated, CC0 subset of Poly Haven (polyhaven.com) for Neon Overdrive. Attribution: "Assets from Poly Haven (CC0)".
import json, os, sys, urllib.request, concurrent.futures as cf, re
UA = {'User-Agent': 'NeonOverdrive-AssetFetch/0.1'}
OUT = '/home/user/neon/assets/polyhaven'
def get(u):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r: return r.read()
        except Exception as e: err = e
    raise err
A = json.load(open('/tmp/ph_assets.json'))
def pick(typ, pred, n):
    c = [(v['download_count'], k) for k, v in A.items() if v['type'] == typ and pred(k, v)]
    return [k for _, k in sorted(c, reverse=True)[:n]]
text = lambda k, v: (k + ' ' + v['category'] + ' ' + ' '.join(v['tags'])).lower()
has = lambda *w: (lambda k, v: any(x in text(k, v) for x in w))
sel = {'textures': [], 'models': [], 'hdris': []}
for key, pred, n in [('asphalt', has('asphalt'), 5), ('concrete', has('concrete'), 6), ('brick', lambda k, v: 'brick' in text(k, v) and 'stone' not in v['category'].lower(), 6),
                     ('plaster', has('plaster', 'stucco', 'painted wall'), 4), ('tiles', has('tile'), 5), ('woodfloor', lambda k, v: 'wood' in v['category'].lower() and ('floor' in text(k, v) or 'plank' in text(k, v)), 5),
                     ('metal', lambda k, v: v['category'].startswith('Metal'), 5), ('paving', has('paving', 'cobble', 'pavement'), 4), ('grass', has('grass'), 3), ('ground', has('sand', 'gravel', 'dirt'), 3),
                     ('fabric', has('carpet', 'fabric', 'leather'), 3), ('marble', has('marble'), 3)]:
    for k in pick(1, pred, n):
        if k not in sel['textures']: sel['textures'].append(k)
cats = ['Furniture/Seating', 'Furniture/Tables', 'Furniture/Storage', 'Furniture/Beds', 'Lighting/Ceiling', 'Lighting/Street', 'Lighting/Wall', 'Lighting/Floor', 'Industrial & Infrastructure/Traffic', 'Architecture/', 'Nature/Trees',
        'Electronics & Appliances/Devices', 'Electronics & Appliances/Home', 'Electronics & Appliances/Audio', 'Electronics & Appliances/Computing', 'Weapons/', 'Leisure/Sports', 'Vehicles & Transport/Watercraft',
        'Food & Kitchen/Produce', 'Food & Kitchen/Drinks', 'Food & Kitchen/Tableware', 'Containers & Storage/Boxes', 'Containers & Storage/Cans', 'Decor & Art/Wall', 'Office & Stationery', 'Industrial & Infrastructure/Electrical', 'Industrial & Infrastructure/Utility', 'Nature/Plants/Shrubs', 'Apparel']
per = {'Furniture/Seating': 10, 'Furniture/Tables': 7, 'Furniture/Storage': 7, 'Furniture/Beds': 3, 'Lighting/Ceiling': 4, 'Lighting/Street': 3, 'Lighting/Wall': 2, 'Lighting/Floor': 2, 'Industrial & Infrastructure/Traffic': 6, 'Architecture/': 14, 'Nature/Trees': 8,
       'Electronics & Appliances/Devices': 6, 'Electronics & Appliances/Home': 5, 'Electronics & Appliances/Audio': 4, 'Electronics & Appliances/Computing': 2, 'Weapons/': 8, 'Leisure/Sports': 5, 'Vehicles & Transport/Watercraft': 3,
       'Food & Kitchen/Produce': 6, 'Food & Kitchen/Drinks': 3, 'Food & Kitchen/Tableware': 4, 'Containers & Storage/Boxes': 5, 'Containers & Storage/Cans': 5, 'Decor & Art/Wall': 4, 'Office & Stationery': 4,
       'Industrial & Infrastructure/Electrical': 3, 'Industrial & Infrastructure/Utility': 3, 'Nature/Plants/Shrubs': 4, 'Apparel': 4}
for c in cats:
    for k in pick(2, lambda k, v, c=c: v['category'].replace('Storage Furniture', 'Storage').startswith(c) or c in v['category'], per[c]):
        if k not in sel['models']: sel['models'].append(k)
for k in ['covered_car', 'old_tyre', 'CashRegister_01', 'ocean_buoy', 'lifebuoy']:
    if k in A and k not in sel['models']: sel['models'].append(k)
sel['hdris'] = pick(0, has('night', 'city', 'street', 'urban', 'skyline'), 7) + pick(0, has('sea', 'ocean', 'beach', 'harbour', 'harbor', 'sunset'), 3)
sel['hdris'] = list(dict.fromkeys(sel['hdris']))
json.dump(sel, open(OUT + '/selection.json', 'w'), indent=1)
print({k: len(v) for k, v in sel.items()})
def dl(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0: return
    os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'wb').write(get(url))
def job_texture(k):
    f = json.loads(get(f'https://api.polyhaven.com/files/{k}')); n = 0
    for m, dst in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough'), ('AO', 'ao')]:
        try: u = f[m]['1k']['jpg']['url']
        except KeyError: continue
        dl(u, f'{OUT}/textures/{k}/{dst}.jpg'); n += 1
    return k, n
def job_model(k):
    f = json.loads(get(f'https://api.polyhaven.com/files/{k}')); g = f['gltf']['1k']['gltf']
    dl(g['url'], f'{OUT}/models/{k}/{k}.gltf')
    for rel, inc in g.get('include', {}).items(): dl(inc['url'], f'{OUT}/models/{k}/{rel}')
    return k, len(g.get('include', {}))
def job_hdri(k):
    f = json.loads(get(f'https://api.polyhaven.com/files/{k}')); dl(f['hdri']['2k']['hdr']['url'], f'{OUT}/hdri/{k}_2k.hdr'); return k, 1
jobs = [(job_texture, k) for k in sel['textures']] + [(job_model, k) for k in sel['models']] + [(job_hdri, k) for k in sel['hdris']]
ok = 0
with cf.ThreadPoolExecutor(8) as ex:
    futs = {ex.submit(fn, k): k for fn, k in jobs}
    for fu in cf.as_completed(futs):
        try: fu.result(); ok += 1
        except Exception as e: print('FAIL', futs[fu], e)
print('done', ok, '/', len(jobs))
# attribution manifest
man = {k: {'name': A[k]['name'], 'authors': list(A[k]['authors'].keys()), 'url': f'https://polyhaven.com/a/{k}', 'license': 'CC0'} for t in sel.values() for k in t}
json.dump(man, open(OUT + '/CREDITS.json', 'w'), indent=1)
