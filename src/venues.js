// Venues: the Neon Club (open-air party plaza with DJ, dance floor, light show, bar and a dancing crowd).
import * as THREE from 'three';
import { spawnPerson, CAST, clips } from './people.js';
import { createVehicle } from './vehicle.js';
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];

function signTexture(text, c1, c2) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#05030a'; g.fillRect(0, 0, 1024, 256);
  g.font = '900 150px Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = c1; g.shadowBlur = 40; g.fillStyle = c1; g.fillText(text, 512, 132); g.shadowColor = c2; g.shadowBlur = 20; g.strokeStyle = c2; g.lineWidth = 6; g.strokeText(text, 512, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class Club {
  constructor(world, cx, cz) {
    this.world = world; this.cx = cx; this.cz = cz; this.t = 0; this.lights = []; this.beams = []; this.crowd = []; this.group = new THREE.Group(); world.scene.add(this.group);
    const G = this.group, box = (w, h, d, x, y, z, color, em) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, emissive: em || 0x000000, emissiveIntensity: em ? 1.2 : 0 })); m.position.set(cx + x, y, cz + z); G.add(m); return m; };
    // back building + sign (north edge of the block)
    box(54, 13, 14, 0, 6.7, -24, 0x14121c); const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshBasicMaterial({ map: signTexture('NEON CLUB', '#ff2bd6', '#19e6ff') })); sign.position.set(cx, 11, cz - 16.9); G.add(sign);
    for (const x of [-20, 20]) { const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 9), new THREE.MeshBasicMaterial({ color: x < 0 ? 0xff2bd6 : 0x19e6ff })); s2.position.set(cx + x, 6, cz - 16.9); G.add(s2); }
    world.city.addCollider(cx - 27, cx + 27, cz - 31, cz - 17);
    // dance floor (animated tiles)
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = `hsl(${(i * 40 + j * 25) % 360},90%,50%)`; g.fillRect(i * 32, j * 32, 30, 30); }
    const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace; this.floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: ft, emissiveIntensity: 0.9, roughness: 0.25 });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), this.floorMat); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.2, cz - 2); G.add(fl);
    // DJ booth + speakers
    box(8, 1.2, 2.2, 0, 0.8, -12, 0x1a1a24, 0x2200aa); box(4, 0.15, 1.2, 0, 1.5, -12, 0x222233, 0x19e6ff);
    for (const x of [-9, 9]) { box(2.4, 4.6, 2.2, x, 2.5, -12.5, 0x0d0d12); const w = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20), new THREE.MeshBasicMaterial({ color: 0x333344 })); w.position.set(cx + x, 3.7, cz - 11.35); G.add(w); const w2 = w.clone(); w2.position.y = 1.9; w2.scale.setScalar(1.05); G.add(w2); this.speaker = w; }
    world.city.addCollider(cx - 12, cx + 12, cz - 14.5, cz - 10.8);
    // bar counter along the east side with stools and bottles
    box(2.2, 1.2, 14, 22, 0.8, 2, 0x3a2418); box(2.6, 0.12, 14.4, 22, 1.42, 2, 0x8a5a2e, 0x331a00); for (let k = 0; k < 7; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0xaa2244 })); st.position.set(cx + 19.6, 0.55, cz - 4 + k * 2); G.add(st); }
    for (let k = 0; k < 14; k++) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5), emissive: 0x111111, transparent: true, opacity: 0.85 })); bt.position.set(cx + 22, 1.72, cz - 4.5 + k * 1); G.add(bt); }
    world.city.addCollider(cx + 20.7, cx + 23.5, cz - 6, cz + 10);
    // lounge tables on the west side
    for (let k = 0; k < 4; k++) { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.0, 16), new THREE.MeshStandardMaterial({ color: 0x20202c, emissive: 0x220033 })); tb.position.set(cx - 21, 0.7, cz - 4 + k * 4.5); G.add(tb); world.city.addCollider(cx - 22, cx - 20, cz - 5 + k * 4.5, cz - 3 + k * 4.5); for (const a of [0, 2.1, 4.2]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x6a1b9a })); ch.position.set(cx - 21 + Math.cos(a) * 1.6, 0.45, cz - 4 + k * 4.5 + Math.sin(a) * 1.6); G.add(ch); } }
    // string lights over the plaza
    for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(k / 14, 1, 0.6) })); b.position.set(cx - 26 + k * 4, 6.2 + Math.sin(k) * 0.25, cz + 6); G.add(b); }
    // moving coloured lights + volumetric beams
    for (let k = 0; k < 2; k++) { const L = new THREE.PointLight(new THREE.Color().setHSL(k / 2 + 0.1, 1, 0.55), 36, 40); L.position.set(cx - 8 + k * 16, 7, cz - 4); G.add(L); this.lights.push(L);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 16, 16, 1, true), new THREE.MeshBasicMaterial({ color: L.color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.geometry.translate(0, -8, 0); beam.position.copy(L.position); G.add(beam); this.beams.push(beam); }
    this.spawnCrowd();
  }
  async spawnCrowd() {
    const all = await clips(), dances = ['Dance1', 'Dance2'].filter(n => all[n]), dance = dances.length ? dances[0] : null;
    for (let k = 0; k < 16; k++) {
      const person = await spawnPerson(pick(CAST).id), x = this.cx + rnd(-10, 10), z = this.cz + rnd(-9, 3); this.world.scene.add(person.root);
      person.root.position.set(x, 0.2, z); person.root.rotation.y = Math.atan2(this.cx - x, this.cz - 12 - z) + (Math.random() - 0.5) * 0.5;
      person.play(dances.length ? pick(dances) : pick(['Talk', 'Idle', 'Phone']), { speed: rnd(0.9, 1.4) }); person.update(Math.random() * 3); this.crowd.push({ person, phase: Math.random() * 6, base: person.root.position.y, dance: !!dance });
    }
    for (let k = 0; k < 5; k++) { const person = await spawnPerson(pick(CAST).id), z = this.cz - 4 + k * 2.4; this.world.scene.add(person.root); person.root.position.set(this.cx + 19.4, 0.5, z); person.root.rotation.y = -Math.PI / 2; person.play(pick(['Talk', 'SitTalk', 'Phone']), { speed: 1 }); person.update(Math.random() * 2); this.crowd.push({ person, phase: 0, base: 0.5, dance: true, still: true }); }
  }
  update(dt) {
    this.t += dt; const t = this.t; let dmin = 9999; for (const q of this.world.players) dmin = Math.min(dmin, Math.hypot(q.x() - this.cx, q.z() - this.cz)); this.group.visible = dmin < 260; if (dmin >= 260) return;
    this.floorMat.emissiveIntensity = 0.65 + 0.35 * Math.sin(t * 6); this.floorMat.emissiveMap.offset.x = (Math.floor(t * 2) % 8) / 8;
    this.lights.forEach((L, i) => { L.color.setHSL((t * 0.25 + i * 0.25) % 1, 1, 0.55); L.position.x = this.cx - 10 + Math.sin(t * 0.8 + i * 1.6) * 10; this.beams[i].material.color.copy(L.color); this.beams[i].position.copy(L.position); this.beams[i].rotation.z = Math.sin(t * 1.3 + i) * 0.55; this.beams[i].rotation.x = Math.cos(t * 0.9 + i) * 0.4; });
    for (const c of this.crowd) { c.person.update(dt); if (!c.still && !c.dance) { c.person.root.position.y = c.base + Math.abs(Math.sin(t * 7 + c.phase)) * 0.07; c.person.root.rotation.y += Math.sin(t * 2 + c.phase) * dt * 0.4; } }
    if (this.speaker) this.speaker.scale.setScalar(1 + Math.abs(Math.sin(t * 7)) * 0.12);
  }
  distance(x, z) { return Math.hypot(x - this.cx, z - this.cz); }
}

class Building {
  constructor(world, cx, cz, o) {
    this.world = world; this.cx = cx; this.cz = cz; this.t = 0; this.staff = []; this.group = new THREE.Group(); world.scene.add(this.group); const G = this.group;
    const box = (w, h, d, x, y, z, color, em, ei = 1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, emissive: em || 0, emissiveIntensity: em ? ei : 0 })); m.position.set(cx + x, y, cz + z); G.add(m); return m; };
    const tw = new THREE.MeshStandardMaterial({ color: o.wall, roughness: 0.6 }); box(46, o.h, 20, 0, o.h / 2 + 0.16, -19, o.wall);
    // window bands
    for (let r = 0; r < Math.floor(o.h / 4) - 1; r++) box(44, 1.6, 0.2, 0, 4.2 + r * 4, -8.95, 0x1b2a40, 0xffe9a8, 0.55);
    // entrance canopy + glass doors
    box(14, 0.5, 6, 0, 5.2, -6.5, o.accent, o.accent, 0.5); box(7.5, 4.2, 0.3, 0, 2.3, -8.95, 0x203040, 0xbfe6ff, 0.5); for (const x of [-6, 6]) box(0.5, 5, 0.5, x, 2.6, -4.5, 0x777777);
    // sign
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 5.5), new THREE.MeshBasicMaterial({ map: this.sign(o) })); sign.position.set(cx, o.h - 3, cz - 8.8); G.add(sign);
    world.city.addCollider(cx - 23, cx + 23, cz - 29, cz - 9); this.entrance = { x: cx, z: cz - 4 };
    // plaza lights
    for (const x of [-12, 12]) { const L = new THREE.PointLight(o.light, 12, 28); L.position.set(cx + x, 5, cz - 2); G.add(L); }
    this.lights = [];
  }
  sign(o) { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = o.signBg; g.fillRect(0, 0, 1024, 256); g.fillStyle = o.signFg; g.font = '900 108px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.title, 560, 130); if (o.cross) { g.fillStyle = '#ff2b2b'; g.fillRect(70, 100, 140, 52); g.fillRect(114, 56, 52, 140); } else { g.fillStyle = o.signFg; g.beginPath(); g.moveTo(140, 40); g.lineTo(215, 70); g.lineTo(210, 150); g.lineTo(140, 210); g.lineTo(70, 150); g.lineTo(65, 70); g.closePath(); g.fill(); g.fillStyle = o.signBg; g.font = '900 80px Arial'; g.fillText('★', 140, 125); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  async spawnStaff(list) { for (const [id, dx, dz, yaw, anim] of list) { const person = await spawnPerson(id); this.world.scene.add(person.root); person.root.position.set(this.cx + dx, 0.16, this.cz + dz); person.root.rotation.y = yaw; person.play(anim, { speed: 0.9 + Math.random() * 0.2 }); person.update(Math.random() * 3); this.staff.push(person); } }
  update(dt) { this.t += dt; let dmin = 9999; for (const q of this.world.players) dmin = Math.min(dmin, Math.hypot(q.x() - this.cx, q.z() - this.cz)); this.group.visible = dmin < 260; if (dmin < 260) for (const p of this.staff) p.update(dt); for (const p of this.staff) p.root.visible = dmin < 260; }
  distance(x, z) { return Math.hypot(x - this.cx, z - this.cz); }
}
export class Hospital extends Building {
  constructor(world, cx, cz) { super(world, cx, cz, { wall: 0xe8edf2, h: 20, accent: 0x2dd4a8, light: 0x8fe8ff, signBg: '#f4f7fa', signFg: '#0a3b66', title: 'NEON GENERAL', cross: true });
    this.spawnStaff([['doc_m', -4, -2, 0.4, 'Talk'], ['doc_f', -2.5, -1.6, -0.9, 'Talk'], ['medic_m', 6, -3, 3.4, 'Idle'], ['doc_f', 9, -2, 2.4, 'Phone'], ['doc_m', -9, -3, 0.2, 'Idle']]); }
}
export class Station extends Building {
  constructor(world, cx, cz) { super(world, cx, cz, { wall: 0x2b3550, h: 16, accent: 0x2f5bff, light: 0x4d7bff, signBg: '#0b1230', signFg: '#e8f0ff', title: 'NEON POLICE', cross: false });
    this.spawnStaff([['cop_m', -5, -2, 0.3, 'Talk'], ['cop_f', -3.2, -1.7, -0.9, 'Talk'], ['cop_m', 8, -3, 3.4, 'Idle'], ['cop_f', 11, -2, 3.0, 'Phone']]);
    this.cars = []; for (const [dx, dz, h] of [[-15, 4, 0], [15, 4, 0]]) createVehicle(world.scene, 'police', cx + dx, cz + dz, h, null).then(v => { v.kind = 'parked'; v.siren = false; world.vehicles.push(v); this.cars.push(v); }); }
}
