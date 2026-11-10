# Lofted, subdivision-modelled cars for Neon Overdrive.  blender --background --python car_gen.py -- <car_id> <out.glb> [preview.png ...]
import sys, math, os
sys.path.insert(0, os.path.dirname(__file__))
from bl import *

def hermite(pts, s):
    # cardinal spline through (s, v) control points, clamped at the ends
    if s <= pts[0][0]: return pts[0][1]
    if s >= pts[-1][0]: return pts[-1][1]
    for i in range(len(pts) - 1):
        if pts[i][0] <= s <= pts[i + 1][0]: break
    (s0, v0), (s1, v1) = pts[i], pts[i + 1]
    def tan(k):
        a, b = max(k - 1, 0), min(k + 1, len(pts) - 1)
        return (pts[b][1] - pts[a][1]) / max(pts[b][0] - pts[a][0], 1e-6)
    h = s1 - s0; t = (s - s0) / h; t2, t3 = t * t, t * t * t
    return (2*t3 - 3*t2 + 1) * v0 + (t3 - 2*t2 + t) * h * tan(i) + (-2*t3 + 3*t2) * v1 + (t3 - t2) * h * tan(i + 1)

def mk(L, wb, track, wr, ww, belt, top, bot, hw, **kw):
    d = dict(L=L, wb=wb, track=track, wr=wr, ww=ww, belt=belt, top=top, bot=bot, hw=hw); d.update(kw); return d
def std_bot(L, gc, lip=.34): h = L / 2; return [(-h, lip), (-h + .08, gc + .03), (-h + .4, gc), (h - .4, gc), (h - .08, gc + .03), (h, lip)]
def std_hw(L, w): h = L / 2; return [(-h, w * .8), (-h + .18, w * .94), (-h + .8, w), (0, w), (h - .8, w * .99), (h - .18, w * .93), (h, w * .8)]
SPECS = {
 'kestrel': mk(4.55, 2.70, 1.62, .345, .27, .96,
   [(-2.275,.80),(-2.2,.90),(-1.9,.99),(-1.45,1.01),(-1.0,1.12),(-.55,1.30),(-.1,1.35),(.3,1.34),(.7,1.18),(1.0,.97),(1.5,.90),(1.95,.84),(2.2,.74),(2.275,.60)], std_bot(4.55,.17), std_hw(4.55,.97),
   cpillar=.28, wing='duck', exhaust=2, paint=(0.95,0.62,0.02)),
 'meridian': mk(4.85, 2.85, 1.58, .335, .23, .95,
   [(-2.425,.84),(-2.35,.95),(-2.0,1.0),(-1.55,1.0),(-1.15,1.1),(-.7,1.36),(-.45,1.43),(.3,1.43),(.75,1.3),(1.05,.97),(1.5,.9),(2.1,.84),(2.35,.74),(2.425,.62)], std_bot(4.85,.19), std_hw(4.85,.93),
   cpillar=.3, bpillar=-.12, paint=(0.06,0.14,0.33), exhaust=1),
 'orion': mk(4.15, 2.60, 1.58, .335, .24, .98,
   [(-2.075,.78),(-2.02,1.0),(-1.9,1.24),(-1.5,1.43),(-.4,1.46),(.2,1.44),(.65,1.26),(.95,.97),(1.45,.9),(1.9,.84),(2.0,.72),(2.075,.58)], std_bot(4.15,.19), std_hw(4.15,.91),
   cpillar=.1, bpillar=-.1, wing='small', paint=(0.8,0.03,0.05), exhaust=1),
 'atlas': mk(4.90, 2.90, 1.68, .40, .28, 1.12,
   [(-2.45,1.0),(-2.4,1.45),(-2.25,1.76),(-1.0,1.8),(.2,1.78),(.75,1.55),(1.05,1.16),(1.5,1.1),(2.2,1.0),(2.45,.8)], std_bot(4.90,.28,.42), std_hw(4.90,.99),
   cpillar=.1, bpillar=-.2, rails=True, paint=(0.1,0.14,0.16)),
 'bulldog': mk(4.95, 2.85, 1.66, .36, .30, .98,
   [(-2.475,.9),(-2.4,1.0),(-1.9,1.04),(-1.3,1.05),(-.95,1.18),(-.55,1.38),(0,1.4),(.35,1.38),(.8,1.2),(1.05,1.02),(1.6,.99),(2.2,.95),(2.475,.78)], std_bot(4.95,.17), std_hw(4.95,.98),
   cpillar=.3, bpillar=-.1, exhaust=2, scoop=True, stripes=True, paint=(0.02,0.03,0.04)),
 'fox': mk(4.20, 2.60, 1.60, .36, .26, 1.0,
   [(-2.1,.8),(-2.04,1.02),(-1.92,1.26),(-1.5,1.46),(-.4,1.5),(.2,1.48),(.66,1.3),(.98,1.0),(1.45,.93),(1.9,.88),(2.0,.76),(2.1,.62)], std_bot(4.2,.26), std_hw(4.2,.92),
   cpillar=.1, bpillar=-.1, wing='big', scoop=True, paint=(0.1,0.35,0.9), exhaust=1),
 'vanta': mk(4.60, 2.70, 1.66, .35, .32, .80,
   [(-2.3,.76),(-2.2,.86),(-1.7,.92),(-1.2,.98),(-.9,1.07),(-.5,1.13),(0,1.14),(.4,1.1),(.8,.9),(1.2,.78),(1.8,.7),(2.2,.6),(2.3,.5)], std_bot(4.6,.12,.24),
   [(-2.3,.8),(-2.1,.96),(-1.2,1.0),(0,.99),(1.2,.98),(2.0,.92),(2.3,.74)], cpillar=.4, wing='gt', exhaust=4, paint=(0.8,0.0,0.0)),
 'phantom': mk(4.70, 2.75, 1.70, .36, .34, .76,
   [(-2.35,.7),(-2.2,.82),(-1.6,.88),(-1.0,.95),(-.6,1.04),(-.2,1.06),(.2,1.04),(.7,.84),(1.2,.73),(1.8,.65),(2.2,.55),(2.35,.45)], std_bot(4.7,.1,.22),
   [(-2.35,.82),(-2.1,1.0),(-1.2,1.03),(0,1.02),(1.2,1.0),(2.0,.93),(2.35,.74)], cpillar=.45, wing='gt', exhaust=2, glowstrip=True, paint=(0.93,0.93,0.95)),
}
SPECS['police'] = dict(SPECS['meridian'], paint=(0.92, 0.92, 0.94), police=True)

def derive_glass(S):
    top, belt = S['top'], S['belt']; ss = [S['L'] * (k / 400 - .5) for k in range(401)]
    hs = [hermite(top, s) for s in ss]; rh = max(hs)
    on = [s for s, h in zip(ss, hs) if h >= rh - 0.035]; rf, rr = max(on), min(on)
    wsb = next(s for s in ss if s > rf and hermite(top, s) <= belt + 0.03); rb = next(s for s in reversed(ss) if s < rr and hermite(top, s) <= belt + 0.05)
    S['G'] = dict(roofH=rh, rf=rf, rr=rr, wsb=wsb, rb=rb)

def split_doors(body, S):
    """Cut the two door panels out of the body shell as separate objects with hinge pivots (door_L = +x side)."""
    G, belt = S['G'], S['belt']
    s_front = G['wsb'] - 0.30; s_rear = s_front - (0.95 if S['L'] < 4.7 else 1.05)
    bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.ensure_lookup_table(); doors = {}
    for sx, nm in ((1, 'door_L'), (-1, 'door_R')):
        sel = []
        for f in bm.faces:
            c = f.calc_center_median(); sc = -c.y
            if s_rear < sc < s_front and sx * c.x > 0.78 * hermite(S['hw'], sc) and sx * f.normal.x > 0.5 and 0.30 < c.z < hermite(S['top'], sc) - 0.01: sel.append(f)
        if not sel: continue
        nb = bmesh.new(); vm = {}
        hinge = Vector((sx * hermite(S['hw'], s_front), -s_front, 0.0))
        for f in sel:
            vs = []
            for v in f.verts:
                if v.index not in vm: vm[v.index] = nb.verts.new(v.co - hinge)
                vs.append(vm[v.index])
            try: nf = nb.faces.new(vs); nf.material_index = f.material_index; nf.smooth = True
            except ValueError: pass
        bmesh.ops.delete(bm, geom=sel, context='FACES')
        ob = obj_from_bm(nm, nb, [bpy.data.materials['Paint'], bpy.data.materials['Glass'], bpy.data.materials['Black']], smooth=True); ob.location = hinge
        add_modifier(ob, 'SOLIDIFY', thickness=0.035, offset=1.0 if sx < 0 else -1.0); apply_mods(ob)
        doors[nm] = ob
    bm.to_mesh(body.data); bm.free(); body.data.update()
    return doors

def build(car_id):
    S = SPECS[car_id]; derive_glass(S); L, wb, belt = S['L'], S['wb'], S['belt']
    paint = mat('Paint', S['paint'] + (1,), 0.55, 0.28, clearcoat=1.0)
    glass = mat('Glass', (0.01, 0.012, 0.016, 1), 0.2, 0.03, clearcoat=1.0)
    black = mat('Black', (0.015, 0.015, 0.017, 1), 0.2, 0.5)
    N = int(L / 0.055) + 1; rings = []; bm = bmesh.new(); xs = []
    for i in range(N):
        s = -L / 2 + L * i / (N - 1); xs.append(s)
        yt, yb, w = hermite(S['top'], s), hermite(S['bot'], s), hermite(S['hw'], s)
        bl = min(belt, yt - 0.14); k = max(0.0, min(1.0, (yt - belt) / 0.4)); rw = w * (0.84 - 0.13 * k)
        P = [(0, yb), (w * .80, yb), (w * .97, yb + .10), (w, yb + (bl - yb) * .55), (w, bl),
             (w * (1 - .035 * k), bl + (yt - bl) * .30), (w * (1 - .03 * k) * .55 + rw * .45, bl + (yt - bl) * .72), (rw, yt - (yt - bl) * .08), (rw * .55, yt), (0, yt)]
        ring = P + [(-x, h) for (x, h) in reversed(P[1:9])]
        rings.append([bm.verts.new((x, -s, h)) for (x, h) in ring])
    n = len(rings[0])
    faces = []
    for i in range(N - 1):
        for j in range(n):
            f = bm.faces.new((rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j]))
            lvl = j if j < 9 else 17 - j
            sc = -(sum(v.co.y for v in f.verts) / 4); hc = sum(v.co.z for v in f.verts) / 4
            f.material_index = 0
            if hc > belt + 0.04:
                G = S['G']; t = max(0.0, min(1.0, (hc - belt) / (G['roofH'] - belt)))
                if lvl in (7, 8) and G['rf'] + 0.06 < sc < G['wsb'] - 0.03: f.material_index = 1                    # windscreen
                elif lvl in (7, 8) and G['rb'] + 0.04 < sc < G['rr'] - 0.05 and G['rr'] - G['rb'] > 0.2: f.material_index = 1   # rear window
                elif lvl in (5, 6):
                    front = G['wsb'] + (G['rf'] - G['wsb']) * t - 0.10; rear = G['rb'] + (G['rr'] - G['rb']) * t + S.get('cpillar', .2) * (1 - 0.3 * t)
                    bp = S.get('bpillar')
                    if rear < sc < front and not (bp is not None and abs(sc - bp) < 0.06): f.material_index = 1
    cap1 = bm.faces.new(rings[0][::-1]); cap2 = bm.faces.new(rings[-1]); cap1.material_index = cap2.material_index = 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    body = obj_from_bm('body', bm, [paint, glass, black], smooth=True)
    add_modifier(body, 'SUBSURF', levels=1, render_levels=2)
    apply_mods(body)
    # wheel wells (boolean) -> dark liners
    wells = []
    R = S['wr'] + 0.075
    for sz in (1, -1):
        for sx in (1, -1):
            c = cyl('cut', R, 0.62, (sx * (S['track'] / 2 + 0.2), -sz * wb / 2, S['wr']), 'X', black, 40); wells.append(c)
    for c in wells:
        m = add_modifier(body, 'BOOLEAN', operation='DIFFERENCE', object=c, solver='EXACT')
        bpy.context.view_layer.update(); apply_mods(body)
        bpy.data.objects.remove(c)
    split_doors(body, S)
    return body, S

def wheel(S, name, side, front):
    wr, ww = S['wr'], S['ww']
    tire = mat('Tire', (0.012, 0.012, 0.013, 1), 0.0, 0.85); rim = mat('Rim', (0.78, 0.8, 0.84, 1), 1.0, 0.18); dark = mat('RimDark', (0.03, 0.03, 0.035, 1), 0.6, 0.4); brake = mat('Caliper', (0.8, 0.05, 0.04, 1), 0.3, 0.4)
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    # tyre: lathe profile around X axis
    bm = bmesh.new(); prof = [(wr * .70, -ww * .5), (wr * .86, -ww * .5), (wr * .985, -ww * .40), (wr, -ww * .22), (wr, ww * .22), (wr * .985, ww * .40), (wr * .86, ww * .5), (wr * .70, ww * .5)]
    seg = 56
    rows = []
    for a in range(seg):
        t = a / seg * 2 * math.pi; rows.append([bm.verts.new((x, math.sin(t) * r, math.cos(t) * r)) for (r, x) in prof])
    for a in range(seg):
        for k in range(len(prof) - 1): bm.faces.new((rows[a][k], rows[a][k + 1], rows[(a + 1) % seg][k + 1], rows[(a + 1) % seg][k]))
    tr = obj_from_bm('tire', bm, [tire], True); tr.parent = root
    # rim: dish + spokes
    bm = bmesh.new(); rr = wr * 0.70
    bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=rr, radius2=rr * 0.98, depth=ww * 0.9)
    for v in bm.verts: v.co = (v.co.z, v.co.x, v.co.y)
    rimo = obj_from_bm('rim', bm, [rim], True); rimo.parent = root
    dk = cyl('rimdark', rr * 0.86, ww * 0.62, (0, 0, 0), 'X', dark, 40); dk.parent = root; dk.location.x = ww * (0.05 if side > 0 else -0.05) * -1
    for k in range(10):
        a = k / 10 * 2 * math.pi
        sp = box('spoke', (ww * 0.34, rr * 0.08, rr * 0.88), (side * ww * 0.30, 0, 0), rim, 0.004); sp.parent = root
        sp.location = (side * ww * 0.30, math.sin(a) * rr * 0.46, math.cos(a) * rr * 0.46); sp.rotation_euler = (-a, 0, 0)
    hub = cyl('hub', rr * 0.2, ww * 0.12, (side * ww * 0.38, 0, 0), 'X', rim, 24); hub.parent = root
    disc = cyl('disc', rr * 0.8, 0.03, (-side * ww * 0.12, 0, 0), 'X', mat('Disc', (0.45, 0.46, 0.5, 1), 1, 0.35), 40); disc.parent = root
    cal = box('caliper', (0.05, rr * 0.34, rr * 0.5), (-side * ww * 0.12, 0, rr * 0.5), brake, 0.01); cal.parent = root
    return root

car_id_global = ''
def parts(S, body):
    L, wb, track, wr, ww = S['L'], S['wb'], S['track'], S['wr'], S['ww']
    out = []
    for sz, nm in ((1, 'F'), (-1, 'R')):
        for sx, sd in ((1, 'R'), (-1, 'L')):
            w = wheel(S, f'wheel_{nm}{sd}', sx, sz > 0)
            w.location = (sx * (track / 2 + 0.005), -sz * wb / 2, wr); out.append(w)
            if sx < 0: w.rotation_euler = (0, 0, math.pi)
    black = mat('Black'); chrome = mat('Chrome', (0.85, 0.86, 0.9, 1), 1.0, 0.1)
    head = mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6)
    tail = mat('Taillight', (0.5, 0.0, 0.0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=2)
    drl = mat('DRL', (0.6, 0.8, 1, 1), 0, 0.3, emit=(0.6, 0.85, 1, 1), emit_strength=8)
    F = -L / 2 + 0.0
    # headlights as slim swept units
    for sx in (1, -1):
        hl = box('headlight', (0.46, 0.09, 0.13), (sx * 0.64, -(L / 2 - 0.2), 0.62), head, 0.03, rot=(0, 0, sx * -0.2)); out.append(hl)
        inner = box('proj', (0.14, 0.02, 0.09), (sx * 0.66, -(L / 2 - 0.12), 0.62), black, 0.01); out.append(inner)
        dr = box('drl', (0.40, 0.03, 0.03), (sx * 0.62, -(L / 2 - 0.17), 0.52), drl, 0.01, rot=(0, 0, sx * -0.2)); out.append(dr)
        tl = box('taillight', (0.46, 0.06, 0.1), (sx * 0.66, L / 2 - 0.08, 0.82), tail, 0.02, rot=(0, 0, sx * 0.16)); out.append(tl)
        mir = box('mirror', (0.2, 0.1, 0.12), (sx * 1.0, -0.55, 1.0), mat('Paint'), 0.04); out.append(mir)
        ar = box('arm', (0.12, 0.03, 0.03), (sx * 0.93, -0.55, 0.98), black); out.append(ar)
        dh = box('handle', (0.02, 0.17, 0.025), (sx * 0.968, 0.25, 0.93), chrome, 0.008); out.append(dh)
    gr = box('grille', (0.78, 0.05, 0.14), (0, -(L / 2 - 0.03), 0.4), black, 0.02); out.append(gr)
    for k in range(4):
        sl = box('slat', (0.74, 0.02, 0.012), (0, -(L / 2 - 0.0), 0.35 + k * 0.035), chrome); out.append(sl)
    plate = box('plate', (0.5, 0.01, 0.12), (0, L / 2 - 0.01, 0.6), mat('Plate', (0.92, 0.92, 0.88, 1), 0, 0.5)); out.append(plate)
    for k in range(S.get('exhaust', 0)):
        xo = ([0] if S['exhaust'] == 1 else [-0.45, 0.45] if S['exhaust'] == 2 else [-0.55, -0.35, 0.35, 0.55])[k]
        e = cyl('exhaust', 0.055, 0.2, (xo, L / 2 - 0.03, 0.27), 'Y', chrome, 20); out.append(e)
    if S.get('police'):
        lr = mat('LightRed', (0.4, 0, 0, 1), 0, .3, emit=(1, .05, .08, 1), emit_strength=5); lb = mat('LightBlue', (0, 0, .4, 1), 0, .3, emit=(.1, .25, 1, 1), emit_strength=5)
        out.append(box('lb_base', (1.0, 0.3, 0.05), (0, -0.05, 1.5), black, 0.01)); out.append(box('lb_red', (0.46, 0.26, 0.1), (-0.25, -0.05, 1.56), lr, 0.02)); out.append(box('lb_blue', (0.46, 0.26, 0.1), (0.25, -0.05, 1.56), lb, 0.02))
        for sx in (1, -1): out.append(box('door_band', (0.012, 1.9, 0.34), (sx * 0.935, 0.05, 0.62), mat('PoliceBlue', (0.02, 0.07, 0.25, 1), 0.2, .4), 0.004))
    if S.get('stripes'):
        for sx in (-0.18, 0.18): out.append(box('stripe', (0.2, 2.8, 0.01), (sx, -0.2, 0.97), mat('Stripe', (0.9, 0.9, 0.9, 1), 0, .4)))
    if S.get('scoop'): out.append(box('scoop', (0.5, 0.7, 0.1), (0, -1.5, 0.96), black, 0.03))
    if S.get('rails'):
        for sx in (1, -1): out.append(box('rail', (0.05, 2.4, 0.05), (sx * 0.62, 0.0, 1.82), black, 0.01))
    if S.get('wing') == 'small': out.append(box('wing', (1.2, 0.22, 0.03), (0, L / 2 - 0.2, 1.22), mat('Paint'), 0.01))
    if S.get('wing') in ('big', 'gt'):
        wy = 1.32 if S['wing'] == 'big' else 1.2
        out.append(box('wing', (1.7, 0.4, 0.04), (0, L / 2 - 0.28, wy), mat('Paint'), 0.012))
        for sx in (1, -1): out.append(box('wingpost', (0.05, 0.2, wy - 0.88), (sx * 0.5, L / 2 - 0.3, (wy + 0.88) / 2), black, 0.01))
    if S.get('glowstrip'): out.append(box('glowstrip', (1.7, 0.02, 0.02), (0, -(L / 2 - 0.02), 0.34), mat('Glow', (0, 0.9, 1, 1), 0, .3, emit=(0.1, 0.9, 1, 1), emit_strength=8)))
    if S.get('wing') == 'duck':
        w = box('wing', (1.5, 0.3, 0.035), (0, L / 2 - 0.35, 1.04), mat('Paint'), 0.012); w.rotation_euler = (math.radians(-6), 0, 0); out.append(w)
    # sill / diffuser / splitter
    if car_id_global in ('kestrel','vanta','phantom','bulldog','fox'): out.append(box('splitter', (1.55, 0.3, 0.03), (0, -(L / 2 - 0.1), 0.14), black, 0.008))
    out.append(box('diffuser', (1.5, 0.4, 0.08), (0, L / 2 - 0.25, 0.22), black, 0.02))
    for sx in (1, -1): out.append(box('skirt', (0.03, 2.0, 0.06), (sx * (S['hw'][3][1] - 0.01), 0, 0.2), black, 0.008))
    # interior
    inter = mat('Interior', (0.03, 0.03, 0.035, 1), 0, 0.8); leather = mat('Seat', (0.08, 0.07, 0.07, 1), 0, 0.6)
    bo = S['belt'] - 0.96; out.append(box('dash', (1.7, 0.5, 0.2), (0, -0.7 + (0.3 if bo < -0.1 else 0), 0.9 + bo - (0.04 if bo < -0.1 else 0)), inter, 0.05))
    for sx in (0.42, -0.42):
        out.append(box('seat', (0.5, 0.5, 0.12), (sx, 0.05, 0.5 + bo * 0.5), leather, 0.04)); out.append(box('seatback', (0.5, 0.12, 0.5 + bo * 0.4), (sx, 0.32, 0.78 + bo * 0.7), leather, 0.05, rot=(math.radians(-12), 0, 0)))
    sw = bpy.data.objects.new('steering', None)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, segments=24, radius=0.19)  # placeholder ring
    bm.free()
    out.append(box('steerbar', (0.36, 0.04, 0.04), (0.42, -0.62, 1.03 + bo), black, 0.01, rot=(math.radians(-20), 0, 0)))
    return out

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]; cid, out = argv[0], argv[1]; prev = argv[2:]
    car_id_global = cid; reset(); body, S = build(cid); items = parts(S, body)
    if prev:
        studio()
        for i, ang in enumerate((35, 145, 90)):
            if i >= len(prev): break
            a = math.radians(ang); shot(prev[i], (math.sin(a) * 7.5, -math.cos(a) * 7.5, 1.7 if ang != 90 else 1.0), (0, 0, 0.6), 42)
    export(out)
    print('EXPORTED', out)
