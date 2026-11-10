# Motorbike (viper) and bicycle (cruiser) models.  blender -b --python bike_gen.py -- <viper|cruiser> <out.glb> [preview.png ...]
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from bl import *
import car_gen

def link(child, parent):
    bpy.context.view_layer.update(); child.parent = parent; child.matrix_parent_inverse = parent.matrix_world.inverted()

def tube(name, a, b, r, m, seg=10):
    a, b = Vector(a), Vector(b); d = b - a; c = cyl(name, r, d.length, tuple((a + b) / 2), 'Z', m, seg)
    c.rotation_mode = 'QUATERNION'; c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized()); return c

def blob(name, size, loc, m, subdiv=2):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=0.5)
    for v in bm.verts: v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    ob = obj_from_bm(name, bm, [m], True); ob.location = loc; return ob

def spoked_wheel(name, R, w, y, z, rim_col, tire_w):
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root); root.location = (0, y, z)
    tire = mat('Tire', (0.012, 0.012, 0.013, 1), 0, 0.85); rim = mat('Rim', rim_col, 1.0, 0.2)
    bm = bmesh.new(); prof = [(R - 0.07, -tire_w / 2), (R - 0.02, -tire_w * 0.45), (R, -tire_w * 0.2), (R, tire_w * 0.2), (R - 0.02, tire_w * 0.45), (R - 0.07, tire_w / 2)]; seg = 48; rows = []
    for a in range(seg):
        t = a / seg * 2 * math.pi; rows.append([bm.verts.new((x, math.sin(t) * r, math.cos(t) * r)) for (r, x) in prof])
    for a in range(seg):
        for k in range(len(prof) - 1): bm.faces.new((rows[a][k], rows[a][k + 1], rows[(a + 1) % seg][k + 1], rows[(a + 1) % seg][k]))
    t = obj_from_bm('tire', bm, [tire], True); t.location = (0, y, z); link(t, root)
    if tire_w >= 0.1:   # motorbike: cast alloy wheel
        ring = cyl('rim', R - 0.075, tire_w * 0.7, (0, y, z), 'X', rim, 40, r2=R - 0.075); link(ring, root)
        inner = cyl('rimhole', R - 0.095, tire_w * 0.8, (0, y, z), 'X', mat('RimDark', (0.03, 0.03, 0.035, 1), 0.5, 0.5), 40); link(inner, root)
    else:               # bicycle: thin rim ring + spokes
        bm2 = bmesh.new(); pr = [(R - 0.088, -0.012), (R - 0.068, -0.012), (R - 0.068, 0.012), (R - 0.088, 0.012), (R - 0.088, -0.012)]; rows = []
        for a in range(40):
            tt = a / 40 * 2 * math.pi; rows.append([bm2.verts.new((x, math.sin(tt) * r, math.cos(tt) * r)) for (r, x) in pr])
        for a in range(40):
            for k in range(len(pr) - 1): bm2.faces.new((rows[a][k], rows[a][k + 1], rows[(a + 1) % 40][k + 1], rows[(a + 1) % 40][k]))
        rg = obj_from_bm('rimring', bm2, [rim], True); rg.location = (0, y, z); link(rg, root)
    n = 20 if tire_w < 0.1 else 10
    for k in range(n):
        a = k / n * 2 * math.pi; sp = box('spoke', (0.01, 0.012, R - 0.1), (0, y + math.sin(a) * (R - 0.1) / 2, z + math.cos(a) * (R - 0.1) / 2), rim if tire_w < 0.1 else rim); sp.rotation_euler = (-a, 0, 0); link(sp, root)
    hub = cyl('hub', 0.045, tire_w * 0.8, (0, y, z), 'X', rim, 16); link(hub, root); return root

def motorbike():
    paint = mat('Paint', (0.9, 0.05, 0.08, 1), 0.5, 0.28, clearcoat=1.0); black = mat('Black', (0.015, 0.015, 0.017, 1), 0.3, 0.5); chrome = mat('Chrome', (0.85, 0.86, 0.9, 1), 1, 0.1)
    metal = mat('Engine', (0.18, 0.19, 0.2, 1), 0.9, 0.35); seat = mat('Seat', (0.03, 0.03, 0.035, 1), 0, 0.7); glass = mat('Glass', (0.02, 0.03, 0.04, 1), 0.2, 0.05, clearcoat=1)
    head = mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6); tail = mat('Taillight', (0.5, 0, 0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=2.5)
    R = 0.32; wb = 0.72
    blob('tank', (0.36, 0.7, 0.3), (0, -0.2, 0.9), paint); blob('tail', (0.3, 0.62, 0.2), (0, 0.78, 0.86), paint); box('seat', (0.28, 0.62, 0.1), (0, 0.32, 0.86), seat, 0.04)
    box('engine', (0.3, 0.55, 0.38), (0, 0.12, 0.45), metal, 0.03); box('radiator', (0.26, 0.08, 0.3), (0, -0.38, 0.5), black, 0.02)
    for sx in (1, -1): tube('swing', (sx * 0.13, 0.2, 0.36), (sx * 0.12, wb, R), 0.025, metal); tube('exh', (sx * 0.17, -0.05, 0.28), (sx * 0.2, 1.0, 0.4), 0.04, chrome)
    tube('frame', (0, -0.45, 0.98), (0, 0.4, 0.8), 0.03, metal)
    box('rfender', (0.22, 0.4, 0.04), (0, wb + 0.05, 0.62), paint, 0.015); box('plate', (0.18, 0.01, 0.12), (0, 1.0, 0.62), mat('Plate', (0.92, 0.92, 0.88, 1), 0, 0.5)); box('tail_l', (0.14, 0.02, 0.06), (0, 1.07, 0.78), tail, 0.01)
    fork = bpy.data.objects.new('fork', None); bpy.context.collection.objects.link(fork); fork.location = (0, -0.5, 1.0)
    parts = []
    for sx in (1, -1): parts += [tube('leg', (sx * 0.11, -0.5, 0.98), (sx * 0.1, -wb, R), 0.03, chrome)]
    parts += [box('bar', (0.74, 0.04, 0.04), (0, -0.5, 1.12), black, 0.01), box('fairing', (0.34, 0.3, 0.36), (0, -0.66, 1.0), paint, 0.08), box('screen', (0.3, 0.02, 0.16), (0, -0.66, 1.2), glass, 0.008), box('lamp', (0.22, 0.05, 0.12), (0, -0.82, 0.98), head, 0.03)]
    for sx in (1, -1): parts += [box('grip', (0.16, 0.05, 0.05), (sx * 0.38, -0.5, 1.12), black, 0.015), tube('mstem', (sx * 0.34, -0.5, 1.12), (sx * 0.4, -0.5, 1.27), 0.012, chrome), box('mirror', (0.1, 0.02, 0.06), (sx * 0.4, -0.5, 1.3), black, 0.01)]
    fw = spoked_wheel('wheel_FR', R, 0.2, -wb, R, (0.8, 0.82, 0.86, 1), 0.17); parts.append(fw)
    for o in parts: link(o, fork)
    spoked_wheel('wheel_RR', R, 0.26, wb, R, (0.8, 0.82, 0.86, 1), 0.24)
    return dict(seat=(0, 0.32, 0.9))

def bicycle():
    paint = mat('Paint', (0.1, 0.45, 0.9, 1), 0.4, 0.35, clearcoat=0.6); black = mat('Black', (0.02, 0.02, 0.025, 1), 0.3, 0.6); chrome = mat('Chrome', (0.85, 0.86, 0.9, 1), 1, 0.15)
    R = 0.34; wb = 0.55
    for a, b in [((0, -0.35, 0.95), (0, 0.15, 0.95)), ((0, -0.38, 0.95), (0, 0.08, 0.42)), ((0, 0.12, 1.02), (0, 0.08, 0.42)), ((0.04, 0.08, 0.42), (0.04, wb, R)), ((-0.04, 0.08, 0.42), (-0.04, wb, R)), ((0.04, 0.12, 0.98), (0.04, wb, R)), ((-0.04, 0.12, 0.98), (-0.04, wb, R))]:
        tube('tube', a, b, 0.018, paint)
    box('seat', (0.14, 0.26, 0.05), (0, 0.16, 1.07), black, 0.02); tube('post', (0, 0.12, 0.95), (0, 0.14, 1.04), 0.014, chrome)
    tube('crank', (0.12, 0.08, 0.42), (-0.12, 0.08, 0.42), 0.014, chrome)
    for sx in (1, -1): box('pedal', (0.1, 0.1, 0.02), (sx * 0.16, 0.08, 0.42 + sx * 0.05), black, 0.004); tube('arm', (sx * 0.12, 0.08, 0.42), (sx * 0.12, 0.08, 0.42 + sx * 0.17), 0.012, chrome)
    ring = cyl('chainring', 0.09, 0.01, (0.08, 0.08, 0.42), 'X', chrome, 24)
    fork = bpy.data.objects.new('fork', None); bpy.context.collection.objects.link(fork); fork.location = (0, -0.38, 0.95); parts = []
    for sx in (1, -1): parts.append(tube('leg', (sx * 0.05, -0.4, 0.92), (sx * 0.05, -wb, R), 0.014, paint))
    parts += [tube('stem', (0, -0.38, 0.95), (0, -0.4, 1.08), 0.014, chrome), tube('bar', (-0.28, -0.4, 1.08), (0.28, -0.4, 1.08), 0.013, chrome), box('lamp', (0.06, 0.04, 0.05), (0, -0.46, 1.0), mat('Headlight'), 0.01)]
    parts.append(spoked_wheel('wheel_FR', R, 0.04, -wb, R, (0.75, 0.77, 0.8, 1), 0.045))
    for o in parts: link(o, fork)
    spoked_wheel('wheel_RR', R, 0.04, wb, R, (0.75, 0.77, 0.8, 1), 0.045)
    return dict(seat=(0, 0.16, 1.05))

if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:]; kind, out = a[0], a[1]; prev = a[2:]
    reset(); info = motorbike() if kind == 'viper' else bicycle()
    if prev:
        studio((900, 560))
        for i, ang in enumerate((60, 150)):
            if i >= len(prev): break
            r = math.radians(ang); shot(prev[i], (math.sin(r) * 4.2, -math.cos(r) * 4.2, 1.5), (0, 0, 0.55), 45)
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type in ('MESH', 'EMPTY'): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
    print('EXPORTED', out)
