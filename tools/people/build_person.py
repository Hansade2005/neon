"""Build one civilian (man or woman) with MPFB2 + MakeHuman system assets: real clothes, hair, skin.
blender --background --factory-startup --python build_person.py -- <person_id> <out.glb> [preview.png]
The GLB holds the skinned mesh + skeleton only; shared animations live in assets/models/anims.glb."""
import bpy, bmesh, sys, os, math, random
import numpy as np
from mathutils import Vector
sys.path.insert(0, '/home/user/pitchclash/tools/players'); sys.path.insert(0, '/home/user/neon/tools/models'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_character as BC
from build_character import HumanService, TargetService, LocationService, ExportService, find_file, prep_texture, principled, decimate, body_height, clean_scene
from variants import _FACE_PAIRS, _PAIRED, _HEADS
from cast import CAST
import bl

def make_human(v):
    male = v['gender'] >= 0.5
    macro = dict(gender=v['gender'], age=v.get('age', 0.5), muscle=v['muscle'], weight=v['weight'], proportions=v.get('proportions', 0.8), height=0.5, cupsize=0.5, firmness=0.5, race=v['race'])
    lo, hi = 0.0, 1.0
    for _ in range(9):
        macro['height'] = (lo + hi) / 2; bm = HumanService.create_human(macro_detail_dict=macro); h = body_height(bm); bpy.data.objects.remove(bm)
        if h < v['height']: lo = macro['height']
        else: hi = macro['height']
    macro['height'] = (lo + hi) / 2; bm = HumanService.create_human(macro_detail_dict=macro)
    root = LocationService.get_mpfb_data('targets')
    for t, w in v.get('targets', {}).items(): TargetService.load_target(bm, os.path.join(root, t + '.target.gz'), weight=w)
    return bm

def face_targets(seed):
    rng = random.Random(seed); t = {}
    t['head/' + rng.choice(_HEADS)] = round(rng.uniform(0.3, 0.85), 2)
    for grp, base, a, b in rng.sample(_FACE_PAIRS, 9): t[f'{grp}/{base}-{rng.choice([a, b])}'] = round(rng.uniform(0.25, 0.8), 2)
    for grp, base, a, b in rng.sample(_PAIRED, 6):
        opt, w = rng.choice([a, b]), round(rng.uniform(0.25, 0.7), 2)
        for side in ('l', 'r'): t[f'{grp}/{side}-{base}-{opt}'] = w
    return t

def add_asset(bm, sub, fn, typ):
    path = find_file(sub, fn)
    return HumanService.add_mhclo_asset(path, bm, asset_type=typ, subdiv_levels=0, material_type='GAMEENGINE'), os.path.dirname(path)

def tex_from(dirpath, suffix, name, size, fmt='JPEG', **kw):
    cand = [f for f in os.listdir(dirpath) if f.lower().endswith(suffix)]
    return prep_texture(os.path.join(dirpath, cand[0]), name, size, fmt, **kw) if cand else None

def build(pid):
    v = CAST[pid]; v = dict(v); v['targets'] = face_targets(hash(pid) % 100000)
    clean_scene(); bm = make_human(v)
    HumanService.add_builtin_rig(bm, 'game_engine'); arm = bm.parent
    objs = {}
    objs['Eyes'], _ = add_asset(bm, 'eyes', 'low-poly.mhclo', 'Eyes')
    objs['Eyebrows'], _ = add_asset(bm, 'eyebrows', v['eyebrows'] + '.mhclo', 'Eyebrows')
    hairdir = None
    if v.get('hair'): objs['Hair'], hairdir = add_asset(bm, 'hair', v['hair'] + '.mhclo', 'Hair')
    cl = {}
    for key, fn in (('outfit', v['outfit']), ('shoes', v['shoes']), ('hat', v.get('hat'))):
        if fn: cl[key], d = add_asset(bm, 'clothes', fn + '.mhclo', 'Clothes'); cl[key + '_dir'] = d
    ExportService.bake_modifiers_remove_helpers(bm, bake_masks=True, bake_subdiv=False, remove_helpers=True)
    allo = [bm] + list(objs.values()) + [cl[k] for k in ('outfit', 'shoes', 'hat') if k in cl]
    for o in allo:
        for m in list(o.modifiers):
            if m.type != 'ARMATURE': o.modifiers.remove(m)
        if o.data.shape_keys:
            bpy.context.view_layer.objects.active = o; o.shape_key_add(name='tmp', from_mix=True)
            for kb in list(o.data.shape_keys.key_blocks): o.shape_key_remove(kb)
    bm.name = 'Body'; arm.name = 'Armature'
    decimate(bm, v.get('body_tris', 9000))
    # materials
    sd = os.path.dirname(find_file('skins', v['skin'] + '.mhmat'))
    skin = principled('Skin', image=prep_texture(os.path.join(sd, [f for f in os.listdir(sd) if f.endswith('.png')][0]), f'skin_{pid}.jpg', 1024, 'JPEG', gain=v.get('skin_gain', 1.0)), rough=0.6)
    bm.data.materials.clear(); bm.data.materials.append(skin)
    def cloth_mat(o, d, name, size, tint=None):
        if v.get(name.lower() + '_color'): im = tex_from(d, '_diffuse.png', f'{name}_{pid}.png', size, 'PNG', tint=v[name.lower() + '_color'], gray_tint=True)
        else: im = tex_from(d, '_diffuse.png', f'{name}_{pid}.jpg', size, gain=tint or 1.0) or tex_from(d, '.png', f'{name}_{pid}.jpg', size)
        m = principled(name, image=im, rough=0.8); o.data.materials.clear(); o.data.materials.append(m); o.name = name
    cloth_mat(cl['outfit'], cl['outfit_dir'], 'Outfit', 1024, v.get('tint'))
    cloth_mat(cl['shoes'], cl['shoes_dir'], 'Shoes', 512)
    if 'hat' in cl: cloth_mat(cl['hat'], cl['hat_dir'], 'Hat', 512)
    if 'Hair' in objs:
        hsrc = [f for f in os.listdir(hairdir) if f.endswith('diffuse.png')][0]
        himg = prep_texture(os.path.join(hairdir, hsrc), f'hair_{pid}.png', 512, 'PNG', tint=v['hair_color'], gray_tint=True)
        o = objs['Hair']; o.data.materials.clear(); o.data.materials.append(principled('Hair', image=himg, rough=0.65, alpha=True)); o.name = 'Hair'
    for typ, sub, base in (('Eyes', 'eyes', v['eyes'] + '_eye.png'), ('Eyebrows', 'eyebrows', v['eyebrows'] + '.png')):
        im = prep_texture(find_file(sub, base), f'{typ}_{base}', 256, 'PNG'); o = objs[typ]; o.data.materials.clear(); o.data.materials.append(principled(typ, image=im, rough=0.3 if typ == 'Eyes' else 0.8, alpha=(typ == 'Eyebrows'))); o.name = typ
    for k, tris in (('outfit', 5200), ('shoes', 700), ('hat', 800)):
        if k in cl: decimate(cl[k], tris, head_bias=False)
    if 'Hair' in objs: decimate(objs['Hair'], v.get('hair_tris', 2200), head_bias=False)
    bpy.ops.object.select_all(action='DESELECT')
    parts = [bm] + list(objs.values()) + [cl[k] for k in ('outfit', 'shoes', 'hat') if k in cl]
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = bm; bpy.ops.object.join()
    bm.name = 'Person'; bm.data.name = 'Person'
    for g in list(bm.vertex_groups):
        if g.name not in arm.data.bones: bm.vertex_groups.remove(g)
    bpy.ops.object.shade_smooth()
    minz = min(vv.co.z for vv in bm.data.vertices)
    for vv in bm.data.vertices: vv.co.z -= minz
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones: eb.head.z -= minz; eb.tail.z -= minz
    bpy.ops.object.mode_set(mode='OBJECT')
    print('BUILT', pid, 'height', max(vv.co.z for vv in bm.data.vertices))
    return bm, arm

if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:]; pid, out = a[0], a[1]
    bm, arm = build(pid)
    if len(a) > 2:
        bl.studio((700, 900)); bl.shot(a[2], (0.9, -3.6, 1.35), (0, 0, 0.95), 55)
    bpy.ops.object.select_all(action='DESELECT'); bm.select_set(True); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_animations=False)
    print('EXPORTED', out)
