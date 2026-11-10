# Retarget Mixamo FBX clips onto an MPFB 'game_engine' rig.  blender -b char.blend --python retarget_mixamo.py -- out.glb [preview_prefix]
import bpy, sys, os, math, glob
from mathutils import Matrix, Vector, Quaternion
sys.path.insert(0, '/home/user/neon/tools/models'); from bl import *
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[0]; PREV = argv[1] if len(argv) > 1 else None
CLIPS = {'Idle': 'Idle', 'Walking': 'Walk', 'Running': 'Run', 'Driving': 'Drive', 'Talking': 'Talk', 'Sitting Talking': 'SitTalk', 'Talking On Phone': 'Phone', 'Body Block': 'Block', 'Dying': 'Die', 'Entering Car': 'EnterCar', 'Firing Rifle': 'RifleFire', 'Hit Reaction': 'Hit', 'Mma Kick': 'Kick', 'Open Door Outwards': 'OpenDoor', 'Pistol Idle': 'PistolIdle', 'Punching': 'Punch', 'Punching 1': 'Punch2', 'Pistol Aim': 'PistolAim', 'Pistol Run': 'PistolRun', 'Rifle Idle': 'RifleIdle', 'Rifle Run': 'RifleRun', 'Wave Hip Hop Dance': 'Dance1', 'Booty Hip Hop Dance': 'Dance2', 'Jump': 'Jump', 'Jumping Down': 'JumpDown', 'Shoot Rifle': 'RifleShoot'}
extra = glob.glob('/home/user/neon/assets/mixamo/*.fbx')
MAP = {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'head': 'Head'}
for s, t in (('Left', 'l'), ('Right', 'r')):
    MAP.update({f'clavicle_{t}': f'{s}Shoulder', f'upperarm_{t}': f'{s}Arm', f'lowerarm_{t}': f'{s}ForeArm', f'hand_{t}': f'{s}Hand', f'thigh_{t}': f'{s}UpLeg', f'calf_{t}': f'{s}Leg', f'foot_{t}': f'{s}Foot', f'ball_{t}': f'{s}ToeBase'})
    for fn in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        for i in (1, 2, 3): MAP[f'{fn}_0{i}_{t}'] = f'{s}Hand{fn.capitalize()}{i}'
tgt = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = [o for o in bpy.data.objects if o.type == 'MESH']
def order(arm):
    out = []
    def walk(b): out.append(b.name); [walk(c) for c in b.children]
    [walk(b) for b in arm.data.bones if b.parent is None]; return out
TORD = order(tgt)
def rest_rot(obj, bone): return (obj.matrix_world @ bone.matrix_local).to_3x3().normalized()
def rest_dir(obj, bone): return (obj.matrix_world.to_3x3() @ (bone.tail_local - bone.head_local)).normalized()
tgt.animation_data_create(); acts = []
for path in sorted(extra):
    nm = os.path.splitext(os.path.basename(path))[0]
    if nm not in CLIPS: continue
    before = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]; src = next(o for o in new if o.type == 'ARMATURE')
    for o in list(new):
        if o.type == 'MESH': bpy.data.objects.remove(o)
    act = src.animation_data.action; f0, f1 = [int(x) for x in act.frame_range]
    sb = {b.name.split(':')[-1]: b for b in src.data.bones}
    # per-bone correction: target rest -> source rest direction
    corr = {}
    for t, s in MAP.items():
        if t not in tgt.data.bones or s not in sb: continue
        tb = tgt.data.bones[t]; Rt = rest_rot(tgt, tb); Rs = rest_rot(src, sb[s]); dt, ds = rest_dir(tgt, tb), rest_dir(src, sb[s])
        corr[t] = (s, Rs.inverted(), dt.rotation_difference(ds).to_matrix() @ Rt)
    hips_s = sb['Hips']; hs_rest = (src.matrix_world @ hips_s.head_local); hs_h = max(0.2, hs_rest.z)
    th = tgt.data.bones['pelvis']; tg_rest = (tgt.matrix_world @ th.head_local); sc = tg_rest.z / hs_h
    # sample the source
    frames = list(range(f0, f1 + 1)); hp = []
    ta = bpy.data.actions.new(CLIPS[nm]); tgt.animation_data.action = ta
    for pb in tgt.pose.bones: pb.rotation_mode = 'QUATERNION'
    drift = None
    for fi, f in enumerate(frames):
        bpy.context.scene.frame_set(f)
        hp.append(src.matrix_world @ src.pose.bones['mixamorig:Hips'].head)
    d0, d1 = hp[0], hp[-1]
    for fi, f in enumerate(frames):
        bpy.context.scene.frame_set(f); tt = fi / max(1, len(frames) - 1)
        for tname in TORD:
            if tname not in corr: continue
            s, Rsi, Tm = corr[tname]; spb = src.pose.bones['mixamorig:' + s]
            Rs_f = (src.matrix_world @ spb.matrix).to_3x3().normalized(); R = Rs_f @ Rsi @ Tm
            pb = tgt.pose.bones[tname]; M = R.to_4x4()
            if tname == 'pelvis':
                p = hp[fi] - (d0 + (d1 - d0) * tt)      # remove the forward drift, keep sway and bob
                M.translation = tg_rest + Vector((p.x, p.y, 0)) * sc + Vector((0, 0, (hp[fi].z - hs_rest.z) * sc))
            else: M.translation = (tgt.matrix_world.inverted() @ pb.matrix.translation) if False else pb.matrix.translation
            pb.matrix = tgt.matrix_world.inverted() @ M
            bpy.context.view_layer.update()
            pb.keyframe_insert('rotation_quaternion', frame=fi + 1)
            if tname == 'pelvis': pb.keyframe_insert('location', frame=fi + 1)
    ta.use_fake_user = True; acts.append(ta); print('CLIP', CLIPS[nm], len(frames), 'frames')
    for o in list(bpy.data.objects):
        if o.type == 'ARMATURE' and o is not tgt: bpy.data.objects.remove(o)
# optional preview of the first frames
if PREV:
    studio((900, 700))
    for ta in acts:
        tgt.animation_data.action = ta; bpy.context.scene.frame_set(int(ta.frame_range[0] + (ta.frame_range[1] - ta.frame_range[0]) * 0.3))
        a = math.radians(30); shot(f'{PREV}_{ta.name}.png', (math.sin(a) * 4.2, -math.cos(a) * 4.2, 1.5), (0, 0, 0.95), 40)
# write NLA tracks and export
tgt.animation_data.action = None
for ta in acts:
    tr = tgt.animation_data.nla_tracks.new(); tr.name = ta.name; st = tr.strips.new(ta.name, 1, ta); st.name = ta.name
ANIMS_ONLY = os.environ.get('ANIMS_ONLY') == '1'
bpy.ops.object.select_all(action='DESELECT'); [o.select_set(True) for o in ([tgt] if ANIMS_ONLY else [tgt] + body)]
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True)
print('EXPORTED', OUT, [a.name for a in acts])
