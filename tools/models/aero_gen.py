# Light plane ("skylark"), helicopter ("hornet") and speedboat ("marlin") for Neon Overdrive.
# blender -b --python aero_gen.py -- <skylark|hornet|marlin> <out.glb> [preview.png ...]
import sys, math, os
sys.path.insert(0, os.path.dirname(__file__))
from bl import *
import car_gen

def ring(w, zb, zt, n=14):
    # superellipse cross-section: returns [(x, z)] going around
    pts = []
    for k in range(n):
        a = k / n * 2 * math.pi; c, s = math.cos(a), math.sin(a)
        e = 0.62
        x = w * (abs(c) ** e) * (1 if c >= 0 else -1); z = (zb + zt) / 2 + (zt - zb) / 2 * (abs(s) ** e) * (1 if s >= 0 else -1); pts.append((x, z))
    return pts

def loft(name, stations, materials, subsurf=1):
    # stations: [(y, halfwidth, zbottom, ztop)] -> closed lofted body along Y
    bm = bmesh.new(); rows = []
    for (y, w, zb, zt) in stations: rows.append([bm.verts.new((x, y, z)) for (x, z) in ring(w, zb, zt)])
    n = len(rows[0])
    for i in range(len(rows) - 1):
        for k in range(n): bm.faces.new((rows[i][k], rows[i][(k + 1) % n], rows[i + 1][(k + 1) % n], rows[i + 1][k]))
    bm.faces.new(rows[0][::-1]); bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = obj_from_bm(name, bm, materials, True)
    if subsurf: add_modifier(ob, 'SUBSURF', levels=1, render_levels=2); apply_mods(ob)
    return ob

def skylark():
    S = dict(wr=0.28, ww=0.16)
    paint = mat('Paint', (0.9, 0.9, 0.92, 1), 0.3, 0.3, clearcoat=1.0); red = mat('Accent', (0.8, 0.04, 0.08, 1), 0.3, 0.35, clearcoat=0.8); black = mat('Black', (0.015, 0.015, 0.017, 1), 0.2, 0.5)
    glass = mat('Glass', (0.01, 0.015, 0.02, 1), 0.2, 0.03, clearcoat=1.0); metal = mat('Chrome', (0.8, 0.82, 0.86, 1), 1.0, 0.2)
    out = []
    out.append(loft('fuselage', [(-4.2, 0.04, 1.0, 1.2), (-3.9, 0.4, 0.75, 1.6), (-2.6, 0.72, 0.6, 1.95), (-0.6, 0.78, 0.55, 2.0), (1.4, 0.6, 0.8, 1.9), (3.2, 0.25, 1.15, 1.7), (4.2, 0.07, 1.3, 1.55)], [paint]))
    out.append(box('wing', (11.0, 1.4, 0.12), (0, -0.5, 1.95), paint, 0.04)); out.append(box('wingstripe', (11.02, 0.3, 0.125), (0, -1.0, 1.95), red, 0.01))
    out.append(box('hstab', (3.8, 0.9, 0.09), (0, 3.7, 1.55), paint, 0.03)); out.append(box('fin', (0.1, 1.3, 1.3), (0, 3.7, 2.1), red, 0.03))
    out.append(box('canopy', (1.25, 1.9, 0.75), (0, -0.9, 2.05), glass, 0.12))
    for sx in (1, -1):
        out.append(box('strut', (0.07, 0.5, 1.15), (sx * 1.8, -0.6, 1.35), black, 0.01, rot=(0, math.radians(sx * 25), 0)))
        out.append(box('gearleg', (0.08, 0.1, 0.8), (sx * 1.1, 0.2, 0.62), black, 0.01, rot=(0, math.radians(sx * 22), 0)))
        out.append(box('navlight', (0.12, 0.12, 0.12), (sx * 5.45, -0.5, 1.95), mat('Nav' + str(sx), (1, 0.1, 0.1, 1) if sx > 0 else (0.1, 1, 0.2, 1), 0, 0.3, emit=(1, 0.1, 0.1, 1) if sx > 0 else (0.1, 1, 0.2, 1), emit_strength=6)))
    out.append(box('noseleg', (0.08, 0.08, 0.7), (0, -3.0, 0.65), black, 0.01))
    out.append(box('taillight', (0.2, 0.08, 0.14), (0, 4.15, 1.95), mat('Taillight', (0.5, 0, 0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=3), 0.02))
    out.append(box('headlight', (0.3, 0.1, 0.14), (0, -4.0, 1.15), mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6), 0.03))
    # propeller node (spins about Y in blender = Z in three)
    prop = bpy.data.objects.new('prop', None); bpy.context.collection.objects.link(prop); prop.location = (0, -4.25, 1.1); out.append(prop)
    for rot in (0, math.pi / 2):
        b = box('blade', (2.3, 0.05, 0.2), (0, 0, 0), black, 0.01, rot=(0, rot, 0)); b.parent = prop
    sp = cyl('spinner', 0.2, 0.35, (0, 0, 0), 'Y', red, 20, r2=0.04); sp.parent = prop
    for name, sx, y, side in (('wheel_FL', 0, -3.0, -1), ('wheel_RL', -1.1, 0.35, -1), ('wheel_RR', 1.1, 0.35, 1)):
        w = car_gen.wheel(S, name, 1 if sx >= 0 else -1, False); w.location = (sx * 1.0 + (0.0 if sx == 0 else (0.14 if sx > 0 else -0.14)), y, S['wr']); out.append(w)
        if sx < 0: w.rotation_euler = (0, 0, math.pi)
    return out

def hornet():
    paint = mat('Paint', (0.05, 0.12, 0.35, 1), 0.4, 0.3, clearcoat=1.0); white = mat('Trim', (0.92, 0.92, 0.94, 1), 0.2, 0.4); black = mat('Black', (0.015, 0.015, 0.017, 1), 0.2, 0.5)
    glass = mat('Glass', (0.01, 0.015, 0.02, 1), 0.2, 0.03, clearcoat=1.0)
    out = []
    out.append(loft('body', [(-2.7, 0.05, 0.55, 1.0), (-2.2, 0.75, 0.3, 1.6), (-1.0, 1.0, 0.25, 2.2), (0.9, 0.9, 0.35, 2.1), (2.2, 0.5, 0.85, 1.75), (3.0, 0.22, 1.1, 1.5)], [paint]))
    out.append(box('canopy', (1.5, 1.5, 0.95), (0, -1.55, 1.55), glass, 0.15)); out.append(box('sidewin', (2.02, 1.2, 0.5), (0, -0.2, 1.7), glass, 0.1))
    out.append(box('boom', (0.34, 4.8, 0.42), (0, 5.2, 1.5), paint, 0.06)); out.append(box('fin', (0.09, 1.0, 1.25), (0, 7.4, 1.95), white, 0.03)); out.append(box('hstab', (1.5, 0.5, 0.06), (0, 6.4, 1.55), paint, 0.02))
    out.append(box('engine', (0.9, 1.6, 0.5), (0, 0.4, 2.45), black, 0.08)); out.append(cyl('mast', 0.08, 0.7, (0, 0, 2.7), 'Z', black, 12))
    rotor = bpy.data.objects.new('rotor', None); bpy.context.collection.objects.link(rotor); rotor.location = (0, 0, 3.05); out.append(rotor)
    for rot in (0, math.pi / 2):
        b = box('rblade', (9.6, 0.28, 0.04), (0, 0, 0), black, 0.005, rot=(0, 0, rot)); b.parent = rotor
    hub = cyl('hub', 0.2, 0.18, (0, 0, 0), 'Z', black, 12); hub.parent = rotor
    tr = bpy.data.objects.new('tailrotor', None); bpy.context.collection.objects.link(tr); tr.location = (0.2, 7.4, 2.0); out.append(tr)
    for rot in (0, math.pi / 2):
        b = box('tblade', (0.03, 0.12, 1.5), (0, 0, 0), black, 0.005, rot=(rot, 0, 0)); b.parent = tr
    for sx in (1, -1):
        out.append(box('skid', (0.09, 4.2, 0.09), (sx * 0.95, 0.2, 0.1), black, 0.02)); out.append(box('skidleg', (0.07, 0.07, 0.75), (sx * 0.95, -0.9, 0.45), black, 0.01, rot=(0, math.radians(sx * 8), 0))); out.append(box('skidleg', (0.07, 0.07, 0.75), (sx * 0.95, 1.3, 0.45), black, 0.01, rot=(0, math.radians(sx * 8), 0)))
        out.append(box('navlight', (0.1, 0.1, 0.1), (sx * 1.0, 0.5, 1.4), mat('Nav' + str(sx), (1, 0.1, 0.1, 1) if sx > 0 else (0.1, 1, 0.2, 1), 0, 0.3, emit=(1, 0.1, 0.1, 1) if sx > 0 else (0.1, 1, 0.2, 1), emit_strength=6)))
    out.append(box('taillight', (0.14, 0.08, 0.12), (0, 7.85, 2.2), mat('Taillight', (0.5, 0, 0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=3), 0.02))
    out.append(box('headlight', (0.4, 0.1, 0.16), (0, -2.55, 0.8), mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6), 0.03))
    return out

def marlin():
    paint = mat('Paint', (0.95, 0.95, 0.97, 1), 0.2, 0.25, clearcoat=1.0); blue = mat('Accent', (0.05, 0.3, 0.8, 1), 0.3, 0.3, clearcoat=1.0); black = mat('Black', (0.015, 0.015, 0.017, 1), 0.2, 0.5)
    glass = mat('Glass', (0.01, 0.015, 0.02, 1), 0.2, 0.03, clearcoat=1.0); seat = mat('Seat', (0.9, 0.9, 0.85, 1), 0, 0.6); chrome = mat('Chrome', (0.8, 0.82, 0.86, 1), 1.0, 0.2)
    out = []
    out.append(loft('hull', [(-3.9, 0.04, 0.55, 0.95), (-3.1, 0.7, 0.15, 0.97), (-1.5, 1.1, 0.0, 0.95), (1.5, 1.22, 0.0, 0.92), (3.4, 1.22, 0.1, 0.9), (3.75, 1.0, 0.2, 0.86)], [paint]))
    out.append(box('stripe', (2.46, 5.2, 0.12), (0, 0.0, 0.62), blue, 0.02)); out.append(box('deck', (2.2, 3.2, 0.06), (0, 1.0, 0.9), black, 0.01))
    out.append(box('windshield', (1.9, 0.08, 0.75), (0, -0.7, 1.28), glass, 0.04, rot=(math.radians(-28), 0, 0))); out.append(box('console', (1.5, 0.6, 0.5), (0, -0.4, 1.1), black, 0.06))
    for sx in (-0.5, 0.5): out.append(box('seat', (0.7, 0.6, 0.18), (sx, 0.6, 1.0), seat, 0.04)); out.append(box('seatback', (0.7, 0.12, 0.55), (sx, 0.95, 1.3), seat, 0.04))
    out.append(box('bench', (1.9, 0.7, 0.18), (0, 2.4, 1.0), seat, 0.04))
    out.append(box('engine', (0.5, 0.6, 0.9), (0, 3.95, 0.95), black, 0.06)); out.append(cyl('prop', 0.07, 0.5, (0, 4.05, 0.25), 'Z', chrome, 12))
    out.append(box('taillight', (0.2, 0.08, 0.1), (0.9, 3.78, 0.85), mat('Taillight', (0.5, 0, 0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=3), 0.02))
    for sx in (1, -1): out.append(box('headlight', (0.3, 0.1, 0.1), (sx * 0.5, -3.55, 0.78), mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6), 0.02))
    return out

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]; kind, outp = argv[0], argv[1]; prev = argv[2:]
    reset(); items = {'skylark': skylark, 'hornet': hornet, 'marlin': marlin}[kind]()
    if prev:
        studio()
        for i, ang in enumerate((35, 145, 90)):
            if i >= len(prev): break
            a = math.radians(ang); shot(prev[i], (math.sin(a) * 13, -math.cos(a) * 13, 5), (0, 0.4, 1.4), 42)
    for o in list(bpy.context.scene.objects):
        if o.name.startswith('floor'): bpy.data.objects.remove(o)
    export(outp); print('EXPORTED', outp)
