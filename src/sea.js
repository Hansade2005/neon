// The Neon Sea: animated water east of the city, beach, pier with marina desk, lighthouse and buoys. Boats are driven by aero.Boat.
import * as THREE from 'three';
import { SEA, SEA_LEVEL, inSea } from './aero.js';
import { menuPanel, spend } from './menu.js';
const hyp = Math.hypot, rnd = (a, b) => a + Math.random() * (b - a);

export class Sea {
  constructor(world, gp) {
    this.world = world; this.gp = gp; this.t = 0; this.rented = null; this.rescueT = 0;
    const G = new THREE.Group(); this.group = G; world.scene.add(G);
    const cx = (SEA.x0 + SEA.x1) / 2, w = SEA.x1 - SEA.x0, d = SEA.z1 - SEA.z0;
    this.uT = { value: 0 };
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b4d7c, roughness: 0.12, metalness: 0.3, emissive: 0x03243d, emissiveIntensity: 0.9, transparent: true, opacity: 0.94 });
    mat.onBeforeCompile = sh => { sh.uniforms.uT = this.uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = vec3(position); float wx = position.x + ${cx.toFixed(1)}; float wz = -position.y; transformed.z += sin(wx*0.045+uT*1.3)*0.22 + sin(wz*0.06-uT*1.7)*0.16 + sin((wx+wz)*0.11+uT*2.3)*0.07;`); };
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 150, 150), mat); sea.rotation.x = -Math.PI / 2; sea.position.set(cx, SEA_LEVEL, 0); sea.frustumCulled = false; G.add(sea);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x082030, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, -6, 0); G.add(floor);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(90, d), new THREE.MeshStandardMaterial({ color: 0xc9b27c, roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(SEA.x0 - 45, 0.03, 0); G.add(sand);
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(14, d), new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 0.6 })); wet.rotation.x = -Math.PI / 2; wet.position.set(SEA.x0 - 7, 0.035, 0); G.add(wet);
    // pier
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
    this.pier = { x0: 950, x1: 1105, z: 150, hw: 4 };
    const deck = new THREE.Mesh(new THREE.BoxGeometry(155, 0.3, 8), wood); deck.position.set((950 + 1105) / 2, 1.25, 150); G.add(deck);
    for (let x = 960; x < 1105; x += 12) for (const dz of [-3.6, 3.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7, 8), dark); p.position.set(x, -1.8, 150 + dz); G.add(p); }
    for (let x = 970; x < 1105; x += 22) { const L = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); L.position.set(x, 3.1, 146); G.add(L); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), dark); pole.position.set(x, 2.2, 146); G.add(pole); }
    world.city.addCollider(950, 1105, 146, 154);   // hmm: pier is walkable; collider removed below
    world.city.colliders.pop();
    // marina shack
    const shack = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), new THREE.MeshStandardMaterial({ color: 0xeaeaf0, roughness: 0.8 })); shack.position.set(965, 2, 172); G.add(shack); world.city.addCollider(960, 970, 168, 176);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.4, 9), new THREE.MeshStandardMaterial({ color: 0x1b6ef3 })); roof.position.set(965, 4.2, 172); G.add(roof);
    const sg = this.sign('NEON MARINA', 'Boat rental · harbour patrol', '#19e6ff'); sg.position.set(965, 6.2, 167.8); sg.scale.setScalar(0.55); G.add(sg);
    world.pois.push({ x: 965, z: 160, color: '#19e6ff', r: 6 });
    // lighthouse
    const lh = new THREE.Group(); lh.position.set(1010, 0, -260); for (let i = 0; i < 6; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.2 - i * 0.35, 4.6 - i * 0.35, 7, 14), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd62828 : 0xf4f4f4, roughness: 0.8 })); seg.position.y = 3.5 + i * 7; lh.add(seg); }
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0 })); cab.position.y = 45; lh.add(cab);
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(14, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); this.beam.geometry.translate(0, -80, 0); this.beam.rotation.z = Math.PI / 2; this.beamPivot = new THREE.Group(); this.beamPivot.position.y = 45; this.beamPivot.add(this.beam); lh.add(this.beamPivot); G.add(lh);
    world.city.addCollider(1005, 1015, -265, -255); world.pois.push({ x: 1010, z: -260, color: '#fff2b0', r: 5 });
    // buoys
    this.buoys = []; for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff3030 : 0x30ff60 })); b.position.set(SEA.x0 + 60 + rnd(0, 1100), 0, rnd(-1000, 1000)); G.add(b); this.buoys.push(b); }
    // docked boats
    this.slips = [[1045, 142.2, 0], [1075, 142.2, 0], [1045, 157.8, 0], [1075, 157.8, 0]]; this.boats = [];
    (async () => { for (const [i, s] of this.slips.slice(0, 2).entries()) { const v = await world.addVehicle('marlin', s[0], s[1], Math.PI / 2, ['#ffffff', '#ffd23a'][i], 'parked'); v.keep = true; this.boats.push(v); } })();
    const rent = this.world.interiors ? null : null;
    gp.kiosks.push({ x: 968, z: 165.5, shop: false, custom: { prompt: 'F  Marina · rent a speedboat ($200)', action: p => this.rentMenu(p) } });
  }
  sign(text, sub, color) { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#08121c'; g.fillRect(0, 0, 1024, 256); g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 24; g.font = '900 118px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 105); g.shadowBlur = 6; g.font = '600 46px Arial'; g.fillStyle = '#e8eef4'; g.fillText(sub, 512, 205); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), new THREE.MeshBasicMaterial({ map: t })); }
  rentMenu(p) {
    menuPanel(this.gp, p, 'NEON MARINA', [['rent', 'Rent a Marlin 28 speedboat', '$200'], ['call', 'Call my boat to the pier', 'free']], async id => {
      if (id === 'rent') { if (!spend(p, 200)) return; await this.spawnBoat(); p.say('Your boat is at the pier. Drive it out to sea!', 3.5); } else { await this.spawnBoat(true); p.say('Boat brought to the pier.', 2.5); }
    });
  }
  async spawnBoat(free) {
    const W = this.world, used = this.slips.map(s => W.vehicles.some(v => v.id === 'marlin' && hyp(v.car.x - s[0], v.car.z - s[1]) < 6));
    const k = used.findIndex(u => !u); if (k < 0 && !free) { return; } const s = this.slips[k < 0 ? 2 : k];
    const v = await W.addVehicle('marlin', s[0], s[1], Math.PI / 2, ['#ffffff', '#19e6ff', '#ff5a7a'][(Math.random() * 3) | 0], 'parked'); v.keep = true; this.boats.push(v); return v;
  }
  depth(x, z) { if (!inSea(x, z)) return 0; if (x > this.pier.x0 && x < this.pier.x1 && Math.abs(z - this.pier.z) < this.pier.hw + 0.3) return 0; return Math.max(0, Math.min(1, (x - SEA.x0) / 12)); }
  update(dt) {
    this.t += dt; this.uT.value = this.t; this.beamPivot.rotation.y += dt * 0.7;
    for (const b of this.buoys) b.position.y = Math.sin(this.t * 1.3 + b.position.x * 0.05) * 0.2 + SEA_LEVEL + 0.1;
  }
}
