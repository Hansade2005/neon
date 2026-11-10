// Hollywood Hills estate: villa, pool, studio, garage, helipad, palm trees and the family. West of the city.
import * as THREE from 'three';
import { spawnPerson } from './people.js';
import { createVehicle } from './vehicle.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const rnd = (a, b) => a + Math.random() * (b - a);

export class Mansion {
  constructor(world, cx, cz) {
    this.world = world; this.cx = cx; this.cz = cz; this.t = 0; this.group = new THREE.Group(); world.scene.add(this.group); this.npcs = {}; this.garageCars = [];
    this.build(); this.spawnFamily();
  }
  M(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1, ...o }); }
  box(w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(this.cx + x, y, this.cz + z); this.group.add(m); return m; }
  build() {
    const G = this.group, cx = this.cx, cz = this.cz, C = this.world.city, x1 = cx + 82, x0 = cx - 82;
    // grounds: lawn + driveway toward the ring road (east)
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(164, 200), new THREE.MeshStandardMaterial({ map: C.mats.grass, roughness: 1 })); lawn.material.map = C.mats.grass.clone(); lawn.material.map.repeat.set(30, 36); lawn.material.map.needsUpdate = true; lawn.rotation.x = -Math.PI / 2; lawn.position.set(cx, 0.04, cz); G.add(lawn);
    const drive = new THREE.Mesh(new THREE.PlaneGeometry(90, 9), new THREE.MeshStandardMaterial({ map: C.mats.asphalt, roughness: 0.85 })); drive.rotation.x = -Math.PI / 2; drive.position.set(cx + 38, 0.06, cz + 6); G.add(drive);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(40, 28), new THREE.MeshStandardMaterial({ map: C.mats.pave, roughness: 0.8 })); apron.rotation.x = -Math.PI / 2; apron.position.set(cx - 2, 0.07, cz + 12); G.add(apron);
    // perimeter walls (east side open at the driveway gate)
    const wall = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), this.M(0xe9e4da)); m.position.set(x, 1.6, z); G.add(m); C.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };
    wall(164, 1.2, cx, cz - 100); wall(164, 1.2, cx, cz + 100); wall(1.2, 200, x0, cz); wall(1.2, 86, x1, cz - 57); wall(1.2, 96, x1, cz + 52);
    for (const z of [-14, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), this.M(0x222222)); g.position.set(x1, 2, cz + z + 0); G.add(g); }
    // villa: two white volumes + glass wall + roof slabs
    const white = this.M(0xf2efe9), glass = new THREE.MeshStandardMaterial({ color: 0x9cc8ff, roughness: 0.05, metalness: 0.4, emissive: 0xffe6b0, emissiveIntensity: 0.5, transparent: true, opacity: 0.55 });
    this.box(44, 7, 18, -24, 3.5, -44, white); this.box(30, 6, 16, -40, 9.5, -42, white); this.box(14, 6.4, 17.6, -5, 3.2, -43.8, glass); this.box(50, 0.8, 24, -26, 7.4, -44, this.M(0x2b2b33)); this.box(34, 0.8, 20, -40, 12.7, -42, this.M(0x2b2b33));
    for (let i = 0; i < 6; i++) this.box(3, 3.2, 0.2, -40 + i * 6, 9.6, -33.9, glass);
    C.addCollider(cx - 48, cx - 2, cz - 54, cz - 34);
    // sign over the gate
    const g = document.createElement('canvas'); g.width = 512; g.height = 128; const c = g.getContext('2d'); c.fillStyle = '#0a0a12'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#ffd23a'; c.font = '900 64px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ffb020'; c.shadowBlur = 20; c.fillText('VEGA ESTATE', 256, 66); const t = new THREE.CanvasTexture(g); t.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: t })); sg.position.set(x1 - 0.5, 5.5, cz - 6); sg.rotation.y = -Math.PI / 2; G.add(sg);
    // pool with animated water
    this.poolMat = new THREE.MeshStandardMaterial({ color: 0x19b8d8, roughness: 0.08, metalness: 0.1, emissive: 0x0a6a88, emissiveIntensity: 0.7, transparent: true, opacity: 0.92 });
    this.box(24, 0.35, 11, -22, 0.15, -14, this.M(0xdad7cf)); const water = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), this.poolMat); water.rotation.x = -Math.PI / 2; water.position.set(cx - 22, 0.36, cz - 14); G.add(water); C.addCollider(cx - 34, cx - 10, cz - 20, cz - 8);
    const PL = new THREE.PointLight(0x19e6ff, 14, 22); PL.position.set(cx - 22, 1.5, cz - 14); G.add(PL);
    // loungers + palms
    for (let k = 0; k < 4; k++) this.box(0.9, 0.35, 2.2, -30 + k * 3.2, 0.4, -22.5, this.M(0xffffff));
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 7, 7), leaf = new THREE.ConeGeometry(2.6, 1.2, 6), tg = [], lg = [];
    for (let k = 0; k < 26; k++) { const x = cx + rnd(-75, 60), z = cz + rnd(-92, -30 + (k % 2) * 110); if (Math.abs(x - (cx - 22)) < 16 && Math.abs(z - (cz - 14)) < 10) continue; if (x > cx - 52 && x < cx + 4 && z > cz - 56 && z < cz - 32) continue; const t1 = trunk.clone(); t1.translate(x, 3.5, z); tg.push(t1); for (let i = 0; i < 5; i++) { const l = leaf.clone(); l.rotateZ(Math.PI / 2 * 0.9); l.rotateY(i * 1.256); l.translate(x, 7.1, z); lg.push(l); } C.addCollider(x - 0.4, x + 0.4, z - 0.4, z + 0.4); }
    G.add(new THREE.Mesh(mergeGeometries(tg), this.M(0x6b5238, { roughness: 1 }))); G.add(new THREE.Mesh(mergeGeometries(lg), this.M(0x2e8b3d, { roughness: 0.9 })));
    // garage (south-west) with three supercars
    this.box(34, 5, 16, -42, 2.6, 38, this.M(0xd8d4cc)); this.box(34.6, 0.6, 16.6, -42, 5.3, 38, this.M(0x1d1d24)); C.addCollider(cx - 59.5, cx - 24.5, cz + 29.5, cz + 46.5);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(28, 3.8), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); door.position.set(cx - 42, 2.1, cz + 29.4); G.add(door);
    this.garageSpot = { x: cx - 42, z: cz + 25 };
    // recording studio (north-east of the lawn): black glass box with a neon edge
    this.box(18, 5, 14, 40, 2.6, -40, this.M(0x14141c)); this.box(18.2, 0.3, 14.2, 40, 5.2, -40, new THREE.MeshBasicMaterial({ color: 0xff2bd6 })); C.addCollider(cx + 30.5, cx + 49.5, cz - 47.5, cz - 32.5);
    // helipad
    const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32), this.M(0x30343c)); pad.rotation.x = -Math.PI / 2; pad.position.set(cx + 50, 0.1, cz + 60); G.add(pad); const hh = new THREE.Mesh(new THREE.RingGeometry(7.2, 7.7, 32), new THREE.MeshBasicMaterial({ color: 0xffffff })); hh.rotation.x = -Math.PI / 2; hh.position.set(cx + 50, 0.12, cz + 60); G.add(hh);
    // garden lamps + terrace light
    for (let k = 0; k < 14; k++) { const L = new THREE.PointLight(0xffd9a0, 6, 14); L.position.set(cx - 70 + k * 10, 2.2, cz - 4 + (k % 2) * 20); G.add(L); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a8 })); b.position.copy(L.position); G.add(b); }
    const warm = new THREE.PointLight(0xffe0b0, 30, 50); warm.position.set(cx - 24, 5, cz - 28); G.add(warm);
    this.start = { x: cx - 4, z: cz - 27 }; this.driveway = { x: cx + 20, z: cz + 8 };
  }
  async spawnFamily() {
    const mk = async (id, x, z, yaw, anim, key) => { const p = await spawnPerson(id); this.world.scene.add(p.root); p.root.position.set(this.cx + x, 0.1, this.cz + z); p.root.rotation.y = yaw; p.play(anim, { speed: 1 }); p.update(Math.random() * 3); this.npcs[key] = { p, x: this.cx + x, z: this.cz + z, yaw }; return p; };
    await mk('m1', -16, -25, 0.3, 'Talk', 'marcus');
    try { await mk('k_zoe', -26, -25, 0.5, 'Idle', 'zoe'); await mk('k_leo', -28, -23, 0.0, 'Idle', 'leo'); } catch (e) {}
    for (const [id, x, z, yaw, a] of [['doc_m', 18, -18, 2.4, 'Idle']]) { /* chef / staff placeholder */ }
  }
  update(dt) { this.t += dt; let dmin = 9999; for (const q of this.world.players) dmin = Math.min(dmin, Math.hypot(q.x() - this.cx, q.z() - this.cz)); const near = dmin < 300; for (const ch of this.group.children) { if (ch.isLight) { if (ch.userData.i0 === undefined) ch.userData.i0 = ch.intensity; ch.intensity = near ? ch.userData.i0 : 0; } else ch.visible = near; } for (const k in this.npcs) this.npcs[k].p.root.visible = dmin < 300; if (dmin >= 300) return; this.poolMat.emissiveIntensity = 0.6 + Math.sin(this.t * 1.7) * 0.15; for (const k in this.npcs) this.npcs[k].p.update(dt); const z = this.npcs.zoe, l = this.npcs.leo; if (z && l) { z.p.root.position.x = z.x + Math.sin(this.t * 0.8) * 2.5; l.p.root.position.z = l.z + Math.cos(this.t * 0.7) * 2.2; } }
  distance(x, z) { return Math.hypot(x - this.cx, z - this.cz); }
}
