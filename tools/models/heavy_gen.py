# Box truck ("hauler") and city bus for Neon Overdrive.  blender -b --python heavy_gen.py -- <hauler|bus> <out.glb> [preview.png ...]
import sys, math, os
sys.path.insert(0, os.path.dirname(__file__))
from bl import *
import car_gen

def glassmat(): return mat('Glass', (0.01, 0.012, 0.016, 1), 0.2, 0.03, clearcoat=1.0)

def common(S, out, paint, black, head, tail, L, W, front_y, rear_y):
    for sz, nm in ((1, 'F'), (-1, 'R')):
        for sx, sd in ((1, 'R'), (-1, 'L')):
            w = car_gen.wheel(S, f'wheel_{nm}{sd}', sx, sz > 0)
            w.location = (sx * (S['track'] / 2 + 0.005), -sz * S['wb'] / 2, S['wr']); out.append(w)
            if sx < 0: w.rotation_euler = (0, 0, math.pi)
    for sx in (1, -1):
        out.append(box('headlight', (0.42, 0.08, 0.2), (sx * (W / 2 - 0.4), front_y - 0.02, 0.85), head, 0.03))
        out.append(box('taillight', (0.22, 0.08, 0.3), (sx * (W / 2 - 0.2), rear_y + 0.02, 0.95), tail, 0.03))
        out.append(box('mirror', (0.12, 0.1, 0.5), (sx * (W / 2 + 0.16), front_y + 0.5, 1.9), black, 0.03))

def hauler():
    S = dict(L=7.4, wb=4.4, track=2.15, wr=0.5, ww=0.32)
    paint = mat('Paint', (0.9, 0.9, 0.92, 1), 0.3, 0.4, clearcoat=0.6); cab_paint = mat('PaintCab', (0.05, 0.25, 0.8, 1), 0.4, 0.35, clearcoat=1.0)
    black = mat('Black', (0.015, 0.015, 0.017, 1), 0.2, 0.5); glass = glassmat(); stripe = mat('Stripe', (1.0, 0.45, 0.05, 1), 0, 0.5)
    head = mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6); tail = mat('Taillight', (0.5, 0, 0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=2)
    out = []; W = 2.5; fy = -3.7; ry = 3.7
    out.append(box('chassis', (2.0, 7.0, 0.35), (0, 0, 0.78), black, 0.02))
    out.append(box('cab', (W - 0.1, 2.0, 2.15), (0, fy + 1.05, 1.95), cab_paint, 0.12))
    out.append(box('cabnose', (W - 0.3, 0.3, 1.0), (0, fy + 0.05, 1.2), cab_paint, 0.1))
    out.append(box('windshield', (W - 0.45, 0.06, 0.95), (0, fy + 0.05, 2.35), glass, 0.04, rot=(math.radians(-8), 0, 0)))
    for sx in (1, -1): out.append(box('sidewin', (0.06, 1.1, 0.8), (sx * (W / 2 - 0.04), fy + 1.15, 2.3), glass, 0.03))
    out.append(box('bumper', (W, 0.28, 0.4), (0, fy - 0.05, 0.62), black, 0.05))
    out.append(box('grille', (1.3, 0.05, 0.45), (0, fy - 0.02, 1.05), black, 0.03))
    out.append(box('cargo', (W, 4.65, 2.55), (0, 1.15, 2.15), paint, 0.1))
    out.append(box('cargostripe', (W + 0.02, 4.65, 0.22), (0, 1.15, 1.55), stripe, 0.02))
    out.append(box('cargodoor', (1.9, 0.05, 2.1), (0, ry - 0.05, 2.1), black, 0.02)); out.append(box('bumperR', (W, 0.25, 0.3), (0, ry, 0.68), black, 0.05))
    for sx in (1, -1): out.append(box('fender', (0.1, 1.2, 0.18), (sx * (S['track'] / 2 + 0.05), -S['wb'] / 2, S['wr'] * 2 + 0.05), black, 0.02)); out.append(box('fenderR', (0.1, 1.2, 0.18), (sx * (S['track'] / 2 + 0.05), S['wb'] / 2, S['wr'] * 2 + 0.05), black, 0.02))
    inter = mat('Interior', (0.03, 0.03, 0.035, 1), 0, 0.8); out.append(box('dash', (1.9, 0.4, 0.3), (0, fy + 0.5, 1.55), inter, 0.04)); out.append(box('seat', (0.55, 0.5, 0.15), (0.5, fy + 1.3, 1.2), inter, 0.04))
    common(S, out, paint, black, head, tail, 7.4, W, fy, ry); return S, out

def bus():
    S = dict(L=11.5, wb=6.0, track=2.15, wr=0.5, ww=0.34)
    paint = mat('Paint', (0.9, 0.05, 0.12, 1), 0.3, 0.35, clearcoat=1.0); white = mat('Trim', (0.92, 0.92, 0.94, 1), 0.2, 0.5)
    black = mat('Black', (0.015, 0.015, 0.017, 1), 0.2, 0.5); glass = glassmat()
    head = mat('Headlight', (1, 1, 1, 1), 0, 0.2, emit=(1, 0.96, 0.85, 1), emit_strength=6); tail = mat('Taillight', (0.5, 0, 0, 1), 0, 0.3, emit=(1, 0.05, 0.03, 1), emit_strength=2)
    destmat = mat('Dest', (1.0, 0.6, 0.05, 1), 0, 0.3, emit=(1, 0.55, 0.05, 1), emit_strength=4)
    out = []; W = 2.55; fy = -5.75; ry = 5.75
    out.append(box('chassis', (2.2, 11.0, 0.3), (0, 0, 0.7), black, 0.02))
    out.append(box('bodylow', (W, 11.5, 1.0), (0, 0, 1.25), paint, 0.1))
    out.append(box('bodyup', (W - 0.04, 11.4, 1.35), (0, 0, 2.55), white, 0.1))
    out.append(box('roof', (W - 0.12, 11.3, 0.12), (0, 0, 3.28), white, 0.05))
    out.append(box('windshield', (W - 0.3, 0.06, 1.25), (0, fy + 0.02, 2.6), glass, 0.04))
    for sx in (1, -1):
        out.append(box('window', (0.06, 9.8, 0.95), (sx * (W / 2 - 0.0), -0.2, 2.62), glass, 0.04))
        out.append(box('doorgap', (0.07, 1.2, 1.9), (sx * (W / 2 + 0.0), -3.9, 1.85), glass, 0.04))
    out.append(box('dest', (1.6, 0.05, 0.22), (0, fy - 0.01, 3.1), destmat, 0.02))
    out.append(box('bumper', (W, 0.3, 0.35), (0, fy - 0.08, 0.7), black, 0.05)); out.append(box('bumperR', (W, 0.3, 0.35), (0, ry + 0.05, 0.7), black, 0.05))
    inter = mat('Interior', (0.12, 0.12, 0.14, 1), 0, 0.8); out.append(box('dash', (2.0, 0.5, 0.4), (0, fy + 0.8, 1.9), inter, 0.04))
    for k in range(7):
        for sx in (0.6, -0.6): out.append(box('seat', (0.7, 0.55, 0.12), (sx, -3.0 + k * 1.15, 1.35), inter, 0.03))
    for sx in (1, -1): out.append(box('fender', (0.1, 1.3, 0.18), (sx * (S['track'] / 2 + 0.05), -S['wb'] / 2, S['wr'] * 2 + 0.05), black, 0.02)); out.append(box('fenderR', (0.1, 1.3, 0.18), (sx * (S['track'] / 2 + 0.05), S['wb'] / 2, S['wr'] * 2 + 0.05), black, 0.02))
    common(S, out, paint, black, head, tail, 11.5, W, fy, ry); return S, out

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]; kind, outp = argv[0], argv[1]; prev = argv[2:]
    reset(); S, items = {'hauler': hauler, 'bus': bus}[kind]()
    if prev:
        studio()
        for i, ang in enumerate((35, 145, 90)):
            if i >= len(prev): break
            a = math.radians(ang); shot(prev[i], (math.sin(a) * 15, -math.cos(a) * 15, 4.5), (0, 0, 1.6), 42)
    # drop any studio floor from the export
    for o in list(bpy.context.scene.objects):
        if o.name.startswith('floor'): bpy.data.objects.remove(o)
    export(outp); print('EXPORTED', outp)
