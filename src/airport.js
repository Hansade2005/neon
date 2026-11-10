// Neon International Airport, west of the city: runway, taxiway, apron, terminal, tower, hangar, parked aircraft and the aviation desk.
import * as THREE from 'three';
import { menuPanel, spend } from './menu.js';
const hyp = Math.hypot;
export const AIR = { x: -1000, z: 0, rwHalf: 260, rwW: 42 };

export class Airport {
  constructor(world, gp) {
    this.world = world; this.gp = gp; this.t = 0; const G = new THREE.Group(); this.group = G; world.scene.add(G); const C = world.city, A = AIR;
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.9 });
    // runway texture: edge lines, dashed centre line, threshold stripes, numbers
    const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#2a2c31'; g.fillRect(0, 0, 2048, 256);
    for (let i = 0; i < 60000; i++) { g.fillStyle = `rgba(${(Math.random() * 40 + 20) | 0},${(Math.random() * 40 + 20) | 0},${(Math.random() * 40 + 24) | 0},.35)`; g.fillRect(Math.random() * 2048, Math.random() * 256, 2, 2); }
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 10, 2048, 5); g.fillRect(0, 241, 2048, 5); for (let x = 150; x < 1900; x += 120) g.fillRect(x, 124, 64, 8);
    for (const x0 of [30, 2018 - 100]) for (let k = 0; k < 8; k++) g.fillRect(x0, 40 + k * 22, 70, 10);
    g.save(); g.fillStyle = '#f2f2f2'; g.font = '900 90px Arial'; g.textAlign = 'center'; g.translate(230, 128); g.rotate(Math.PI / 2); g.fillText('09', 0, 30); g.restore(); g.save(); g.font = '900 90px Arial'; g.textAlign = 'center'; g.translate(1818, 128); g.rotate(-Math.PI / 2); g.fillText('27', 0, 30); g.restore();
    const rt = new THREE.CanvasTexture(c); rt.colorSpace = THREE.SRGBColorSpace; rt.anisotropy = 8;
    const run = new THREE.Mesh(new THREE.PlaneGeometry(A.rwHalf * 2, A.rwW), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9 })); run.rotation.x = -Math.PI / 2; run.position.set(A.x, 0.05, A.z); G.add(run);
    const taxi = new THREE.Mesh(new THREE.PlaneGeometry(A.rwHalf * 1.6, 16), asphalt); taxi.rotation.x = -Math.PI / 2; taxi.position.set(A.x, 0.04, A.z + 58); G.add(taxi);
    for (const dx of [-110, 110]) { const stub = new THREE.Mesh(new THREE.PlaneGeometry(16, 60), asphalt); stub.rotation.x = -Math.PI / 2; stub.position.set(A.x + dx, 0.04, A.z + 30); G.add(stub); }
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(190, 90), new THREE.MeshStandardMaterial({ color: 0x4a4d54, roughness: 0.9 })); apron.rotation.x = -Math.PI / 2; apron.position.set(A.x, 0.04, A.z + 112); G.add(apron);
    const line = new THREE.MeshBasicMaterial({ color: 0xffd23a }); for (const dx of [-60, 0, 60]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 40), line); l.rotation.x = -Math.PI / 2; l.position.set(A.x + dx, 0.06, A.z + 100); G.add(l); }
    // helipad
    const hp = new THREE.Mesh(new THREE.CircleGeometry(11, 32), new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.8 })); hp.rotation.x = -Math.PI / 2; hp.position.set(A.x + 80, 0.07, A.z + 118); G.add(hp);
    const hc = document.createElement('canvas'); hc.width = hc.height = 256; const hg = hc.getContext('2d'); hg.strokeStyle = '#fff'; hg.lineWidth = 10; hg.beginPath(); hg.arc(128, 128, 116, 0, 7); hg.stroke(); hg.fillStyle = '#fff'; hg.font = '900 150px Arial'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText('H', 128, 138); const ht = new THREE.CanvasTexture(hc); const hm = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ map: ht, transparent: true })); hm.rotation.x = -Math.PI / 2; hm.position.set(A.x + 80, 0.09, A.z + 118); G.add(hm);
    // terminal
    const M = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, ...o });
    const term = new THREE.Mesh(new THREE.BoxGeometry(80, 12, 24), M(0xdfe3e8)); term.position.set(A.x, 6, A.z + 172); G.add(term); C.addCollider(A.x - 40, A.x + 40, A.z + 160, A.z + 184);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(72, 7, 0.5), new THREE.MeshStandardMaterial({ color: 0x9cd8ff, roughness: 0.05, metalness: 0.5, emissive: 0xffe6b0, emissiveIntensity: 0.55, transparent: true, opacity: 0.8 })); glass.position.set(A.x, 5, A.z + 159.6); G.add(glass);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(84, 0.8, 30), M(0x1b6ef3)); roof.position.set(A.x, 12.4, A.z + 170); G.add(roof);
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 160; const sg = sc.getContext('2d'); sg.fillStyle = '#0a1018'; sg.fillRect(0, 0, 1024, 160); sg.fillStyle = '#19e6ff'; sg.shadowColor = '#19e6ff'; sg.shadowBlur = 22; sg.font = '900 74px Arial'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('NEON INTERNATIONAL', 512, 62); sg.font = '600 40px Arial'; sg.fillStyle = '#e8eef4'; sg.fillText('AIRPORT · DEPARTURES · AVIATION DESK', 512, 126);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(40, 6.2), new THREE.MeshBasicMaterial({ map: st })); sign.position.set(A.x, 15.6, A.z + 159.2); G.add(sign);
    // tower
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 30, 14), M(0xf2f2f2)); tw.position.set(A.x + 62, 15, A.z + 150); G.add(tw); C.addCollider(A.x + 58, A.x + 66, A.z + 146, A.z + 154);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(6, 5, 5, 14), new THREE.MeshStandardMaterial({ color: 0x9cd8ff, roughness: 0.05, metalness: 0.5, emissive: 0x335577, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })); cab.position.set(A.x + 62, 32.5, A.z + 150); G.add(cab);
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.6, 14), M(0x2a2c31)); cr.position.set(A.x + 62, 35.3, A.z + 150); G.add(cr);
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); this.beacon.position.set(A.x + 62, 37, A.z + 150); G.add(this.beacon);
    // hangar
    const hg2 = new THREE.Mesh(new THREE.BoxGeometry(46, 15, 34), M(0x3a3f48, { metalness: 0.4 })); hg2.position.set(A.x - 100, 7.5, A.z + 150); G.add(hg2); C.addCollider(A.x - 123, A.x - 77, A.z + 133, A.z + 167);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(34, 11, 0.4), M(0x1b1d22)); hd.position.set(A.x - 100, 5.8, A.z + 132.7); G.add(hd);
    // windsock + runway lights
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 9, 6), M(0xdddddd)); pole.position.set(A.x + 30, 4.5, A.z - 40); G.add(pole);
    this.sock = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xff7a00, side: THREE.DoubleSide })); this.sock.position.set(A.x + 32, 8.7, A.z - 40); this.sock.rotation.z = -Math.PI / 2; G.add(this.sock);
    const lights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 130); let n = 0, m = new THREE.Matrix4();
    for (let x = -A.rwHalf; x <= A.rwHalf; x += 20) for (const dz of [-A.rwW / 2 - 1, A.rwW / 2 + 1]) { m.setPosition(A.x + x, 0.2, A.z + dz); lights.setMatrixAt(n++, m); }
    for (let x = -A.rwHalf - 120; x < -A.rwHalf; x += 20) { m.setPosition(A.x + x, 0.2, A.z); lights.setMatrixAt(n++, m); } for (let x = A.rwHalf + 20; x <= A.rwHalf + 120; x += 20) { m.setPosition(A.x + x, 0.2, A.z); lights.setMatrixAt(n++, m); }
    lights.count = n; G.add(lights);
    this.warm = { intensity: 0 };
    world.pois.push({ x: A.x, z: A.z + 140, color: '#ffffff', r: 7 }); world.pois.push({ x: A.x, z: A.z, color: '#888c94', r: 4 });
    // aircraft
    this.craft = []; (async () => { for (const [id, dx, dz, h] of [['skylark', -50, 108, Math.PI / 2], ['skylark', -10, 108, Math.PI / 2], ['hornet', 80, 118, 0]]) { const v = await world.addVehicle(id, A.x + dx, A.z + dz, h, id === 'skylark' ? null : null, 'parked'); v.keep = true; this.craft.push(v); } })();
    gp.kiosks.push({ x: A.x, z: A.z + 156.5, shop: false, custom: { prompt: 'F  Aviation desk · aircraft rental', action: p => this.desk(p) } });
  }
  desk(p) {
    menuPanel(this.gp, p, 'NEON AVIATION', [['plane', 'Bring a Skylark SR-2 to the apron', '$300'], ['heli', 'Bring a Hornet H1 to the helipad', '$500'], ['tips', 'Flight guide (free)', '']], async id => {
      if (id === 'tips') { p.say('W/S throttle · A/D turn · SPACE climb · SHIFT dive. Take off at ~100 km/h. Helicopter: W forward, SPACE up, SHIFT down.', 7); return; }
      const cost = id === 'plane' ? 300 : 500; if (!spend(p, cost)) return; const A = AIR, W = this.world;
      const spot = id === 'plane' ? [A.x - 30 + Math.random() * 60, A.z + 110, Math.PI / 2, 'skylark'] : [A.x + 80, A.z + 118, 0, 'hornet'];
      if (W.vehicles.some(v => v.craft && !v.exploded && hyp(v.car.x - spot[0], v.car.z - spot[1]) < 9)) { p.say('The pad is occupied.', 2); p.cash += cost; return; }
      const v = await W.addVehicle(spot[3], spot[0], spot[1], spot[2], null, 'parked'); v.keep = true; p.say(`${v.car.spec.name} is ready.`, 3);
    });
  }
  update(dt) {
    this.t += dt; this.beacon.visible = Math.sin(this.t * 4) > 0; this.sock.rotation.y = Math.sin(this.t * 0.4) * 0.4;
    let d = 1e9; for (const p of this.world.players) d = Math.min(d, hyp(p.x() - AIR.x, p.z() - AIR.z)); this.group.visible = d < 1400 && !this.world.potato; this.warm.intensity = d < 400 ? 60 : 0;
  }
}
