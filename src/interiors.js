// Enterable interiors: Neon Bank (with a vault heist), Neon Mart supermarket, Neon Bistro restaurant, Grand Hotel, Neon Fuel station.
// Each interior is a separate room built far outside the city; doors on the street teleport the player in and out.
import * as THREE from 'three';
import * as UI from './ui.js';
import { Audio } from './audio.js';
import { P, N } from './city.js';
import { spawnPerson } from './people.js';
import { spawnHostile } from './hostile.js';
import { saveGame } from './gameplay.js';
const hyp = Math.hypot, rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const BASE = { x: 2000, z: 2000 }, SIDE = 32;
const blockC = (i, j) => ({ x: (i + 0.5 - N / 2) * P, z: (j + 0.5 - N / 2) * P });

export class Interiors {
  constructor(world, gp) {
    this.world = world; this.gp = gp; this.list = []; this.t = 0; this.mats = {};
    const C = world.city;
    const defs = [
      { id: 'bank', name: 'NEON BANK', sub: 'Deposits · Withdrawals · Vault', color: '#19e6ff', block: [3, 3], w: 30, d: 22, h: 5.6, floor: 0xd8d4cc, wall: 0xe8e4da },
      { id: 'mart', name: 'NEON MART', sub: 'Supermarket · open 24h', color: '#7cff5a', block: [2, 4], w: 34, d: 24, h: 4.6, floor: 0xe6e8ea, wall: 0xf2f4f5 },
      { id: 'bistro', name: 'NEON BISTRO', sub: 'Fine dining', color: '#ffb020', block: [4, 4], w: 26, d: 20, h: 4.6, floor: 0x5a3b28, wall: 0x7a2a2a },
      { id: 'hotel', name: 'GRAND HOTEL', sub: 'Suites · Spa · Room service', color: '#ffd23a', block: [3, 5], w: 28, d: 22, h: 5.4, floor: 0xc8b48c, wall: 0xf0e6d0 },
      { id: 'fuel', name: 'NEON FUEL', sub: 'Gas · Snacks · 24h', color: '#ff4a3a', block: [5, 3], w: 16, d: 12, h: 4.0, floor: 0xcfd2d6, wall: 0xf4f4f4 },
    ];
    defs.forEach((d, k) => {
      const c = blockC(...d.block); d.door = { x: c.x, z: c.z + SIDE }; d.cx = BASE.x + k * 70; d.cz = BASE.z; d.npcs = []; d.cool = 0; d.state = 'idle'; this.build(d); this.exterior(d); this.list.push(d);
    });
    this.rm = document.createElement('div'); this.rm.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:15;transition:opacity .35s'; document.body.appendChild(this.rm);
    this.heist = null; this.roomL = []; for (let i = 0; i < 2; i++) { const L = new THREE.PointLight(0xfff0dc, 0, 30, 1.6); L.position.set(0, -50, 0); world.scene.add(L); this.roomL.push(L); } this.activeId = null;
  }
  lightRoom(d) { this.activeId = d ? d.id : null; this.roomL.forEach((L, i) => { if (d) { const sp = d.lightSpots[i]; L.position.set(sp.x, sp.y, sp.z); L.color.setHex(d.lightColor); L.intensity = d.lightI; L.distance = d.lightR; } else { L.intensity = 0; L.position.set(0, -50, 0); } }); }
  M(c, o = {}) { const k = c + JSON.stringify(o); return this.mats[k] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05, ...o }); }
  addK(x, z, prompt, action, r) { const k = { x, z, shop: false, custom: { prompt, action }, g: null, r }; this.gp.kiosks.push(k); return k; }
  sign(text, sub, color, w = 9, h = 2.2) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const g = c.getContext('2d'); g.fillStyle = '#08080e'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 28; g.font = '900 120px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, c.height * 0.42); g.shadowBlur = 8; g.font = '600 46px Arial'; g.fillStyle = '#e8e8f0'; g.fillText(sub, 512, c.height * 0.8);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }
  // ---------------------------------------------------------------- street entrance
  exterior(d) {
    const G = new THREE.Group(), x = d.door.x, z = d.door.z; this.world.scene.add(G);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.2, 0.7), this.M(0x14141c)); frame.position.set(x, 2.1, z); G.add(frame);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(d.color).multiplyScalar(0.5) })); glow.position.set(x, 1.7, z + 0.4); G.add(glow);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 2.2), this.M(new THREE.Color(d.color).getHex(), { emissive: new THREE.Color(d.color), emissiveIntensity: 0.35 })); aw.position.set(x, 3.9, z + 1.1); G.add(aw);
    const s = this.sign(d.name, d.sub, d.color); s.position.set(x, 6.3, z + 0.45); G.add(s);
    if (d.id === 'fuel') for (const dx of [-7, 7]) { const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.6), this.M(0xd03030)); pump.position.set(x + dx, 0.8, z + 3); G.add(pump); const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.7), this.M(0xffffff)); top.position.set(x + dx, 1.7, z + 3); G.add(top); this.world.city.addCollider(x + dx - 0.5, x + dx + 0.5, z + 2.6, z + 3.4); }
    this.world.pois.push({ x, z: z + 3, color: d.color, r: 5 });
    this.addK(x, z + 2.2, `F  Enter ${d.name}`, p => this.enter(p, d), 2.6);
  }
  // ---------------------------------------------------------------- room shell
  build(d) {
    const G = new THREE.Group(); G.visible = false; this.world.scene.add(G); d.group = G; const C = this.world.city, cx = d.cx, cz = d.cz, w = d.w, dd = d.d, h = d.h;
    d.B = (bw, bh, bd, x, y, z, mat, coll = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat); m.position.set(cx + x, y, cz + z); G.add(m); let c = null; if (coll) { c = { minX: cx + x - bw / 2, maxX: cx + x + bw / 2, minZ: cz + z - bd / 2, maxZ: cz + z + bd / 2 }; C.colliders.push(c); for (let gx = Math.floor(c.minX / 40); gx <= Math.floor(c.maxX / 40); gx++) for (let gz = Math.floor(c.minZ / 40); gz <= Math.floor(c.maxZ / 40); gz++) { const k = gx + ',' + gz; (C.grid.get(k) || C.grid.set(k, []).get(k)).push(c); } } m.userData.coll = c; return m; };
    const tc = document.createElement('canvas'); tc.width = tc.height = 128; const g = tc.getContext('2d'); const col = '#' + new THREE.Color(d.floor).getHexString(); g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); const ft = new THREE.CanvasTexture(tc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(w / 4, dd / 4); ft.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, dd), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.55, metalness: 0.0, emissive: new THREE.Color(d.floor), emissiveIntensity: 0.28 })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.03, cz); G.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, dd), this.M(0xf4f4f6, { roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, h, cz); G.add(ceil);
    const wm = this.M(d.wall, { roughness: 0.85 }); const wall = (pw, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, h), wm); m.position.set(cx + x, h / 2, cz + z); m.rotation.y = ry; G.add(m); };
    wall(w, 0, -dd / 2, 0); wall(w, 0, dd / 2, Math.PI); wall(dd, -w / 2, 0, Math.PI / 2); wall(dd, w / 2, 0, -Math.PI / 2);
    for (const [bw, bd, x, z] of [[w + 2, 1, 0, -dd / 2 - 0.5], [w + 2, 1, 0, dd / 2 + 0.5], [1, dd, -w / 2 - 0.5, 0], [1, dd, w / 2 + 0.5, 0]]) { const c = { minX: cx + x - bw / 2, maxX: cx + x + bw / 2, minZ: cz + z - bd / 2, maxZ: cz + z + bd / 2 }; C.colliders.push(c); for (let gx = Math.floor(c.minX / 40); gx <= Math.floor(c.maxX / 40); gx++) for (let gz = Math.floor(c.minZ / 40); gz <= Math.floor(c.maxZ / 40); gz++) { const k = gx + ',' + gz; (C.grid.get(k) || C.grid.set(k, []).get(k)).push(c); } }
    // ceiling light panels + point lights
    const lp = new THREE.MeshBasicMaterial({ color: 0xfff4e0 });
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) { const l = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, 0.08, dd * 0.14), lp); l.position.set(cx + i * w * 0.3, h - 0.06, cz + j * dd * 0.22); G.add(l); }
    d.lightSpots = [[-0.22, 0], [0.22, 0]].map(([lx, lz]) => ({ x: cx + lx * w, y: h - 0.6, z: cz + lz * dd })); d.lightColor = d.id === 'bistro' ? 0xffc890 : 0xfff0dc; d.lightI = d.id === 'bistro' ? 40 : 60; d.lightR = Math.max(w, dd) * 1.1;
    d.entry = { x: cx, z: cz + dd / 2 - 3 };
    const ex = this.addK(cx, cz + dd / 2 - 1.2, 'F  Exit to street', p => this.leave(p, d), 2.4); const mark = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(d.color).multiplyScalar(0.7) })); mark.position.set(cx, 0.06, cz + dd / 2 - 1.2); G.add(mark);
    const sg = this.sign(d.name, d.sub, d.color, 7, 1.8); sg.position.set(cx, h - 1.3, cz - dd / 2 + 0.05); G.add(sg);
    this['fit_' + d.id](d);
  }
  async npc(d, id, x, z, yaw, anim, y = 0.04) { try { const p = await spawnPerson(id); d.group.add(p.root); p.root.position.set(d.cx + x, y, d.cz + z); p.root.rotation.y = yaw; p.play(anim, { speed: rnd(0.9, 1.1) }); p.update(Math.random() * 2); d.npcs.push(p); return p; } catch (e) { return null; } }
  // ---------------------------------------------------------------- BANK
  fit_bank(d) {
    const B = d.B, cx = d.cx, cz = d.cz, M = this.M.bind(this);
    B(20, 1.1, 1.2, 0, 0.55, -2, M(0x3a2a1e)); B(20, 0.08, 1.4, 0, 1.12, -2, M(0x1a1a22, { metalness: 0.5 })); const gl = new THREE.Mesh(new THREE.BoxGeometry(20, 1.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.25, roughness: 0.05 })); gl.position.set(cx, 1.8, cz - 2.4); d.group.add(gl);
    B(30, 3.2, 0.3, 0, 1.6, -10.8, M(0x1c2a36)); for (const x of [-7, 0, 7]) B(2.4, 0.1, 0.9, x, 1.2, -1.4, M(0x111118), false);
    for (let i = 0; i < 3; i++) B(2.6, 0.5, 0.9, -9 + i * 4, 0.25, 5, M(0x5a3b28)); for (const x of [-12, 12]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 12), M(0x4a3a2a)); pl.position.set(cx + x, 0.5, cz + 6); d.group.add(pl); const lf = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), M(0x2e8b3d)); lf.position.set(cx + x, 1.6, cz + 6); d.group.add(lf); }
    // vault enclosure (north-east corner)
    const steel = M(0x6a7078, { metalness: 0.8, roughness: 0.3 });
    B(8, 4.4, 0.6, 10.5, 2.2, -10.4, steel); B(0.6, 4.4, 8, 6.8, 2.2, -7.4, steel, true); B(0.6, 4.4, 8, 14.2, 2.2, -7.4, steel, true); B(2.8, 4.4, 0.6, 8.0, 2.2, -3.6, steel); B(2.8, 4.4, 0.6, 13.2, 2.2, -3.6, steel); B(8, 0.6, 7, 10.5, 4.7, -7.2, steel, false);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32), M(0x9aa0a8, { metalness: 0.9, roughness: 0.2 })); door.rotation.x = Math.PI / 2; door.position.set(cx + 10.6, 1.7, cz - 3.6); d.group.add(door); const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 20), M(0xd8c060, { metalness: 0.9 })); wheel.position.set(cx + 10.6, 1.7, cz - 3.3); d.group.add(wheel);
    d.vaultDoor = door; d.vaultColl = B(3.0, 3.4, 0.5, 10.6, 1.7, -3.6, steel, true).userData.coll; d.vaultDoor.userData.open = 0;
    const cash = M(0x2f7a3a); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) B(0.9, 0.35 + i * 0.01, 0.5, 8.4 + i * 1.0, 0.2, -9.6 + j * 0.0, cash, false).position.y = 0.2 + j * 0.37;
    d.bags = []; for (let i = 0; i < 4; i++) { const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), M(0xc9b26a, { roughness: 0.9 })); bag.scale.y = 0.8; bag.position.set(cx + 8.4 + i * 1.5, 0.35, cz - 6.2 + (i % 2) * 1.6); bag.visible = false; d.group.add(bag); d.bags.push({ mesh: bag, got: false, k: null }); }
    d.alarmLight = { intensity: 0 };
    // staff + guards
    this.npc(d, 'f2', -7, -3.5, 0, 'Idle'); this.npc(d, 'm2', 0, -3.5, 0, 'Talk'); this.npc(d, 'f5', 7, -3.5, 0, 'Idle'); this.npc(d, 'm4', -6, 4, 2.4, 'Phone'); this.npc(d, 'f3', 4, 5.5, -2.5, 'Idle');
    d.guardSpecs = [[-9, 0], [5, 3]]; d.guards = [];
    this.addK(cx, cz + 0.2, 'F  Bank teller', p => this.gp.panelFor(p, 'atm'), 2.6);
    this.addK(cx + 10.6, cz - 1.4, 'F  Crack the vault', p => this.heistAction(p, d), 2.6);
    d.bags.forEach((b, i) => { b.k = this.addK(b.mesh.position.x, b.mesh.position.z, 'F  Grab the cash', p => this.grabBag(p, d, b), 1.8); b.k.off = true; });
  }
  async startGuards(d) { if (d.guards.length) return; for (const [x, z] of d.guardSpecs) { const g = await spawnHostile(this.world, 'rex', d.cx + x, d.cz + z, { hp: 110, aggro: 0, dmg: 8, speed: 3.1, parent: d.group }); d.guards.push(g); } }
  heistAction(p, d) {
    if (d.state === 'open' || d.state === 'drill') { p.say(d.state === 'drill' ? 'Stay close, the drill is working…' : 'The vault is open!', 2); return; } if (d.state === 'done') { p.say('The vault is empty. Come back later.', 2.5); return; }
    if (!p.hasPistol) { p.say('You need a weapon to rob this bank. Buy a pistol at a Neon Mart ATM.', 3.5); Audio.sfx.deny && Audio.sfx.deny(); return; }
    d.state = 'drill'; d.drill = 0; this.heist = { p, d, loot: 0 }; this.gp.addHeat(p, 2.2); p.say('ALARM! Hold position until the drill finishes!', 3.5); this.startGuards(d).then(() => { for (const g of d.guards) g.aggro = 60; });
  }
  grabBag(p, d, b) { if (b.got) return; b.got = true; b.mesh.visible = false; b.k.off = true; const v = Math.round(rnd(3200, 6500) / 100) * 100; p.cash = (p.cash || 0) + v; if (this.heist) this.heist.loot += v; p.say(`+$${v}`, 1.8); Audio.sfx.cash && Audio.sfx.cash(); if (d.bags.every(x => x.got)) { d.state = 'escape'; p.say('That\'s everything. Get out!', 3); } }
  // ---------------------------------------------------------------- MART
  fit_mart(d) {
    const B = d.B, M = this.M.bind(this), prod = [0xe63946, 0xffb703, 0x2a9d8f, 0x4361ee, 0xf1faee, 0xff7a00];
    for (let r = 0; r < 4; r++) for (const x of [-12, -5, 2, 9]) { if (r === 3 && x > 0) continue; const z = -8 + r * 3.1; B(5.6, 0.12, 0.9, x + 1.5, 0.12, z, M(0x888c94)); B(5.6, 1.9, 0.8, x + 1.5, 1.1, z, M(0xb8bcc4)); for (let k = 0; k < 6; k++) B(0.8, 0.22, 0.7, x - 0.9 + k * 0.92, 1.0 + (k % 2) * 0.5, z, M(prod[(r + k) % 6]), false); }
    for (let k = 0; k < 6; k++) { B(0.9, 2.0, 2.0, -16.4, 1.05, -9 + k * 2.2, M(0x1c2a36)); const g = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.7), new THREE.MeshBasicMaterial({ color: 0x9be8ff })); g.position.set(d.cx - 15.9, 1.1, d.cz - 9 + k * 2.2); g.rotation.y = Math.PI / 2; d.group.add(g); }
    for (const x of [4, 10]) { B(1.0, 1.0, 2.6, x + 8, 0.5, 6, M(0x2b2f36)); B(0.2, 0.5, 0.2, x + 8, 1.3, 6.4, M(0xffd23a), false); }
    this.npc(d, 'm3', 12, 6, Math.PI, 'Idle'); this.npc(d, 'f3', 18, 6, Math.PI, 'Talk'); this.npc(d, 'f6', -4, -3, 1.2, 'Phone'); this.npc(d, 'm6', 6, -6, -1, 'Idle');
    this.addK(d.cx + 9.6, d.cz + 5, 'F  Checkout · buy supplies', p => this.gp.panelFor(p, 'shop'), 2.8);
    this.addK(d.cx + 15.2, d.cz + 5, 'F  Rob the register (pistol)', p => this.robRegister(p, d), 2.8);
  }
  robRegister(p, d) { if (d.cool > 0) { p.say('The register is empty.', 2); return; } if (!p.hasPistol) { p.say('You need a weapon for that.', 2.5); return; } d.cool = 150; const v = Math.round(rnd(250, 900)); p.cash = (p.cash || 0) + v; this.gp.addHeat(p, 1.3); p.say(`HOLD-UP  +$${v}  — the clerk hit the alarm!`, 3.5); Audio.sfx.cash && Audio.sfx.cash(); }
  // ---------------------------------------------------------------- BISTRO
  fit_bistro(d) {
    const B = d.B, M = this.M.bind(this), cloth = M(0xf4efe6), wood = M(0x4a2f1c);
    const spots = [[-8, -5], [-1, -5], [6, -5], [-8, 1], [-1, 1], [6, 1]];
    spots.forEach(([x, z], i) => { B(1.6, 0.9, 1.6, x, 0.45, z, cloth); const can = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 })); can.position.set(d.cx + x, 1.0, d.cz + z); d.group.add(can); for (const [dx, dz] of [[-1.3, 0], [1.3, 0]]) B(0.6, 0.5, 0.6, x + dx, 0.25, z + dz, wood, false); if (i % 2 === 0) { this.npc(d, pick(['f1', 'f4', 'f5']), x - 1.3, z, Math.PI / 2, 'SitTalk', 0.12); this.npc(d, pick(['m2', 'm4', 'm6']), x + 1.3, z, -Math.PI / 2, 'SitTalk', 0.12); } });
    B(9, 1.1, 1.2, 5, 0.55, -9.2, M(0x2b1d12)); this.npc(d, 'm5', 4, -10, 0, 'Talk'); this.npc(d, 'm2', -4, 7, Math.PI, 'Idle');
    B(1.4, 1.2, 0.7, 2, 0.6, 6.5, wood);
    this.addK(d.cx + 2, d.cz + 5.4, 'F  Host stand · order a meal', p => this.menu(p, 'NEON BISTRO', [['pasta', 'Pasta della casa', '$30  +60 HP'], ['steak', 'Prime steak', '$60  +100 HP'], ['dessert', 'Tiramisu', '$15  +15 HP'], ['coffee', 'Espresso', '$5  +5 HP']], id => { const t = { pasta: [30, 60], steak: [60, 100], dessert: [15, 15], coffee: [5, 5] }[id]; if (!this.spend(p, t[0])) return; p.hp = Math.min(100, p.hp + t[1]); p.say('Delicious!', 1.8); }), 2.8);
  }
  // ---------------------------------------------------------------- HOTEL
  fit_hotel(d) {
    const B = d.B, M = this.M.bind(this);
    B(9, 1.2, 1.4, 0, 0.6, -6, M(0x3a2a1e)); B(9.2, 0.1, 1.6, 0, 1.25, -6, M(0xd8c060, { metalness: 0.7 })); this.npc(d, 'f6', 0, -7.4, 0, 'Talk');
    for (const x of [-9, 9]) { B(4.2, 0.55, 1.4, x, 0.28, 2, M(0x6a1b2a)); B(4.2, 0.7, 0.35, x, 0.8, 1.4, M(0x6a1b2a), false); }
    B(3, 0.4, 3, -9, 0.2, 7, M(0x4a3a2a)); B(3, 0.4, 3, 9, 0.2, 7, M(0x4a3a2a));
    for (const x of [-4, 4]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), M(0x2e8b3d)); lf.position.set(d.cx + x, 1.8, d.cz + 4); d.group.add(lf); B(0.5, 0.9, 0.5, x, 0.45, 4, M(0x5a4a3a)); }
    B(4.0, 4.0, 0.2, -11, 2.0, -10.8, M(0x888e98, { metalness: 0.8 }), false); B(4.0, 4.0, 0.2, 11, 2.0, -10.8, M(0x888e98, { metalness: 0.8 }), false);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.4, 0.8, 12), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); ch.position.set(d.cx, d.h - 0.9, d.cz); d.group.add(ch);
    this.npc(d, 'm1', 9, 3.2, Math.PI / 2, 'SitTalk', 0.12);
    this.addK(d.cx, d.cz - 4.4, 'F  Reception · rent a room', p => this.menu(p, 'GRAND HOTEL', [['sleep', 'Rent a suite: sleep & save', '$120  full HP'], ['spa', 'Spa treatment', '$80  +50 HP, +25 armor'], ['service', 'Room service', '$40  +40 HP']], id => { if (id === 'sleep') { if (!this.spend(p, 120)) return; this.fadeOut(() => { p.hp = 100; saveGame(p); p.say('You slept well. Game saved.', 3); }); } else if (id === 'spa') { if (!this.spend(p, 80)) return; p.hp = Math.min(100, p.hp + 50); p.armor = Math.min(100, (p.armor || 0) + 25); p.say('Relaxed and ready.', 2); } else { if (!this.spend(p, 40)) return; p.hp = Math.min(100, p.hp + 40); p.say('Bon appétit!', 2); } }), 2.8);
  }
  // ---------------------------------------------------------------- FUEL STATION
  fit_fuel(d) {
    const B = d.B, M = this.M.bind(this);
    B(6, 1.1, 1.2, -4, 0.55, -2, M(0x2b2f36)); for (let k = 0; k < 3; k++) { B(0.8, 1.9, 4, 6.5, 1.0, -3 + k * 2.6, M(0xb8bcc4)); for (let q = 0; q < 4; q++) B(0.6, 0.2, 0.5, 6.4, 0.7 + q * 0.4, -3 + k * 2.6, M([0xe63946, 0xffb703, 0x4361ee, 0x2a9d8f][q]), false); }
    B(1.2, 2.0, 2.2, -7.2, 1.0, -4, M(0x1c2a36)); this.npc(d, 'm6', -4, -3.4, 0, 'Idle');
    this.addK(d.cx - 4, d.cz - 0.6, 'F  Counter · snacks & supplies', p => this.gp.panelFor(p, 'shop'), 2.8);
    this.addK(d.cx - 1.5, d.cz - 0.6, 'F  Rob the register (pistol)', p => this.robRegister(p, d), 2.4);
  }
  // ---------------------------------------------------------------- shared UI + flow
  spend(p, amt) { if ((p.cash || 0) < amt) { p.say('Not enough cash', 1.8); Audio.sfx.deny && Audio.sfx.deny(); return false; } p.cash -= amt; Audio.sfx.cash && Audio.sfx.cash(); return true; }
  menu(p, title, rows, pick) {
    const g = this.gp; UI.panel(`<div class="screen small" style="width:560px"><div class="logo"><b style="font-size:36px">${title}</b></div><div class="bal"><div>CASH <b>$${Math.round(p.cash || 0)}</b></div><div>HP <b>${Math.round(p.hp)}</b></div><div>ARMOR <b>${Math.round(p.armor || 0)}</b></div></div><div class="menu">${rows.map(r => `<div class="it row" data-i="${r[0]}"><span>${r[1]}</span><b>${r[2] || ''}</b></div>`).join('')}<div class="it" data-i="close">CLOSE</div></div></div>`,
      id => { if (id === 'close') { UI.closePanel(); g.onPanelClose && g.onPanelClose(); return; } pick(id); this.menu(p, title, rows, pick); }, () => { UI.closePanel(); g.onPanelClose && g.onPanelClose(); });
    g.onPanelOpen && g.onPanelOpen();
  }
  fadeOut(mid) { this.rm.style.opacity = 1; setTimeout(() => { mid && mid(); this.rm.style.opacity = 0; }, 450); }
  enter(p, d) {
    if (p.state !== 'foot') return; this.fadeOut(() => { p.interior = d.id; d.group.visible = true; this.lightRoom(d); p.pos.set(d.entry.x, 0.1, d.entry.z); p.yaw = Math.PI; p.cam.yaw = Math.PI; p.cam.snap = true; p.person.play('Idle'); p.say(d.name, 2); });
  }
  leave(p, d) {
    if (d.id === 'bank' && this.heist && this.heist.p === p && d.state !== 'idle') { const L = this.heist.loot; if (L > 0) { p.say(`HEIST COMPLETE  — you got away with $${L}`, 4); d.state = 'done'; d.cool = 300; } else d.state = 'idle'; this.heist = null; p.jobText = ''; for (const g of d.guards) g.aggro = 0; d.alarmLight.intensity = 0; }
    this.fadeOut(() => { p.interior = null; if (!this.world.players.some(q => q.interior)) this.lightRoom(null); p.pos.set(d.door.x, 0.1, d.door.z + 4.5); p.yaw = 0; p.cam.yaw = 0; p.cam.snap = true; p.person.play('Idle'); this.recheck(d); });
  }
  recheck(d) { if (!this.world.players.some(q => q.interior === d.id)) d.group.visible = false; }
  update(dt) {
    this.t += dt;
    for (const d of this.list) {
      if (d.cool > 0) { d.cool -= dt; if (d.cool <= 0 && d.id === 'bank' && d.state === 'done') { d.state = 'idle'; for (const b of d.bags) { b.got = false; b.mesh.visible = false; b.k.off = true; } d.vaultColl.minX = d.cx + 9.1; d.vaultColl.maxX = d.cx + 12.1; d.vaultDoor.position.y = 1.7; d.vaultDoor.userData.open = 0; } }
      if (!d.group.visible) continue; for (const n of d.npcs) n.update(dt);
      if (d.id === 'bank') {
        d.alarmLight.intensity = d.state === 'drill' || d.state === 'open' || d.state === 'escape' ? 14 + Math.sin(this.t * 9) * 12 : 0;
        if (this.activeId === 'bank') { const l = this.roomL[1]; if (d.alarmLight.intensity > 0) { l.color.setHex(0xff2020); l.intensity = d.alarmLight.intensity * 1.5; } else { l.color.setHex(d.lightColor); l.intensity = d.lightI; } }
        const H = this.heist; if (H && d.state === 'drill') { const dist = hyp(H.p.pos.x - (d.cx + 10.6), H.p.pos.z - (d.cz - 3.6)); if (dist < 7) d.drill += dt; H.p.jobText = `DRILLING THE VAULT  ${Math.min(100, Math.round(d.drill / 16 * 100))}%${dist >= 7 ? '  (get back to the door!)' : ''}`; if (d.drill >= 16) { d.state = 'open'; d.vaultColl.minX = d.vaultColl.maxX = d.vaultColl.minZ = d.vaultColl.maxZ = -99999; d.vaultDoor.userData.open = 1; for (const b of d.bags) { b.mesh.visible = true; b.k.off = false; } H.p.jobText = ''; H.p.say('The vault is open! Grab the cash!', 3); } }
        if (d.vaultDoor.userData.open && d.vaultDoor.position.y < 4.6) d.vaultDoor.position.y += dt * 2.0;
        if (H && (d.state === 'open' || d.state === 'escape')) H.p.jobText = d.state === 'escape' ? 'ESCAPE! Run for the exit!' : `GRAB THE CASH  ${d.bags.filter(b => b.got).length}/4`;
        if (H && H.p.hp <= 0) { this.heist = null; d.state = 'idle'; }
      }
    }
    for (const p of this.world.players) if (p.interior) { const d = this.list.find(x => x.id === p.interior); if (!d || hyp(p.pos.x - d.cx, p.pos.z - d.cz) > 40) { p.interior = null; if (d) this.recheck(d); if (this.heist && this.heist.p === p) { this.heist.d.state = 'idle'; this.heist = null; p.jobText = ''; } } }
  }
}
