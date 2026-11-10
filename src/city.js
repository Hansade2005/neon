// Procedural modern city: grid of roads, lit towers, parks, lamps, traffic lights, sky and weather.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const N = 8;            // blocks per side
export const P = 84;           // road-to-road pitch (m)
export const RW = 18;          // road width
export const HALF = N * P / 2; // city half extent between outer road centre lines
export const LANES = [2.5, 5.9];

export function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const nodePos = (i, j) => ({ x: (i - N / 2) * P, z: (j - N / 2) * P });
export function onRoad(x, z) {
  const u = x / P + N / 2, v = z / P + N / 2, ru = Math.round(u), rv = Math.round(v);
  if (ru >= 0 && ru <= N && Math.abs(u - ru) * P < RW / 2 + 0.2 && v > -0.2 && v < N + 0.2) return true;
  if (rv >= 0 && rv <= N && Math.abs(v - rv) * P < RW / 2 + 0.2 && u > -0.2 && u < N + 0.2) return true;
  return false;
}
// direction vectors: 0:+x 1:+z 2:-x 3:-z
export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
// right-hand traffic lane centre offset for a car heading in dir d on the road through node (i,j)
export function laneCoord(d, lane, i, j) {
  const o = LANES[lane], n = nodePos(i, j);
  if (d === 0) return { fixed: 'z', v: n.z + o };   // heading +x: right is +z
  if (d === 2) return { fixed: 'z', v: n.z - o };
  if (d === 1) return { fixed: 'x', v: n.x - o };   // heading +z: right is -x
  return { fixed: 'x', v: n.x + o };
}

const TIME_PRESETS = {
  night: { sky: [0x02030a, 0x101a3a, 0x3a2358], fog: 0x0b1024, fogD: 0.0021, hemi: [0x40507a, 0x14161f, 0.55], sun: [0x8fa6ff, 0.5], win: 1.5, lamp: 1, lights: true, exp: 1.0, star: 1, env: 0.28 },
  dusk:  { sky: [0x1a1b3a, 0xc2557a, 0xffa56a], fog: 0x6a4260, fogD: 0.0013, hemi: [0xb48aa0, 0x2a2330, 0.8], sun: [0xff9d5c, 1.3], win: 0.9, lamp: 0.8, lights: true, exp: 1.0, star: 0.2, env: 0.55 },
  day:   { sky: [0x2f78d8, 0x8cc3f0, 0xe7f1fa], fog: 0xbcd4ea, fogD: 0.0008, hemi: [0xdfeaff, 0x6c6a5e, 1.0], sun: [0xfff2dc, 2.6], win: 0.0, lamp: 0, lights: false, exp: 1.0, star: 0, env: 1.0 },
};

export class City {
  constructor(THREE_, scene, opts = {}) {
    this.scene = scene; this.rnd = mulberry(opts.seed || 1337); this.time = opts.time || 'night'; this.weather = opts.weather || 'clear';
    this.colliders = []; this.grid = new Map(); this.blocks = []; this.lightPhase = 0; this.mats = {};
    this.build();
  }
  // ---------------------------------------------------------------- textures
  tex(draw, w, h, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
  buildTextures() {
    const r = this.rnd;
    const wallDraw = (emissive) => (g, w, h) => {
      g.fillStyle = emissive ? '#000' : '#cfd3da'; g.fillRect(0, 0, w, h);
      const cols = 8, rows = 8, cw = w / cols, ch = h / rows, rr = mulberry(77);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const lit = rr() < 0.5, warm = rr() < 0.7, px = x * cw + cw * 0.18, py = y * ch + ch * 0.2, ww = cw * 0.64, hh = ch * 0.58;
        if (emissive) { if (lit) { g.fillStyle = warm ? `hsl(${38 + rr() * 14},95%,${58 + rr() * 14}%)` : `hsl(${195 + rr() * 20},70%,${62 + rr() * 10}%)`; g.fillRect(px, py, ww, hh); } }
        else { g.fillStyle = '#1b2230'; g.fillRect(px, py, ww, hh); g.fillStyle = 'rgba(120,150,190,.28)'; g.fillRect(px, py, ww, hh * 0.35); g.fillStyle = '#9aa0ab'; g.fillRect(px - 1, py + hh, ww + 2, 2); }
      }
    };
    this.mats.wallMap = this.tex(wallDraw(false), 256, 256); this.mats.wallEmi = this.tex(wallDraw(true), 256, 256);
    this.mats.road = this.tex((g, w, h) => {
      g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { const v = 30 + Math.random() * 22 | 0; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      const m = w / 18, x = k => w / 2 + k * m;
      g.fillStyle = '#e3b82b'; g.fillRect(x(-0.28), 0, 0.14 * m, h); g.fillRect(x(0.14), 0, 0.14 * m, h);
      g.fillStyle = '#d8d8d8'; g.fillRect(x(-8.55), 0, 0.2 * m, h); g.fillRect(x(8.35), 0, 0.2 * m, h);
      for (let y = 0; y < h; y += h / 8) { g.fillRect(x(-4.6), y, 0.15 * m, h / 16); g.fillRect(x(4.45), y, 0.15 * m, h / 16); }
    }, 256, 512);
    this.mats.asphalt = this.tex((g, w, h) => { g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { const v = 30 + Math.random() * 22 | 0; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 128, 128);
    this.mats.cross = this.tex((g, w, h) => { g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h); g.fillStyle = '#e6e6e6'; for (let i = 0; i < 12; i++) g.fillRect(i * w / 12 + 3, 0, w / 24, h); }, 256, 32);
    this.mats.pave = this.tex((g, w, h) => { g.fillStyle = '#7a7c82'; g.fillRect(0, 0, w, h); g.strokeStyle = '#64666c'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } }, 128, 128);
    this.mats.grass = this.tex((g, w, h) => { g.fillStyle = '#35693a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `hsl(${100 + Math.random() * 30},45%,${24 + Math.random() * 14}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 3); } }, 128, 128);
    this.mats.glow = this.tex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 64, 64);
    this.mats.glow.wrapS = this.mats.glow.wrapT = THREE.ClampToEdgeWrapping;
  }
  // ---------------------------------------------------------------- build
  build() {
    const S = this.scene, r = this.rnd; this.buildTextures();
    this.envTex = null;
    // ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x1d2420, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; S.add(ground);
    const L = N * P + RW;
    // roads: one strip per block edge, butted between junction squares (no overlapping layers => no z-fighting)
    this.roadMat = new THREE.MeshStandardMaterial({ map: this.mats.road, roughness: 0.88, metalness: 0.0 });
    const segs = [], Ls = P - RW + 0.4;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const n = nodePos(i, j);
      if (i < N) { const g = new THREE.PlaneGeometry(RW, Ls); this.scaleUV(g, 1, Ls / 36); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); g.translate(n.x + P / 2, 0, n.z); segs.push(g); }
      if (j < N) { const g = new THREE.PlaneGeometry(RW, Ls); this.scaleUV(g, 1, Ls / 36); g.rotateX(-Math.PI / 2); g.translate(n.x, 0, n.z + P / 2); segs.push(g); }
    }
    S.add(new THREE.Mesh(mergeGeometries(segs), this.roadMat));
    // intersection patches + crosswalks (merged)
    const patches = [], cross = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const n = nodePos(i, j), g = new THREE.PlaneGeometry(RW, RW); g.rotateX(-Math.PI / 2); g.translate(n.x, 0.006, n.z); patches.push(g);
      for (let d = 0; d < 4; d++) { const [dx, dz] = DIRS[d]; if (!this.hasEdge(i, j, d)) continue; const c = new THREE.PlaneGeometry(RW - 0.6, 3.2); c.rotateX(-Math.PI / 2); if (dx === 0) c.rotateY(0); else c.rotateY(Math.PI / 2); c.translate(n.x + dx * (RW / 2 + 2.2), 0.025, n.z + dz * (RW / 2 + 2.2)); cross.push(c); }
    }
    const pm = new THREE.Mesh(mergeGeometries(patches), new THREE.MeshStandardMaterial({ map: this.mats.asphalt, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); S.add(pm);
    const cm = new THREE.Mesh(mergeGeometries(cross), new THREE.MeshStandardMaterial({ map: this.mats.cross, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); S.add(cm);
    this.buildBlocks(); this.buildLamps(); this.buildSignals(); this.buildSkyline(); this.buildSky(); this.buildLights(); this.setTime(this.time, this.weather);
  }
  // roads/pavement/ground must not pick up the scene environment map (it mirrored a bright 'room light' rectangle on the asphalt)
  noEnvSurfaces() {
    if (!this.blackEnv) { this.blackEnv = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.blackEnv.mapping = THREE.EquirectangularReflectionMapping; this.blackEnv.needsUpdate = true; }
    const maps = [this.mats.road, this.mats.asphalt, this.mats.cross, this.mats.pave, this.mats.grass].filter(Boolean);
    this.scene.traverse(o => { const m = o.material; if (o.isMesh && m && !Array.isArray(m) && m.isMeshStandardMaterial && (maps.includes(m.map) || (m.color && m.color.getHex() === 0x1d2420 && !m.map))) m.envMap = this.blackEnv; });
  }
  // merge geometries into spatial chunks (one mesh per cell) so the GPU skips everything outside the view
  chunkMerge(list, mat, cell) {
    const bins = new Map();
    for (const g of list) { g.computeBoundingBox(); const b = g.boundingBox, k = Math.floor((b.min.x + b.max.x) / 2 / cell) + ',' + Math.floor((b.min.z + b.max.z) / 2 / cell); (bins.get(k) || bins.set(k, []).get(k)).push(g); }
    for (const gs of bins.values()) { const m = new THREE.Mesh(mergeGeometries(gs), mat); this.scene.add(m); }
  }
  hasEdge(i, j, d) { const [dx, dz] = DIRS[d], a = i + dx, b = j + dz; return a >= 0 && a <= N && b >= 0 && b <= N; }
  scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
  addCollider(minX, maxX, minZ, maxZ, h = 0, airOnly = false) {
    const c = { minX, maxX, minZ, maxZ, h, airOnly }; this.colliders.push(c);
    for (let gx = Math.floor(minX / 40); gx <= Math.floor(maxX / 40); gx++) for (let gz = Math.floor(minZ / 40); gz <= Math.floor(maxZ / 40); gz++) { const k = gx + ',' + gz; (this.grid.get(k) || this.grid.set(k, []).get(k)).push(c); }
  }
  near(x, z, r) { const out = new Set(); if (!(Math.abs(x) < 20000 && Math.abs(z) < 20000)) return out; for (let gx = Math.floor((x - r) / 40); gx <= Math.floor((x + r) / 40); gx++) for (let gz = Math.floor((z - r) / 40); gz <= Math.floor((z + r) / 40); gz++) { const l = this.grid.get(gx + ',' + gz); if (l) for (const c of l) out.add(c); } return out; }
  // box with wrapped window UVs
  towerGeo(w, h, d, x, z, y0, tint) {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv, pos = g.attributes.position;
    for (let v = 0; v < uv.count; v++) {
      const f = Math.floor(v / 4);
      if (f === 2 || f === 3) uv.setXY(v, 0.02, 0.02);
      else { const span = (f < 2 ? d : w); uv.setXY(v, uv.getX(v) * span / 3.4 / 8, uv.getY(v) * h / 3.6 / 8); }
    }
    g.translate(x, y0 + h / 2, z);
    const col = new Float32Array(pos.count * 3); for (let v = 0; v < pos.count; v++) { col[v * 3] = tint.r; col[v * 3 + 1] = tint.g; col[v * 3 + 2] = tint.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  }
  buildBlocks() {
    const r = this.rnd, S = this.scene, geos = [], slabs = [], grassG = [], trunk = [], leaf = [], neon = [], tint = new THREE.Color();
    const palette = [0xe9e6df, 0xd0d6e0, 0xc4ccd8, 0xdfd2c4, 0xb9c3cf, 0xf0efe9, 0xaeb7c2, 0xd9c3a8];
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const cx = (a + 0.5 - N / 2) * P, cz = (b + 0.5 - N / 2) * P, dist = Math.hypot(a + 0.5 - N / 2, b + 0.5 - N / 2);
      const zone = dist < 1.9 ? 'down' : dist < 3.3 ? 'mid' : 'out';
      const SP = { '5,2': 'club', '1,5': 'hospital', '6,5': 'police' }, spType = SP[a + ',' + b], isClub = !!spType, park = !isClub && (zone !== 'down') && r() < 0.11 && !(a === 3 && b === 3);
      const bs = P - RW, sl = new THREE.BoxGeometry(bs, 0.16, bs); this.scaleUV(sl, bs / 8, bs / 8); sl.translate(cx, 0.08, cz); slabs.push(sl);
      this.blocks.push({ a, b, cx, cz, zone, park, club: isClub });
      if (isClub) { (this.special ||= {})[spType] = { cx, cz }; if (spType === 'club') this.clubBlock = { cx, cz }; continue; }
      if (park) {
        const gg = new THREE.PlaneGeometry(bs - 6, bs - 6); gg.rotateX(-Math.PI / 2); this.scaleUV(gg, 8, 8); gg.translate(cx, 0.175, cz); grassG.push(gg);
        for (let t = 0; t < 26; t++) { const tx = cx + (r() - 0.5) * (bs - 12), tz = cz + (r() - 0.5) * (bs - 12), th = 4 + r() * 3.5; const tr = new THREE.CylinderGeometry(0.22, 0.32, th, 6); tr.translate(tx, th / 2 + 0.16, tz); trunk.push(tr); const lf = new THREE.IcosahedronGeometry(2.1 + r() * 1.2, 0); lf.translate(tx, th + 1.2, tz); const gc = new THREE.Color().setHSL(0.27 + r() * 0.07, 0.5, 0.25 + r() * 0.1); this.paint(lf, gc); leaf.push(lf); this.addCollider(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4); }
        continue;
      }
      const lots = zone === 'down' ? 1 : zone === 'mid' ? (r() < 0.5 ? 2 : 1) : (r() < 0.5 ? 2 : 3), ls = 58 / lots;
      for (let lx = 0; lx < lots; lx++) for (let lz = 0; lz < lots; lz++) {
        const x = cx - 29 + (lx + 0.5) * ls, z = cz - 29 + (lz + 0.5) * ls, w = ls - (lots > 1 ? 4 : 3) - r() * 3, d = ls - (lots > 1 ? 4 : 3) - r() * 3;
        let h = zone === 'down' ? 70 + r() * 120 : zone === 'mid' ? 28 + r() * 40 : 8 + r() * 18;
        tint.setHex(palette[(r() * palette.length) | 0]);
        if (zone === 'down' && r() < 0.5) tint.setHex(0x9fb4cc);
        geos.push(this.towerGeo(w, h, d, x, z, 0.16, tint));
        this.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h);
        if (zone !== 'out' && h > 40 && r() < 0.7) { const h2 = 8 + r() * 24, w2 = w * 0.6, d2 = d * 0.6; geos.push(this.towerGeo(w2, h2, d2, x, z, 0.16 + h, tint)); if (r() < 0.5) { const ant = new THREE.CylinderGeometry(0.15, 0.3, 14, 5); ant.translate(x, 0.16 + h + h2 + 7, z); this.paint(ant, new THREE.Color(0x888888)); geos.push(ant); } h += h2; }
        // neon signs on street-facing walls
        if (r() < (zone === 'out' ? 0.35 : 0.55)) {
          const sy = 4 + r() * Math.min(h - 4, 18), sw = 4 + r() * 5, sh = 1.2 + r() * 1.4, hue = [0xff2d9b, 0x24e0ff, 0xffd23a, 0x7cff5a, 0xb36bff][(r() * 5) | 0];
          const face = (r() * 4) | 0, sg = new THREE.BoxGeometry(face % 2 ? 0.3 : sw, sh, face % 2 ? sw : 0.3);
          const off = face === 0 ? [0, d / 2 + 0.2] : face === 1 ? [w / 2 + 0.2, 0] : face === 2 ? [0, -d / 2 - 0.2] : [-w / 2 - 0.2, 0];
          sg.translate(x + off[0], 0.16 + sy, z + off[1]); this.paint(sg, new THREE.Color(hue)); neon.push(sg);
        }
      }
    }
    const wall = new THREE.MeshStandardMaterial({ map: this.mats.wallMap, emissiveMap: this.mats.wallEmi, emissive: 0xffffff, emissiveIntensity: 1.4, vertexColors: true, roughness: 0.55, metalness: 0.25 });
    this.wallMat = wall;
    this.chunkMerge(geos, wall, P * 2);
    S.add(new THREE.Mesh(mergeGeometries(slabs), new THREE.MeshStandardMaterial({ map: this.mats.pave, roughness: 0.8 })));
    if (grassG.length) S.add(new THREE.Mesh(mergeGeometries(grassG), new THREE.MeshStandardMaterial({ map: this.mats.grass, roughness: 1 })));
    if (trunk.length) { S.add(new THREE.Mesh(mergeGeometries(trunk), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }))); S.add(new THREE.Mesh(mergeGeometries(leaf), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }))); }
    this.neonMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.chunkMerge(neon, this.neonMat, P * 2);
    // city boundary walls (invisible)
    const E = HALF + RW / 2 + 36; this.addCollider(-E, E, -E - 5, -E); this.addCollider(-E, E, E, E + 5);
    // outer sidewalk ring beyond the border roads (keeps cars on the map)
    for (const [x0, x1, z0, z1] of [[-E, E, -E, -HALF - RW / 2 - 1], [-E, E, HALF + RW / 2 + 1, E], [-E, -HALF - RW / 2 - 1, -E, -100], [-E, -HALF - RW / 2 - 1, 100, E], [HALF + RW / 2 + 1, E, -E, -100], [HALF + RW / 2 + 1, E, 100, E]]) { this.addCollider(x0, x1, z0, z1); }
    const rim = new THREE.BoxGeometry(1, 1, 1); const rimMat = new THREE.MeshStandardMaterial({ color: 0x252a2e, roughness: 1 });
    for (const [x0, x1, z0, z1] of [[-E, E, -E, -HALF - RW / 2 - 1], [-E, E, HALF + RW / 2 + 1, E], [-E, -HALF - RW / 2 - 1, -E, -100], [-E, -HALF - RW / 2 - 1, 100, E], [HALF + RW / 2 + 1, E, -E, -100], [HALF + RW / 2 + 1, E, 100, E]]) { const m = new THREE.Mesh(rim, rimMat); m.scale.set(x1 - x0, 2.5, z1 - z0); m.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2); S.add(m); }
  }
  paint(g, c) { const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  capPoints(mat, max) { mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n gl_PointSize = min(gl_PointSize, ' + max.toFixed(1) + ');'); }; return mat; }
  buildLamps() {
    const pts = [], poles = [], r = this.rnd;
    for (const b of this.blocks) {
      const e = P - RW; const o = e / 2 - 1.2;
      const spots = [[-o, -o], [o, -o], [-o, o], [o, o], [0, -o], [0, o], [-o, 0], [o, 0]];
      for (const [dx, dz] of spots) {
        const x = b.cx + dx, z = b.cz + dz; const g = new THREE.CylinderGeometry(0.1, 0.16, 7.5, 6); g.translate(x, 3.9, z); poles.push(g);
        const lx = dx !== 0, sgn = lx ? Math.sign(dx) : Math.sign(dz);   // lean outward over the road
        const arm = new THREE.BoxGeometry(lx ? 1.8 : 0.12, 0.12, lx ? 0.12 : 1.8); arm.translate(x + (lx ? sgn * 0.9 : 0), 7.55, z + (lx ? 0 : sgn * 0.9)); poles.push(arm);
        pts.push(x + (lx ? sgn * 1.7 : 0), 7.4, z + (lx ? 0 : sgn * 1.7));
      }
    }
    this.scene.add(new THREE.Mesh(mergeGeometries(poles), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6, metalness: 0.5 })));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.lampMat = new THREE.PointsMaterial({ map: this.mats.glow, color: 0xffc680, size: 11, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
    this.capPoints(this.lampMat, 60); this.lampPts = new THREE.Points(geo, this.lampMat); this.lampPts.frustumCulled = false; this.scene.add(this.lampPts);
    // small bright cores
    this.coreMat = new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.7, sizeAttenuation: true, depthWrite: false }); const core = new THREE.Points(geo, this.coreMat); core.frustumCulled = false; this.scene.add(core);
  }
  // traffic signals: phase 0 => x-axis traffic green, phase 1 => z-axis green (per global timer; green 9s, amber 1.6s)
  signalState(axis, t) { const c = t % 22; if (axis === 'x') return c < 9 ? 'g' : c < 10.6 ? 'y' : 'r'; const d = (t + 11) % 22; return d < 9 ? 'g' : d < 10.6 ? 'y' : 'r'; }
  buildSignals() {
    const pos = [], col = [], poleG = [];
    this.sigPts = []; // [{x,z,axis,idx}]
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const n = nodePos(i, j);
      for (const [sx, sz, axis] of [[-1, -1, 'x'], [1, 1, 'x'], [1, -1, 'z'], [-1, 1, 'z']]) {
        const x = n.x + sx * (RW / 2 + 0.6), z = n.z + sz * (RW / 2 + 0.6);
        const g = new THREE.CylinderGeometry(0.1, 0.12, 5.6, 6); g.translate(x, 2.9, z); poleG.push(g);
        const hb = new THREE.BoxGeometry(0.5, 1.4, 0.5); hb.translate(x, 5.5, z); poleG.push(hb);
        this.sigPts.push({ x, y: 5.5, z, axis });
      }
    }
    this.scene.add(new THREE.Mesh(mergeGeometries(poleG), new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.6 })));
    const geo = new THREE.BufferGeometry(); const p = new Float32Array(this.sigPts.length * 3), c = new Float32Array(this.sigPts.length * 3);
    this.sigPts.forEach((s, k) => { p[k * 3] = s.x; p[k * 3 + 1] = s.y; p[k * 3 + 2] = s.z; });
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.sigGeo = geo; this.sigMat = new THREE.PointsMaterial({ map: this.mats.glow, vertexColors: true, size: 5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.capPoints(this.sigMat, 40); const m = new THREE.Points(geo, this.sigMat); m.frustumCulled = false; this.scene.add(m);
    this.sigCoreMat = new THREE.PointsMaterial({ vertexColors: true, size: 0.45, sizeAttenuation: true, depthWrite: false }); const m2 = new THREE.Points(geo, this.sigCoreMat); m2.frustumCulled = false; this.scene.add(m2);
  }
  updateSignals(t) {
    const c = this.sigGeo.attributes.color; const col = { g: [0.1, 1, 0.35], y: [1, 0.75, 0.1], r: [1, 0.12, 0.1] };
    for (let k = 0; k < this.sigPts.length; k++) { const s = col[this.signalState(this.sigPts[k].axis, t)]; c.setXYZ(k, s[0], s[1], s[2]); }
    c.needsUpdate = true;
  }
  buildSkyline() {
    const r = this.rnd, geos = [], tint = new THREE.Color();
    for (let k = 0; k < 220; k++) {
      const a = r() * Math.PI * 2, rad = HALF + 160 + r() * 650, w = 30 + r() * 60, d = 30 + r() * 60, h = 30 + r() * (rad > 600 ? 220 : 120);
      tint.setHex([0xb9c3cf, 0xaeb7c2, 0xc4ccd8][(r() * 3) | 0]); { const px = Math.cos(a) * rad, pz = Math.sin(a) * rad; if ((px < -700 && Math.abs(pz) < 520) || px > 880) continue; if (Math.abs(px) > 560 || Math.abs(pz) > 560) this.addCollider(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, h, true); } geos.push(this.towerGeo(w, h, d, Math.cos(a) * rad, Math.sin(a) * rad, 0, tint));
    }
    this.chunkMerge(geos, this.wallMat, 380);
  }
  buildSky() {
    const u = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
    this.skyU = u;
    const mat = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, h)); c = mix(c, top, smoothstep(0.2, 0.9, h)); gl_FragColor = vec4(c, 1.0); }' });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 24, 12), mat); this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.scene.add(this.sky);
    const sp = [], r = this.rnd; for (let i = 0; i < 700; i++) { const a = r() * Math.PI * 2, e = 0.08 + r() * 1.3, R = 2300; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false }); this.stars = new THREE.Points(sg, this.starMat); this.stars.frustumCulled = false; this.scene.add(this.stars);
    // moon / sun disc
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(70, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8efff, fog: false })); this.moon.position.set(-900, 700, -1500); this.scene.add(this.moon);
    const follow = o => { o.onBeforeRender = (rd, sc, cam) => { o.position.copy(cam.position); }; };
    follow(this.sky); follow(this.stars);
    this.moon.onBeforeRender = (rd, sc, cam) => { this.moon.position.set(cam.position.x - 900, 700, cam.position.z - 1500); };
  }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1); this.sun.position.set(-300, 500, -400); this.scene.add(this.sun);
  }
  setEnvironment(tex) { this.envTex = tex; this.scene.environment = tex; }
  setTime(time, weather) {
    this.time = time; this.weather = weather; const p = TIME_PRESETS[time] || TIME_PRESETS.night;
    this.skyU.top.value.setHex(p.sky[0]); this.skyU.mid.value.setHex(p.sky[1]); this.skyU.hor.value.setHex(p.sky[2]);
    let fogC = p.fog, fogD = p.fogD, wet = weather === 'rain';
    if (wet) { fogD *= 1.8; fogC = new THREE.Color(fogC).lerp(new THREE.Color(0x303640), 0.5).getHex(); this.skyU.top.value.lerp(new THREE.Color(0x151820), 0.5); this.skyU.mid.value.lerp(new THREE.Color(0x2a2e38), 0.5); this.skyU.hor.value.lerp(new THREE.Color(fogC), 0.7); }
    this.scene.fog = new THREE.FogExp2(fogC, fogD); this.scene.background = new THREE.Color(fogC);
    this.hemi.color.setHex(p.hemi[0]); this.hemi.groundColor.setHex(p.hemi[1]); this.hemi.intensity = p.hemi[2] * (wet ? 0.8 : 1) * (window.__lowGpu ? (this.time === 'night' ? 2.6 : this.time === 'dusk' ? 1.8 : 1.15) : 1);
    this.sun.color.setHex(p.sun[0]); this.sun.intensity = p.sun[1] * (wet ? 0.5 : 1);
    this.wallMat.emissiveIntensity = p.win; this.lampMat.opacity = p.lamp ? 0.9 : 0; this.coreMat.opacity = 1; this.coreMat.color.setHex(p.lamp ? 0xfff0d0 : 0x555555);
    this.neonMat.color.setScalar(time === 'day' ? 0.35 : 1);
    this.starMat.opacity = wet ? 0 : p.star; this.stars.visible = !wet && p.star > 0; this.moon.visible = time === 'night' && !wet;
    this.roadMat.roughness = wet ? 0.16 : 0.88; this.roadMat.metalness = wet ? 0.3 : 0.0; this.roadMat.needsUpdate = true;
    this.scene.environmentIntensity = p.env * (wet ? 0.7 : 1); this.lightsOn = p.lights; this.exposure = p.exp;
  }
}
