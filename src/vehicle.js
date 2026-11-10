// Vehicles: Blender car models (separate doors + wheels) driven by the Car physics.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Car, CARS, CAR_BY_ID } from './car.js';
import { Plane, Heli, Boat } from './aero.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lowify } from './lowgpu.js';

// Draw-call diet: a car model is ~200 tiny meshes (rim spokes, trim, lights). Merge every static part that shares a material into one mesh,
// once per model, so each car costs ~15 draw calls instead of ~200. Wheels, doors, steering fork, propellers and sirens stay separate.
const KEEP = /^(wheel_|door_|fork|prop|rotor|tailrotor)/, KEEP_MAT = /LightRed|LightBlue/;
function slimModel(scene) {
  scene.updateMatrixWorld(true); const groups = new Map(), gone = [];
  scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.name === 'floor' || Array.isArray(o.material) || KEEP_MAT.test(o.material.name || '') || o.matrixWorld.determinant() < 0) return;
    for (let a = o; a && a !== scene; a = a.parent) if (KEEP.test(a.name)) return;
    const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.index) { const n = g.attributes.position.count, ix = new (n > 65535 ? Uint32Array : Uint16Array)(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); }
    (groups.get(o.material) || groups.set(o.material, []).get(o.material)).push(g); gone.push(o);
  });
  if (!gone.length) return;
  for (const o of gone) o.parent && o.parent.remove(o);
  for (const [m, gs] of groups) { const merged = mergeGeometries(gs, false); if (!merged) continue; const mesh = new THREE.Mesh(merged, m); mesh.name = m.name || 'merged'; scene.add(mesh); }
}
CAR_BY_ID.police = { ...CAR_BY_ID.meridian, id: 'police', name: 'Interceptor', top: 240, acc: 10 };
const _A = CAR_BY_ID.atlas, _M = CAR_BY_ID.meridian;
Object.assign(CAR_BY_ID, {
  taxi: { ..._M, id: 'taxi', name: 'Neon Cab', cls: 'Taxi', top: 165, acc: 7.2, model: 'meridian', fixedPaint: '#ffc400', price: 0 },
  hauler: { ..._A, id: 'hauler', name: 'Hauler HD', cls: 'Truck', top: 110, acc: 3.8, grip: 0.75, mass: 6500, price: 0, doorFwd: 2.4, body: { ..._A.body, L: 7.4, W: 2.5, wb: 4.4, wr: 0.5, ww: 0.32 } },
  bus: { ..._A, id: 'bus', name: 'Metro Bus', cls: 'Bus', top: 95, acc: 3.0, grip: 0.7, mass: 11500, price: 0, doorFwd: 4.2, fixedPaint: '#d90429', body: { ..._A.body, L: 11.5, W: 2.55, wb: 6.0, wr: 0.5, ww: 0.34 } },
});
Object.assign(CAR_BY_ID, {
  skylark: { ..._M, id: 'skylark', name: 'Skylark SR-2', cls: 'Light Plane', craft: 'plane', collW: 8, top: 260, acc: 6, grip: 1, mass: 1100, price: 0, doorFwd: 0, body: { ..._M.body, L: 8.4, W: 1.7, wr: 0.28, ww: 0.16, wb: 3.3 } },
  hornet: { ..._M, id: 'hornet', name: 'Hornet H1', cls: 'Helicopter', craft: 'heli', collW: 8, top: 220, acc: 6, grip: 1, mass: 1500, price: 0, doorFwd: 0, body: { ..._M.body, L: 10.5, W: 2.0, wr: 0.3, ww: 0.2, wb: 3.0 } },
  marlin: { ..._M, id: 'marlin', name: 'Marlin 28', cls: 'Speedboat', craft: 'boat', top: 125, acc: 8, grip: 1, mass: 900, price: 0, doorFwd: 0, body: { ..._M.body, L: 7.7, W: 2.5, wr: 0.3, ww: 0.2, wb: 3.0 } },
});
const SEATS = { hauler: [0.5, 1.0, 2.45], bus: [0.55, 1.4, 4.55], skylark: [0.36, 0.6, 0.75], hornet: [0.42, 0.34, 1.0], marlin: [0.5, 0.95, -0.5] };
const ROOF = { kestrel: 1.35, meridian: 1.43, orion: 1.46, atlas: 1.8, bulldog: 1.4, fox: 1.5, vanta: 1.14, phantom: 1.06, police: 1.43 };
const gltf = new GLTFLoader(), cache = {};
let _blob; const blobTex = () => _blob || (_blob = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 6, 64, 64, 62); r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(.6, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })());
const BIKE_SEAT = { viper: [0, 0.3, -0.34], cruiser: [0, 0.26, -0.18] };
export const isBike = id => id === 'viper' || id === 'cruiser';
export const seatFor = id => SEATS[id] ? new THREE.Vector3(...SEATS[id]) : isBike(id) ? new THREE.Vector3(...BIKE_SEAT[id]) : new THREE.Vector3(0.42, -0.12 + ((ROOF[id] || 1.4) - 1.35) * 0.95, -0.1);

export class Vehicle {
  constructor(id, car, root, wheels, doors) { this.id = id; this.car = car; this.root = root; this.wheels = wheels; this.doors = doors; this.doorOpen = { L: 0, R: 0 }; this.doorTarget = { L: 0, R: 0 }; this.driver = null; this.kind = 'parked'; this.ai = null; this.lightsOn = false; this.siren = false; this.t = 0; this.owner = null; this.tailMats = []; this.hp = 100; this.exploded = false; this.driverPerson = null; this.fuseT = 0; this.fireT = 0; }
  damage(n) { if (this.exploded) return; this.hp = Math.max(0, this.hp - n); this.car.health = this.hp; if (this.hp < 12 && !this.fuseT) this.fuseT = 4 + Math.random() * 2; }
  setDoor(side, open) { this.doorTarget[side] = open ? 1 : 0; }
  update(dt) {
    const c = this.car, r = this.root; this.t += dt; r.position.set(c.x, c.y, c.z); r.rotation.set(c.pitch, c.h, c.roll, 'YXZ');
    if (this.fork) this.fork.rotation.y = c.steer * 0.9;
    c.occupied = this.kind === 'player';
    for (const s of this.spinners || []) s.node.rotation[s.axis] += (c[s.field] || 0) * dt;
    if (this.isBike) { const lean = Math.max(-0.62, Math.min(0.62, c.steer * Math.min(c.speed, 20) * 0.035 + c.roll * 0.5)); r.rotation.z = lean; }
    for (const w of this.wheels) { w.pivot.rotation.y = w.front && !this.fork ? c.steer : 0; const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), c.wheelSpin * (w.left ? -1 : 1)); w.node.quaternion.copy(w.base).multiply(q); }
    for (const s of ['L', 'R']) { const d = this.doors[s]; if (!d) continue; const k = 1 - Math.exp(-dt * 7); this.doorOpen[s] += (this.doorTarget[s] - this.doorOpen[s]) * k; d.rotation.y = (s === 'L' ? -1 : 1) * this.doorOpen[s] * 1.1; }
    if (this.siren && this.sirenR) { const ph = Math.floor(this.t * 6) % 2; for (const m of this.sirenR) m.material.emissiveIntensity = ph ? 6 : 0.2; for (const m of this.sirenB) m.material.emissiveIntensity = ph ? 0.2 : 6; }
  }
  doorWorld(side) { // world position just outside the given door
    const c = this.car, W = this.car.spec.body.W, sx = side === 'L' ? 1 : -1, fx = Math.sin(c.h), fz = Math.cos(c.h), lx = Math.cos(c.h), lz = -Math.sin(c.h);   // left vector (+x when h=0) = (cos h, -sin h)
    const off = W / 2 + 0.75; return { x: c.x + lx * sx * off + fx * (this.car.spec.doorFwd ?? 0.25), z: c.z + lz * sx * off + fz * (this.car.spec.doorFwd ?? 0.25) };
  }
  dispose(scene) { scene.remove(this.root); }
}
export async function createVehicle(scene, id, x, z, h, paint, opts = {}) {
  const spec = CAR_BY_ID[id] || CAR_BY_ID.meridian;
  const model = spec.model || id; if (spec.fixedPaint) paint = spec.fixedPaint;
  cache[model] ||= gltf.loadAsync(`../assets/models/${model}.glb`).then(g => { if (!spec.craft) { try { slimModel(g.scene); } catch (e) { console.warn('slimModel failed', model, e); } } return g; });
  const src = (await cache[model]).scene, root = src.clone(true), car = spec.craft === 'plane' ? new Plane(spec, x, z, h) : spec.craft === 'heli' ? new Heli(spec, x, z, h) : spec.craft === 'boat' ? new Boat(spec, x, z, h) : new Car(spec, x, z, h);
  root.traverse(o => { if (o.name === 'floor') { o.visible = false; o.userData.drop = true; return; } if (o.isMesh) { o.material = o.material.clone(); if (o.material.name === 'Paint' && paint) o.material.color.set(paint); o.material.envMapIntensity = 1.0; if (o.material.name === 'Glass') { o.material.metalness = 0.9; o.material.roughness = 0.05; } } });
  lowify(root);
  const wheels = [];
  for (const n of ['FL', 'FR', 'RL', 'RR']) { const w = root.getObjectByName('wheel_' + n); if (!w) continue; const pivot = new THREE.Group(); pivot.position.copy(w.position); w.parent.add(pivot); pivot.add(w); w.position.set(0, 0, 0); wheels.push({ pivot, node: w, front: n[0] === 'F', left: n[1] === 'L', base: w.quaternion.clone() }); }
  const doors = { L: root.getObjectByName('door_L'), R: root.getObjectByName('door_R') };
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(isBike(id) ? 1.2 : 2.6, spec.body.L + 0.9), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.09; sh.visible = !spec.craft; root.add(sh);
  if (id === 'taxi') { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#ffe14a'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#111'; g.font = '900 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAXI', 128, 52); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sg = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.17, 0.26), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshBasicMaterial(i === 4 || i === 5 ? { map: t } : { color: 0xffe14a }))); sg.position.set(0, 1.52, -0.15); root.add(sg); }
  const v = new Vehicle(id, car, root, wheels, doors); v.craft = spec.craft || null; v.spinners = [['prop', 'z', 'propSpeed'], ['rotor', 'y', 'rotorSpeed'], ['tailrotor', 'x', 'tailSpeed']].map(([n, axis, field]) => { const node = root.getObjectByName(n); return node ? { node, axis, field } : null; }).filter(Boolean); v.isBike = isBike(id); v.fork = root.getObjectByName('fork') || null;
  if (id === 'police') { v.sirenR = []; v.sirenB = []; root.traverse(o => { if (o.isMesh && o.material && /LightRed/.test(o.material.name)) v.sirenR.push(o); if (o.isMesh && o.material && /LightBlue/.test(o.material.name)) v.sirenB.push(o); }); }
  scene.add(root); v.update(0); return v;
}
export function addHeadlights(v, on = true) {
  if (v.spots) { for (const s of v.spots) s.visible = on; return; }
  // light beams are plain additive cones: no real light, so the light count (and therefore the shader programs) never changes
  const L = v.car.spec.body.L; v.spots = [];
  if (!addHeadlights.geo) { const g = new THREE.ConeGeometry(1.7, 13, 14, 1, true); g.translate(0, -6.5, 0); g.rotateX(-Math.PI / 2); addHeadlights.geo = g; addHeadlights.mat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); }
  for (const sx of [-0.6, 0.6]) { const b = new THREE.Mesh(addHeadlights.geo, addHeadlights.mat); b.position.set(sx, 0.75, L / 2 - 0.3); b.name = 'beam'; b.visible = on; b.frustumCulled = false; v.root.add(b); v.spots.push(b); }
}
export { CARS, CAR_BY_ID };
