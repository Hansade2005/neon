# Shared Blender helpers: materials, mesh builders, export, preview render.
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color=(0.5,0.5,0.5,1), metal=0.0, rough=0.5, emit=None, emit_strength=0.0, clearcoat=0.0, alpha=1.0, trans=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color; b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if clearcoat: 
        try: b.inputs['Coat Weight'].default_value = clearcoat; b.inputs['Coat Roughness'].default_value = 0.03
        except KeyError: pass
    if emit:
        b.inputs['Emission Color'].default_value = emit; b.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1: b.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND' if hasattr(m,'blend_method') else None
    if trans:
        try: b.inputs['Transmission Weight'].default_value = trans
        except KeyError: pass
    return m

def obj_from_bm(name, bm, mats=(), smooth=True, parent=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if parent: ob.parent = parent
    return ob

def add_modifier(ob, kind, **kw):
    m = ob.modifiers.new(kind, kind)
    for k, v in kw.items(): setattr(m, k, v)
    return m

def apply_mods(ob):
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev)
    old = ob.data; ob.modifiers.clear(); ob.data = me
    if old.users == 0: bpy.data.meshes.remove(old)

def box(name, size, loc=(0,0,0), m=None, bevel=0.0, rot=(0,0,0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    ob = obj_from_bm(name, bm, [m] if m else [], smooth=False); ob.location = loc; ob.rotation_euler = rot
    if bevel: add_modifier(ob, 'BEVEL', width=bevel, segments=3, limit_method='ANGLE')
    return ob

def cyl(name, r, depth, loc=(0,0,0), axis='X', m=None, seg=32, r2=None):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=depth)
    ob = obj_from_bm(name, bm, [m] if m else [], smooth=True)
    if axis == 'X': ob.rotation_euler = (0, math.pi/2, 0)
    elif axis == 'Y': ob.rotation_euler = (math.pi/2, 0, 0)
    ob.location = loc; return ob

def studio(res=(1000, 560), exposure=0.0):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res; sc.view_settings.view_transform = 'AgX' if False else 'Filmic' if False else 'Standard'
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.012, 0.015, 0.022, 1); bg.inputs[1].default_value = 1.0
    # floor
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=2, y_segments=2, size=30); fl = obj_from_bm('floor', bm, [mat('Floor', (0.05,0.055,0.065,1), 0.0, 0.18)], smooth=False)
    def area(name, loc, rot, size, energy, color):
        l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size[0]; l.size_y = size[1]; l.color = color; ob = bpy.data.objects.new(name, l); ob.location = loc; ob.rotation_euler = rot; bpy.context.collection.objects.link(ob)
    area('key', (6, -7, 7), (math.radians(55), 0, math.radians(40)), (6, 6), 2600, (1, 0.96, 0.9))
    area('rim', (-7, 6, 4), (math.radians(65), 0, math.radians(-135)), (6, 3), 2400, (0.55, 0.7, 1))
    area('top', (0, 0, 9), (0, 0, 0), (8, 8), 700, (1, 1, 1))
    area('fill', (-8, -6, 3), (math.radians(80), 0, math.radians(-50)), (6, 4), 900, (0.9, 0.95, 1))

def shot(path, loc, target=(0,0,0.6), lens=45):
    sc = bpy.context.scene; cam = bpy.data.cameras.new('cam'); cam.lens = lens; co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co); sc.camera = co
    co.location = loc; d = Vector(target) - Vector(loc); co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

def export(path, objs=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objs or bpy.context.scene.objects):
        if o.type in ('MESH', 'EMPTY'): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
