// Car catalogue, procedural car models (extruded body shells, glass, wheels, lights, drivers) and driving physics.
import * as THREE from 'three';

export const CARS = [
  // id, name, class, stats (topKmh, accel m/s², grip, mass kg), body parameters, price
  { id: 'meridian', name: 'Meridian LX', cls: 'Sedan', top: 205, acc: 7.5, grip: 1.0, mass: 1500, price: 0, body: { L: 4.85, W: 1.86, gc: 0.2, hf: 0.86, tr: 0.92, cf: 0.85, cr: -1.15, hr: 1.42, wr: 0.34, ww: 0.24, wb: 2.85, roofIn: 0.5, back: 0.55 }, paint: '#1d3557' },
  { id: 'orion', name: 'Orion RS', cls: 'Hot Hatch', top: 225, acc: 9.2, grip: 1.12, mass: 1250, price: 0, body: { L: 4.15, W: 1.82, gc: 0.19, hf: 0.82, tr: 1.05, cf: 0.72, cr: -1.65, hr: 1.42, wr: 0.335, ww: 0.24, wb: 2.6, roofIn: 0.4, back: 0.2, hatch: true, wing: 'small' }, paint: '#e63946' },
  { id: 'atlas', name: 'Atlas X', cls: 'SUV', top: 190, acc: 6.8, grip: 0.9, mass: 2100, price: 0, body: { L: 4.9, W: 1.98, gc: 0.28, hf: 1.08, tr: 1.2, cf: 0.95, cr: -1.95, hr: 1.78, wr: 0.4, ww: 0.28, wb: 2.9, roofIn: 0.35, back: 0.15, hatch: true, rails: true }, paint: '#2f3e46' },
  { id: 'kestrel', name: 'Kestrel S', cls: 'Sports Coupe', top: 265, acc: 10.5, grip: 1.25, mass: 1380, price: 18000, body: { L: 4.55, W: 1.9, gc: 0.14, hf: 0.78, tr: 0.88, cf: 0.45, cr: -1.0, hr: 1.28, wr: 0.345, ww: 0.28, wb: 2.7, roofIn: 0.7, back: 0.7, wing: 'duck', exhaust: 2 }, paint: '#ffb703' },
  { id: 'bulldog', name: 'Bulldog V8', cls: 'Muscle', top: 255, acc: 11.5, grip: 1.0, mass: 1750, price: 24000, body: { L: 4.95, W: 1.96, gc: 0.17, hf: 0.95, tr: 0.98, cf: 0.1, cr: -1.45, hr: 1.38, wr: 0.36, ww: 0.3, wb: 2.85, roofIn: 0.55, back: 0.35, scoop: true, stripes: true, exhaust: 2 }, paint: '#101820' },
  { id: 'fox', name: 'Rally Fox', cls: 'Rally', top: 240, acc: 10.2, grip: 1.3, mass: 1280, price: 30000, body: { L: 4.2, W: 1.84, gc: 0.25, hf: 0.9, tr: 1.08, cf: 0.74, cr: -1.6, hr: 1.46, wr: 0.36, ww: 0.26, wb: 2.6, roofIn: 0.42, back: 0.18, hatch: true, wing: 'big', scoop: true, lights: 'rally' }, paint: '#3a86ff' },
  { id: 'vanta', name: 'Vanta GT', cls: 'Supercar', top: 310, acc: 13.5, grip: 1.45, mass: 1450, price: 90000, body: { L: 4.6, W: 1.98, gc: 0.12, hf: 0.7, tr: 0.82, cf: 0.25, cr: -0.8, hr: 1.12, wr: 0.35, ww: 0.32, wb: 2.7, roofIn: 0.9, back: 0.9, wing: 'gt', exhaust: 4 }, paint: '#d00000' },
  { id: 'viper', name: 'Viper 600', cls: 'Motorcycle', top: 210, acc: 12.5, grip: 1.15, mass: 230, price: 0, bike: 'moto', body: { L: 2.1, W: 0.8, gc: 0.1, hf: 0.9, tr: 0.9, cf: 0.5, cr: -0.5, hr: 1.3, wr: 0.32, ww: 0.2, wb: 1.44, roofIn: 0.5, back: 0.5 }, paint: '#d00000' },
  { id: 'cruiser', name: 'City Cruiser', cls: 'Bicycle', top: 28, acc: 2.4, grip: 0.9, mass: 18, price: 0, bike: 'bicycle', body: { L: 1.75, W: 0.6, gc: 0.05, hf: 1.0, tr: 1.0, cf: 0.4, cr: -0.4, hr: 1.5, wr: 0.34, ww: 0.04, wb: 1.1, roofIn: 0.5, back: 0.5 }, paint: '#1b6ef3' },
  { id: 'phantom', name: 'Phantom X1', cls: 'Hypercar', top: 345, acc: 16.0, grip: 1.6, mass: 1350, price: 220000, body: { L: 4.7, W: 2.02, gc: 0.1, hf: 0.66, tr: 0.8, cf: 0.1, cr: -0.9, hr: 1.05, wr: 0.36, ww: 0.34, wb: 2.75, roofIn: 1.0, back: 1.0, wing: 'gt', exhaust: 2, glowStrip: true }, paint: '#f5f5f5' },
];
export const TRAFFIC_BODIES = ['meridian', 'orion', 'atlas', 'kestrel', 'meridian', 'orion'];
export const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));
export const PAINTS = [['Signal Red', '#d00000'], ['Midnight Blue', '#1d3557'], ['Solar Yellow', '#ffb703'], ['Pearl White', '#f1f1ee'], ['Obsidian', '#0d0d10'], ['Racing Green', '#0b6e4f'], ['Electric Blue', '#2f7bff'], ['Burnt Orange', '#ff6b1a'], ['Graphite', '#3b3f46'], ['Magenta', '#d6246e'], ['Mint', '#2ec4b6'], ['Violet', '#7b2cbf']];
export const GLOWS = [['None', null], ['Cyan', '#19e6ff'], ['Magenta', '#ff2bd6'], ['Lime', '#9dff3a'], ['Amber', '#ffb020']];

// ------------------------------------------------------------------ drivers (realistic humans from the character pipeline)
export const DRIVERS = [
  { id: 'd0', name: 'Marcus "Slate" Okoye', file: 'footballer_c', shirt: '#1b1d22', trousers: '#15171b', style: 'Black bomber jacket' },
  { id: 'd1', name: 'Elena Varga', file: 'footballer_f', shirt: '#7a1f2b', trousers: '#1a1c22', style: 'Burgundy racing jacket' },
  { id: 'd2', name: 'Kenji Arakawa', file: 'footballer_h', shirt: '#e9ecef', trousers: '#2a2d34', style: 'White shirt' },
  { id: 'd3', name: 'Dante Moreau', file: 'footballer_j', shirt: '#1d3557', trousers: '#16181d', style: 'Navy jacket' },
  { id: 'd4', name: 'Rafael "Rafa" Duarte', file: 'footballer_l', shirt: '#c9a227', trousers: '#1c1e24', style: 'Gold varsity jacket' },
  { id: 'd5', name: 'Idris Mbaye', file: 'footballer_n', shirt: '#2d6a4f', trousers: '#17191e', style: 'Olive overshirt' },
  { id: 'd6', name: 'Viktor Lind', file: 'footballer_b', shirt: '#6c757d', trousers: '#20232a', style: 'Grey hoodie' },
  { id: 'd7', name: 'Sasha Petrov', file: 'footballer_p', shirt: '#ff5d8f', trousers: '#1a1c22', style: 'Neon pink windbreaker' },
];

// ------------------------------------------------------------------ materials
export function makePaint(hex) { return new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 }); }
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0x07090d, metalness: 0.9, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.8 });
const blackMat = () => new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.55, metalness: 0.2 });
const chromeMat = () => new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.15, metalness: 1 });

function extrudeProfile(shape, width, bevel = 0.06) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 18 });
  g.rotateY(-Math.PI / 2); g.translate(width / 2 - bevel, 0, 0); g.computeVertexNormals(); return g;   // shape x -> car z (forward), extrusion -> car x
}

export function buildCarModel(spec, paintHex, opts = {}) {
  const b = spec.body, g = new THREE.Group(), paint = makePaint(paintHex || spec.paint), glass = glassMat(), black = blackMat(), chrome = chromeMat();
  const L = b.L, W = b.W, gc = b.gc;
  // --- lower body shell (side profile with wheel arches, sloped nose and tail)
  const hl = L / 2, R = b.wr + 0.075, zf = b.wb / 2, d0 = Math.sqrt(R * R - (b.wr - gc) * (b.wr - gc)), dl = Math.atan2(gc - b.wr, d0);
  const s = new THREE.Shape();
  s.moveTo(-hl + 0.25, gc + 0.02); s.lineTo(-zf - d0, gc + 0.02);
  s.absarc(-zf, b.wr, R, Math.PI - dl, dl, true);                                                    // rear arch
  s.lineTo(zf - d0, gc + 0.02); s.absarc(zf, b.wr, R, Math.PI - dl, dl, true);                       // front arch
  s.lineTo(hl - 0.22, gc + 0.02); s.quadraticCurveTo(hl, gc + 0.02, hl, gc + 0.26);                   // front bumper underside
  s.lineTo(hl - 0.01, b.hf - 0.34); s.quadraticCurveTo(hl - 0.04, b.hf - 0.17, hl - 0.5, b.hf - 0.08);   // nose
  s.quadraticCurveTo((hl + b.cf) / 2, b.hf - 0.02, b.cf, b.hf + 0.04);                                // bonnet rising to the windscreen
  s.lineTo(b.cr, b.tr + 0.02);                                                                         // beneath the cabin
  s.lineTo(-hl + 0.55, b.tr); s.quadraticCurveTo(-hl + 0.05, b.tr - 0.01, -hl, b.tr - 0.26);         // boot lid and tail
  s.lineTo(-hl, gc + 0.2); s.quadraticCurveTo(-hl, gc + 0.02, -hl + 0.25, gc + 0.02);
  const body = new THREE.Mesh(extrudeProfile(s, W, 0.09), paint); g.add(body);
  // dark inner arch fill + under-tray so the arches never show through
  for (const sz of [1, -1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * b.ww - 0.12, R + 0.04 - gc, R * 2), black); f.position.set(0, gc + (R - gc) / 2 + 0.02, sz * zf); g.add(f); }
  const tray = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.06, L - 0.5), black); tray.position.set(0, gc + 0.05, 0); g.add(tray);
  // --- greenhouse (glass) + roof panel + pillars
  const cw = W * 0.88, cab = new THREE.Shape();
  const windshieldTop = b.cf - (b.hr - b.hf) / 1.25, rearTop = b.cr + (b.hr - b.tr) / (b.back > 0.6 ? 1.0 : b.hatch ? 2.4 : 1.5);
  cab.moveTo(b.cf, b.hf + 0.04); cab.lineTo(windshieldTop, b.hr); cab.lineTo(rearTop, b.hr); cab.lineTo(b.cr, b.tr + 0.02); cab.lineTo(b.cf, b.hf + 0.04);
  g.add(new THREE.Mesh(extrudeProfile(cab, cw - 0.04, 0.03), glass));
  const roof = new THREE.Shape(); roof.moveTo(windshieldTop + 0.02, b.hr - 0.05); roof.lineTo(rearTop - 0.02, b.hr - 0.05); roof.lineTo(rearTop - 0.05, b.hr + 0.03); roof.lineTo(windshieldTop + 0.07, b.hr + 0.03); roof.closePath();
  g.add(new THREE.Mesh(extrudeProfile(roof, cw, 0.04), paint));
  const quad = (p0, p1, t) => { const dz = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dz, dy) || 1, nz = -dy / l * t, ny = dz / l * t; const q = new THREE.Shape(); q.moveTo(p0[0] - nz / 2, p0[1] - ny / 2); q.lineTo(p1[0] - nz / 2, p1[1] - ny / 2); q.lineTo(p1[0] + nz / 2, p1[1] + ny / 2); q.lineTo(p0[0] + nz / 2, p0[1] + ny / 2); q.closePath(); return q; };
  for (const sx of [-1, 1]) {
    const mk = (p0, p1, t, th = 0.07) => { const m = new THREE.Mesh(extrudeProfile(quad(p0, p1, t), th + 0.04, 0.02), paint); m.position.x = sx * (cw / 2 - th / 2 - 0.02); g.add(m); };
    mk([b.cf, b.hf + 0.04], [windshieldTop, b.hr], 0.09);                                               // A pillar
    mk([b.cr, b.tr + 0.02], [rearTop, b.hr], b.hatch ? 0.12 : 0.2);                                       // C pillar
    if (!b.hatch) mk([(b.cf + b.cr) / 2 - 0.15, b.hf + 0.02], [(b.cf + b.cr) / 2 - 0.15 - 0.1, b.hr], 0.07);   // B pillar
    // sill strip, door lines
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, (b.cf - b.cr) + 0.2), black); sill.position.set(sx * (W / 2 + 0.01), b.hf - 0.12, (b.cf + b.cr) / 2); g.add(sill);
    for (const zc of [b.cf - 0.15, (b.cf + b.cr) / 2 - 0.15, b.cr + 0.1]) { const dl2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, b.hf - 0.35 - gc, 0.012), black); dl2.position.set(sx * (W / 2 + 0.005), gc + (b.hf - 0.35 - gc) / 2 + 0.18, zc); g.add(dl2); }
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.16), chrome); hd.position.set(sx * (W / 2 + 0.012), b.hf - 0.02, (b.cf + b.cr) / 2 + 0.3); g.add(hd);
  }
  // --- sill / diffuser / splitter (black trim)
  const trim = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), black); m.position.set(x, y, z); g.add(m); return m; };
  trim(W * 0.9, 0.08, 0.5, 0, gc + 0.07, hl - 0.34); trim(W * 0.9, 0.12, 0.4, 0, gc + 0.08, -hl + 0.3);
  
  // grille & intakes
  const gr = trim(W * 0.5, 0.16, 0.05, 0, gc + 0.36, hl - 0.01); gr.material = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.4, metalness: 0.6 });
  if (b.lights !== 'none') for (const sx of [-1, 1]) {
    const hlm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.11, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 2.2 })); hlm.position.set(sx * (W / 2 - 0.42), b.hf - 0.19, hl - 0.04); hlm.rotation.y = sx * 0.12; g.add(hlm); (g.userData.head ||= []).push(hlm);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.08), new THREE.MeshBasicMaterial({ color: 0xbfe6ff })); drl.position.set(sx * (W / 2 - 0.42), b.hf - 0.28, hl - 0.015); g.add(drl);
    if (b.lights === 'rally') { const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 })); fl.rotation.x = Math.PI / 2; fl.position.set(sx * 0.32, b.hf - 0.1, hl + 0.02); g.add(fl); }
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0xff1010, emissiveIntensity: 0.9 }); g.userData.tail = tailMat;
  const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.1, 0.06), tailMat); tl.position.set(0, b.tr - 0.13, -hl + 0.01); g.add(tl);
  for (const sx of [-1, 1]) { const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat); t2.position.set(sx * (W / 2 - 0.3), b.tr - 0.15, -hl + 0.02); g.add(t2); }
  // mirrors
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.1), paint); m.position.set(sx * (cw / 2 + 0.11), b.hf + 0.2, b.cf - 0.15); g.add(m); }
  // exhausts
  const ex = b.exhaust || 0; for (let k = 0; k < ex; k++) { const ox = ex === 4 ? [-0.5, -0.3, 0.3, 0.5][k] : ex === 2 ? [-0.45, 0.45][k] : 0; const e = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), chrome); e.rotation.x = Math.PI / 2; e.position.set(ox, gc + 0.18, -hl - 0.02); g.add(e); }
  // wings, scoops, stripes, roof rails
  const wing = b.wing; if (wing) {
    const wy = wing === 'small' ? b.tr + 0.28 : wing === 'duck' ? b.tr + 0.1 : b.tr + 0.45, ww = wing === 'small' ? W * 0.8 : W * 0.96;
    const w = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.05, wing === 'duck' ? 0.3 : 0.4), paint); w.position.set(0, wy, -hl + 0.3); w.rotation.x = 0.08; g.add(w);
    if (wing !== 'duck') for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, wy - b.tr + 0.04, 0.2), black); st.position.set(sx * ww * 0.36, (wy + b.tr) / 2, -hl + 0.3); g.add(st); }
  }
  if (b.scoop) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.7), black); sc.position.set(0, b.hf + 0.1, (b.cf + hl) / 2 - 0.1); g.add(sc); }
  if (b.stripes) for (const sx of [-0.18, 0.18]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, L * 0.98), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 })); st.position.set(sx * 1.0, b.hf + 0.075 - (0), 0); st.scale.z = 0.5; st.position.z = 0.3; g.add(st); }
  if (b.rails) for (const sx of [-1, 1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.4), black); rl.position.set(sx * cw * 0.45, b.hr + 0.1, (windshieldTop + rearTop) / 2); g.add(rl); }
  if (b.glowStrip) { const gs = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x19e6ff })); gs.position.set(0, b.hf - 0.3, hl + 0.02); g.add(gs); }
  // wheels
  g.userData.wheels = [];
  const tire = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.85 }), rimM = new THREE.MeshStandardMaterial({ color: opts.rim || 0xb9bec6, roughness: 0.22, metalness: 1 });
  for (const sz of [1, -1]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(), spin = new THREE.Group(); pivot.position.set(sx * (W / 2 - b.ww / 2 + 0.01), b.wr, sz * b.wb / 2); pivot.add(spin);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(b.wr, b.wr, b.ww, 28), tire); t.rotation.z = Math.PI / 2; spin.add(t);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(b.wr * 0.72, b.wr * 0.72, b.ww + 0.01, 24), rimM); rim.rotation.z = Math.PI / 2; spin.add(rim);
    const dark = new THREE.Mesh(new THREE.CylinderGeometry(b.wr * 0.55, b.wr * 0.55, b.ww + 0.02, 20), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6 })); dark.rotation.z = Math.PI / 2; spin.add(dark);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(b.ww + 0.03, b.wr * 0.58, b.wr * 0.12), rimM); sp.rotation.x = k * Math.PI * 2 / 5; sp.position.set(0, 0, 0); const holder = new THREE.Group(); holder.rotation.x = k * Math.PI * 2 / 5; sp.rotation.x = 0; sp.position.y = b.wr * 0.34; holder.add(sp); spin.add(holder); }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(b.wr * 0.5, b.wr * 0.5, 0.03, 18), new THREE.MeshStandardMaterial({ color: 0x777b82, roughness: 0.4, metalness: 0.9 })); disc.rotation.z = Math.PI / 2; disc.position.x = -sx * (b.ww / 2 - 0.05); spin.add(disc);
    g.add(pivot); g.userData.wheels.push({ pivot, spin, front: sz > 0 });
  }
  // shadow blob
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, L * 1.25), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.85 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.025; g.add(sh); g.userData.shadow = sh;
  // underglow
  if (opts.glow) { const ug = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, L * 1.35), new THREE.MeshBasicMaterial({ map: glowTex(), color: opts.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 })); ug.rotation.x = -Math.PI / 2; ug.position.y = 0.04; g.add(ug); }
  // interior: dashboard, seats, steering wheel, driver
  const inter = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9 });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.9, 0.26, 0.5), inter); dash.position.set(0, b.hf + 0.12, b.cf - 0.3); g.add(dash);
  const seatZ = (b.cf + b.cr) / 2 - 0.05; for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), inter); st.position.set(sx * 0.4, b.tr - 0.05, seatZ); g.add(st); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.1), inter); bk.position.set(sx * 0.4, b.tr + 0.2, seatZ - 0.3); bk.rotation.x = -0.15; g.add(bk); }
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 20), black); sw.position.set(0.4, b.hf + 0.28, b.cf - 0.52); sw.rotation.x = -1.0; g.add(sw); g.userData.wheelMesh = sw;
  g.userData.seat = new THREE.Vector3(0.4, b.tr + 0.02, seatZ); g.userData.spec = spec; g.userData.W = W; g.userData.L = L;
  g.userData.headY = b.hf - 0.16; g.userData.hl = hl;
  return g;
}
let _sh, _gl;
function shadowTex() { if (_sh) return _sh; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 8, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(0.6, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); _sh = new THREE.CanvasTexture(c); return _sh; }
function glowTex() { if (_gl) return _gl; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); _gl = new THREE.CanvasTexture(c); return _gl; }

// police livery variant of the sedan
export function buildPoliceModel() {
  const spec = { ...CAR_BY_ID.meridian, body: { ...CAR_BY_ID.meridian.body, lights: 'police' } };
  const g = buildCarModel(spec, '#f4f4f4');
  const dark = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.4, metalness: 0.5 })); dark.position.set(0, 0.62, 1.05); dark.scale.set(1, 1, 1); dark.visible = false;
  // door livery bands
  for (const sx of [-1, 1]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.38, 2.4), new THREE.MeshStandardMaterial({ color: 0x0f2d6b, roughness: 0.4 })); band.position.set(sx * 0.935, 0.62, -0.1); g.add(band); }
  const bar = new THREE.Group(); bar.position.set(0, 1.5, -0.15);
  const mk = (c, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.2), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.1 })); m.position.x = x; bar.add(m); return m; };
  g.userData.lightR = [mk(0xff1020, -0.25), mk(0xff1020, -0.55)]; g.userData.lightB = [mk(0x1030ff, 0.25), mk(0x1030ff, 0.55)]; g.add(bar); g.userData.police = true; return g;
}

// ------------------------------------------------------------------ driver figure (GLB character seated in the car)
let _loaderPromise = null;
export async function loadDriver(driver, gltfLoader, base) {
  const gltf = await gltfLoader.loadAsync(`${base}${driver.file}.glb`);
  const root = gltf.scene; root.traverse(o => {
    if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); const n = o.material.name; if (n === 'Shirt') { o.material.map = null; o.material.color.set(driver.shirt); o.material.roughness = 0.75; } else if (n === 'Shorts' || n === 'Socks' || n === 'Boots') { o.material.map = null; o.material.color.set(driver.trousers); } } }
  });
  return root;
}
// pose the rig into a seated driving position (arms to the wheel, thighs forward)
export function poseSeated(root) {
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const rot = (n, x, y, z) => { const b = bones[n]; if (b) b.rotation.set(x, y, z); };
  rot('thigh_l', -1.45, 0.08, 0); rot('thigh_r', -1.45, -0.08, 0); rot('calf_l', 1.5, 0, 0); rot('calf_r', 1.5, 0, 0); rot('foot_l', -0.2, 0, 0); rot('foot_r', -0.2, 0, 0);
  rot('upperarm_l', -0.2, 0, -0.9); rot('upperarm_r', -0.2, 0, 0.9); rot('lowerarm_l', -1.1, 0, 0); rot('lowerarm_r', -1.1, 0, 0);
  rot('spine_01', 0.12, 0, 0); rot('spine_02', 0.05, 0, 0); rot('head', -0.12, 0, 0);
  return bones;
}

// ------------------------------------------------------------------ physics
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Car {
  constructor(spec, x, z, heading) {
    this.spec = spec; this.x = x; this.z = z; this.h = heading; this.vx = 0; this.vz = 0; this.yaw = 0; this.steer = 0; this.y = 0; this.vy = 0;
    this.speed = 0; this.fwd = 0; this.lat = 0; this.rpm = 0.2; this.gear = 1; this.nitro = 1; this.nitroOn = false; this.slip = 0; this.drift = 0; this.braking = false; this.reversing = false;
    this.wheelSpin = 0; this.health = 100; this.hitCD = 0; this.pitch = 0; this.roll = 0; this.mass = spec.mass; this.radius = spec.body.W / 2; this.len = spec.body.L; this.onSidewalk = false; this.smoke = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0 };
  }
  get kmh() { return Math.abs(this.fwd) * 3.6; }
  step(dt) {
    const s = this.spec, I = this.input, c = Math.cos(this.h), sn = Math.sin(this.h);
    const fx = sn, fz = c, rx = c, rz = -sn;                                    // forward / right-in-world (x of local lateral axis)
    this.fwd = this.vx * fx + this.vz * fz; this.lat = this.vx * rx + this.vz * rz;
    const top = s.top / 3.6, damaged = 1 - Math.max(0, (35 - this.health)) / 100;
    // engine & brakes
    let acc = 0; const boost = I.nitro && this.nitro > 0.02 && this.fwd > 3 ? 1.55 : 1; this.nitroOn = boost > 1;
    if (this.nitroOn) this.nitro = Math.max(0, this.nitro - dt * 0.22); else if (!I.nitro) this.nitro = Math.min(1, this.nitro + dt * 0.04);
    const vmax = top * boost * damaged;
    if (I.throttle > 0.01) {
      if (this.fwd > -0.5) { const f = clamp(1 - Math.pow(Math.max(0, this.fwd) / vmax, 2.2), 0, 1); acc = I.throttle * s.acc * (0.55 + 0.9 * f) * boost * (this.fwd < 4 ? 1.15 : 1) * f; }
      else acc = I.throttle * 14;                                               // brake out of reverse
    }
    if (I.brake > 0.01) { if (this.fwd > 1.5) acc -= I.brake * 18 * (0.9 + s.grip * 0.25); else { const f = clamp(1 - Math.pow(Math.max(0, -this.fwd) / (top * 0.22), 2), 0, 1); acc -= I.brake * s.acc * 0.55 * f; } }
    this.braking = I.brake > 0.01 && this.fwd > 1.5; this.reversing = this.fwd < -0.5 && I.brake > 0.01;
    const drag = 0.0016 * this.fwd * Math.abs(this.fwd) + 0.35 * this.fwd * 0.02 + 0.015 * this.fwd;
    if (!I.throttle && !I.brake) acc -= Math.sign(this.fwd) * Math.min(Math.abs(this.fwd), 1.6) * 0.9;
    acc -= drag;
    // steering: speed-sensitive lock, smoothed
    const sp = Math.abs(this.fwd), lock = 0.62 / (1 + sp * 0.075) + 0.045; const target = I.steer * lock;
    this.steer += (target - this.steer) * clamp(dt * (sp > 3 ? 9 : 6), 0, 1);
    // grip: reduced by handbrake and when sliding hard; handbrake kicks the rear out
    const hand = I.hand; const gripBase = 10.5 * s.grip * (this.onSidewalk ? 0.8 : 1);
    const slideFactor = clamp(Math.abs(this.lat) / (6 + sp * 0.22), 0, 1);
    const grip = gripBase * (1 - 0.62 * slideFactor) * (1 - 0.78 * hand);
    this.lat *= Math.exp(-grip * dt);
    // longitudinal update in local frame
    this.fwd += acc * dt;
    if (hand > 0.5 && !I.throttle && Math.abs(this.fwd) < 2.5) { this.fwd *= Math.exp(-6 * dt); this.lat *= Math.exp(-6 * dt); }
    if (hand > 0.5) this.fwd *= Math.exp(-0.25 * dt);
    // yaw: bicycle model + extra rotation when drifting
    const wheelbase = s.body.wb, yawTarget = (this.fwd * Math.tan(this.steer)) / wheelbase * (1 + 0.55 * hand) * (1 + 0.15 * slideFactor);
    this.yaw += (yawTarget - this.yaw) * clamp(dt * (hand > 0.5 ? 4 : 9), 0, 1);
    if (hand > 0.5 && sp > 5) this.yaw += this.steer * 0.5 * dt * Math.min(1, sp / 15);
    this.h += this.yaw * dt;
    // rebuild world velocity from local components (with the new heading)
    const c2 = Math.cos(this.h), s2 = Math.sin(this.h);
    this.vx = s2 * this.fwd + c2 * this.lat; this.vz = c2 * this.fwd - s2 * this.lat;
    this.x += this.vx * dt; this.z += this.vz * dt;
    // body motion
    this.speed = Math.hypot(this.vx, this.vz); this.slip = Math.abs(this.lat);
    this.drift = clamp((Math.abs(this.lat) - 2.2) / 8, 0, 1) * (this.speed > 8 ? 1 : 0);
    const tgtY = this.onSidewalk ? 0.14 : 0; this.vy += ((tgtY - this.y) * 120 - this.vy * 14) * dt; this.y += this.vy * dt;
    this.pitch += ((-(acc) * 0.0085) - this.pitch) * clamp(dt * 6, 0, 1); this.roll += ((this.lat * 0.004 + this.steer * this.fwd * 0.0035) - this.roll) * clamp(dt * 6, 0, 1);
    // gearbox / rpm
    const ratio = clamp(Math.abs(this.fwd) / (top * 1.0), 0, 1.1), gears = 6, g = Math.min(gears, 1 + Math.floor(ratio * gears * 0.93)); const gl = (g - 1) / gears, gh = g / gears * 1.02;
    this.gear = this.fwd < -0.5 ? -1 : (Math.abs(this.fwd) < 0.5 && !I.throttle ? 0 : g);
    const tr = clamp((ratio - gl) / (gh - gl), 0, 1); this.rpm += ((I.throttle > 0.1 || Math.abs(this.fwd) > 1 ? 0.28 + 0.7 * tr : 0.18) + (this.nitroOn ? 0.05 : 0) - this.rpm) * clamp(dt * 10, 0, 1);
    this.wheelSpin += this.fwd / (this.spec.body.wr) * dt; this.hitCD = Math.max(0, this.hitCD - dt);
    this.smoke = this.health < 35 ? (35 - this.health) / 35 : 0;
  }
  // apply an impact along normal (nx,nz) pointing away from the obstacle
  bounce(nx, nz, restitution = 0.35) {
    const vn = this.vx * nx + this.vz * nz; if (vn >= 0) return 0;
    this.vx -= (1 + restitution) * vn * nx; this.vz -= (1 + restitution) * vn * nz; this.vx *= 0.97; this.vz *= 0.97; return -vn;
  }
}
