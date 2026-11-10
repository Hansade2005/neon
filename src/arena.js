// Neon Arena: a floodlit 22,000-seat football stadium east of the city, with a live AI-vs-AI match (Pitch Clash engine),
// a packed crowd, a ticket office, seats you can sit in, TV cameras, commentary and betting.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Match, PITCH } from './football/sim.js';
import { CLUBS, makeSquad, formations as FORMATIONS } from './football/teams.js';
import { Audio } from './audio.js';
const { HL, HW } = PITCH, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const ROWS = 14, ROW_D = 0.85, RISE = 0.45, GAP = 3.5;
export const TIERS = [
  { id: 'standing', name: 'Standing · behind the goal', price: 30 }, { id: 'stand', name: 'Main stand · halfway line', price: 80 },
  { id: 'lower', name: 'Lower tier · pitch-side', price: 150 }, { id: 'vip', name: 'VIP box · glass suite', price: 400 },
];
const loader = new GLTFLoader(), gltfCache = {};
const loadGLB = f => (gltfCache[f] ||= loader.loadAsync(`../assets/football/players/${f}.glb`));

export class Arena {
  constructor(world, cx, cz, x0) {
    this.world = world; this.cx = cx; this.cz = cz; this.x0 = x0; this.t = 0; this.group = new THREE.Group(); world.scene.add(this.group); this.match = null; this.state = 'pre'; this.stateT = 40; this.players = []; this.officials = []; this.excite = 0; this.wave = 0; this.waveT = 0;
    this.fixtureId = 0; this.joined = []; this.rings = []; this.score = [0, 0]; this.lastComment = 0; this.watchers = new Set(); this.bets = []; this.cam = new Map(); this.ready = false;
    this.buildPlaza(); this.buildPitch(); this.buildStands(); this.buildCrowd(); this.buildLights(); this.buildScoreboards(); this.buildOffice(); this.addColliders();
    this.nextFixture(); this.spawnCast();
  }
  W(sx, sz) { return { x: this.cx + sz, z: this.cz + sx }; }   // sim (x along pitch, z across) -> world (pitch runs north-south)
  // ------------------------------------------------------------------ geometry
  buildPlaza() {
    const G = this.group, cx = this.cx, cz = this.cz, x1 = cx + 72, w = x1 - this.x0, mid = (this.x0 + x1) / 2;
    const tex = this.world.city.mats.pave.clone(); tex.repeat.set(w / 8, 200 / 8); tex.needsUpdate = true;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, 200), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.position.set(mid, 0.03, cz); G.add(floor);
    // perimeter walls (west side is open to the city)
    const wall = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 6, d), new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.9 })); m.position.set(x, 3, z); G.add(m); this.world.city.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };
    wall(w, 2, mid, cz - 100); wall(w, 2, mid, cz + 100); wall(2, 200, x1, cz);
    // banners / flags in the plaza
    const flagMat = [0xff2bd6, 0x19e6ff, 0xffd23a, 0x7cff5a].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    for (let k = 0; k < 14; k++) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 6), new THREE.MeshStandardMaterial({ color: 0x999999 })); const x = this.x0 + 6 + (k % 2) * 22, z = cz - 90 + Math.floor(k / 2) * 28; pole.position.set(x, 3.5, z); G.add(pole); const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), flagMat[k % 4]); fl.position.set(x + 1.3, 6.1, z); G.add(fl); }
  }
  pitchTexture() {
    const W = 1024, H = 1584, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), sx = W / 68, sz = H / 105;
    for (let i = 0; i < 15; i++) { g.fillStyle = i % 2 ? '#2c8a38' : '#34a042'; g.fillRect(0, i * H / 15, W, H / 15 + 1); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${20 + Math.random() * 30 | 0},${90 + Math.random() * 40 | 0},${20 + Math.random() * 20 | 0},.12)`; g.fillRect(Math.random() * W, Math.random() * H, 2, 4); }
    g.strokeStyle = '#f2f7f2'; g.lineWidth = 4; g.fillStyle = '#f2f7f2';
    const X = x => (x + 34) * sx, Z = z => (z + 52.5) * sz, line = (x0, z0, x1, z1) => { g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); };
    g.strokeRect(X(-34) + 2, Z(-52.5) + 2, 68 * sx - 4, 105 * sz - 4); line(-34, 0, 34, 0); g.beginPath(); g.arc(X(0), Z(0), 9.15 * sx, 0, 7); g.stroke(); g.beginPath(); g.arc(X(0), Z(0), 0.4 * sx, 0, 7); g.fill();
    for (const s of [-1, 1]) { g.strokeRect(X(-20.16), s > 0 ? Z(52.5 - 16.5) : Z(-52.5), 40.32 * sx, 16.5 * sz); g.strokeRect(X(-9.16), s > 0 ? Z(52.5 - 5.5) : Z(-52.5), 18.32 * sx, 5.5 * sz); g.beginPath(); g.arc(X(0), Z(s * (52.5 - 11)), 0.35 * sx, 0, 7); g.fill(); g.beginPath(); g.arc(X(0), Z(s * (52.5 - 11)), 9.15 * sx, s > 0 ? 1.1 * Math.PI - 0.1 : 0.1 * Math.PI, s > 0 ? 1.9 * Math.PI + 0.1 : 0.9 * Math.PI - 0.1 - 0 + 0); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  buildPitch() {
    const G = this.group, cx = this.cx, cz = this.cz;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(68, 105), new THREE.MeshStandardMaterial({ map: this.pitchTexture(), roughness: 0.95, emissive: 0x1c5a22, emissiveIntensity: 0.3 })); pitch.rotation.x = -Math.PI / 2; pitch.position.set(cx, 0.12, cz); G.add(pitch);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(88, 125), new THREE.MeshStandardMaterial({ color: 0x1f6b2a, roughness: 1, emissive: 0x0d3a14, emissiveIntensity: 0.5 })); grass.rotation.x = -Math.PI / 2; grass.position.set(cx, 0.08, cz); G.add(grass);
    // goals
    const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), net = new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.55 });
    for (const s of [-1, 1]) {
      const gz = cz + s * HL, gw = 7.32, gh = 2.44, d = 2.2, mk = (a, b, c, e, f, g2) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, Math.hypot(e - a, f - b, g2 - c), 8), goalMat); m.position.set((a + e) / 2, (b + f) / 2, (c + g2) / 2); m.lookAt(e, f, g2); m.rotateX(Math.PI / 2); G.add(m); };
      mk(cx - gw / 2, 0.1, gz, cx - gw / 2, gh, gz); mk(cx + gw / 2, 0.1, gz, cx + gw / 2, gh, gz); mk(cx - gw / 2, gh, gz, cx + gw / 2, gh, gz);
      const pts = []; for (let i = 0; i <= 8; i++) { const x = cx - gw / 2 + gw * i / 8; pts.push(x, 0.1, gz, x, gh, gz + s * d); pts.push(x, gh, gz, x, gh, gz + s * d); } for (let j = 0; j <= 4; j++) { const y = 0.1 + (gh - 0.1) * j / 4; pts.push(cx - gw / 2, y, gz, cx - gw / 2, y, gz + s * d, cx + gw / 2, y, gz, cx + gw / 2, y, gz + s * d, cx - gw / 2, y, gz + s * d, cx + gw / 2, y, gz + s * d); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); G.add(new THREE.LineSegments(geo, net));
    }
    // ad boards around the pitch
    const ad = new THREE.MeshBasicMaterial({ map: this.adTexture() }); for (const [w, d, x, z] of [[72, 0.6, cx, cz - 57], [72, 0.6, cx, cz + 57], [0.6, 114, cx - 37, cz], [0.6, 114, cx + 37, cz]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), ad); m.position.set(x, 0.6, z); G.add(m); }
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshStandardMaterial({ map: this.ballTexture(), roughness: 0.4 })); this.ball.position.set(cx, 0.3, cz); G.add(this.ball);
    this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false })); this.ballShadow.rotation.x = -Math.PI / 2; G.add(this.ballShadow);
  }
  adTexture() { const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d'); const cols = ['#e63946', '#2f7bff', '#ffb703', '#7cff5a', '#ff2bd6', '#19e6ff']; const txt = ['NEON COLA', 'OVERDRIVE', 'CITYBANK', 'VOLT ENERGY', 'SKYLINE AIR', 'NEON FM']; for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect(i * 170, 0, 170, 64); g.fillStyle = '#fff'; g.font = '900 28px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt[i], i * 170 + 85, 34); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; }
  ballTexture() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#222'; for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(i * 16 + 8 + (j % 2) * 8, j * 32 + 16, 7, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  // tiered stands with vertex-coloured seats
  buildStands() {
    const G = this.group, cx = this.cx, cz = this.cz, geos = [], col = new THREE.Color(); this.seatRows = [];
    const stands = [{ id: 'W', dx: -1, dz: 0, len: 124, base: 37, tilt: 0 }, { id: 'E', dx: 1, dz: 0, len: 124, base: 37, tilt: 0 }, { id: 'N', dx: 0, dz: -1, len: 76, base: 60.5, tilt: 1 }, { id: 'S', dx: 0, dz: 1, len: 76, base: 60.5, tilt: 1 }];
    for (const s of stands) {
      for (let r = 0; r < ROWS; r++) {
        const depth = s.base + GAP * 0 + r * ROW_D, h = 1.0 + r * RISE;
        const along = s.tilt ? 'x' : 'z', geo = new THREE.BoxGeometry(s.tilt ? s.len : ROW_D, h, s.tilt ? ROW_D : s.len);
        const px = cx + (s.tilt ? 0 : s.dx * (depth + ROW_D / 2)), pz = cz + (s.tilt ? s.dz * (depth + ROW_D / 2) : 0);
        geo.translate(px, h / 2, pz); const n = geo.attributes.position.count, colors = new Float32Array(n * 3);
        const sectorCols = s.id === 'W' ? [[0.9, 0.15, 0.2], [0.85, 0.1, 0.15]] : s.id === 'E' ? [[0.15, 0.35, 0.95], [0.1, 0.3, 0.85]] : [[0.95, 0.8, 0.15], [0.9, 0.75, 0.1]];
        col.setRGB(...sectorCols[r % 2]); for (let i = 0; i < n; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; } geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geos.push(geo);
        this.seatRows.push({ stand: s.id, row: r, depth, h, dx: s.dx, dz: s.dz, tilt: s.tilt, len: s.len });
      }
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }); G.add(new THREE.Mesh(mergeGeometries(geos), mat));
    // back walls + roofs (west & east canopies)
    const back = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.8 });
    for (const s of stands) { const depth = s.base + ROWS * ROW_D + 0.4, m = new THREE.Mesh(new THREE.BoxGeometry(s.tilt ? s.len + 2 : 0.8, 14, s.tilt ? 0.8 : s.len + 2), back); m.position.set(cx + (s.tilt ? 0 : s.dx * depth), 7, cz + (s.tilt ? s.dz * depth : 0)); G.add(m); }
    for (const dx of [-1, 1]) { const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 128), new THREE.MeshStandardMaterial({ color: 0x2a3042, metalness: 0.5, roughness: 0.5 })); roof.position.set(cx + dx * (37 + ROWS * ROW_D - 4), 12.8, cz); G.add(roof); const lip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 128), new THREE.MeshBasicMaterial({ color: dx < 0 ? 0xff2b3a : 0x2f7bff })); lip.position.set(cx + dx * (37 + ROWS * ROW_D - 15), 12.6, cz); G.add(lip); }
    // VIP glass suite (west stand, halfway line)
    const suiteY = 1.0 + 11 * RISE, sx = cx - (37 + 11 * ROW_D) - 1;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 26), new THREE.MeshPhysicalMaterial({ color: 0x88c4ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 })); glass.position.set(sx - 2.5, suiteY + 1.9, cz); G.add(glass);
    this.seatFor = tier => {   // -> { x, y, z, face(yaw) }
      const rows = this.seatRows; let r;
      if (tier === 'standing') { r = rows.find(q => q.stand === 'N' && q.row === 2); return { x: cx + rnd(-8, 8), y: r.h + 0.5, z: cz - (r.depth + 0.4), yaw: 0 }; }
      if (tier === 'stand') { r = rows.find(q => q.stand === 'W' && q.row === 7); return { x: cx - (r.depth + 0.4), y: r.h + 0.5, z: cz + rnd(-10, 10), yaw: Math.PI / 2 }; }
      if (tier === 'lower') { r = rows.find(q => q.stand === 'E' && q.row === 2); return { x: cx + (r.depth + 0.4), y: r.h + 0.5, z: cz + rnd(-16, 16), yaw: -Math.PI / 2 }; }
      return { x: sx - 1.5, y: suiteY + 0.8, z: cz + rnd(-6, 6), yaw: Math.PI / 2 };
    };
  }
  buildCrowd() {
    const cx = this.cx, cz = this.cz, spots = []; const q = Math.min(1, (window.__crowdQ || 1));
    for (const s of this.seatRows) { const step = 0.62 / q, n = Math.floor(s.len / step); for (let i = 0; i < n; i++) { if (Math.random() < 0.18) continue; const u = -s.len / 2 + i * step + step / 2; spots.push({ x: cx + (s.tilt ? u : s.dx * (s.depth + ROW_D * 0.6)), y: s.h, z: cz + (s.tilt ? s.dz * (s.depth + ROW_D * 0.6) : u), side: s.stand }); } }
    const body = new THREE.CylinderGeometry(0.2, 0.25, 0.55, 7); body.translate(0, 0.42, 0); const head = new THREE.SphereGeometry(0.13, 7, 5); head.translate(0, 0.84, 0);
    const mk = (g, shared) => { const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.9 }), spots.length); m.frustumCulled = false; m.material.onBeforeCompile = sh => { sh.uniforms.uTime = this.uTime; sh.uniforms.uExc = this.uExc; sh.uniforms.uWave = this.uWave; sh.vertexShader = 'uniform float uTime; uniform float uExc; uniform float uWave;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float ph = instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 1.7; transformed.y += max(0.0, sin(uTime * 7.0 + ph)) * uExc * 0.28 + max(0.0, sin(instanceMatrix[3].z * 0.1 + instanceMatrix[3].x * 0.1 - uTime * 4.0)) * uWave * 0.5;'); }; this.group.add(m); return m; };
    this.uTime = { value: 0 }; this.uExc = { value: 0.1 }; this.uWave = { value: 0 }; this.crowdBody = mk(body); this.crowdHead = mk(head);
    const skins = [0xf1c9a5, 0xd9a577, 0x8d5a3a, 0xe8b88a, 0x5a3825, 0xc68b5a], m4 = new THREE.Matrix4(), c = new THREE.Color();
    spots.forEach((s, i) => { m4.makeRotationY(Math.atan2(cx - s.x, cz - s.z) + (Math.random() - 0.5) * 0.3); m4.setPosition(s.x, s.y, s.z); this.crowdBody.setMatrixAt(i, m4); this.crowdHead.setMatrixAt(i, m4); this.crowdHead.setColorAt(i, c.setHex(pick(skins))); }); this.crowdSpots = spots; this.crowdHead.instanceColor.needsUpdate = true;
    this.colorCrowd([0xe63946, 0x2f7bff]);
  }
  colorCrowd([homeHex, awayHex]) { const c = new THREE.Color(), neutrals = [0xf4f4f4, 0x222222, 0xffb703, 0x7cff5a, 0x888888]; this.crowdSpots.forEach((s, i) => { const r = Math.random(); c.setHex(r < 0.2 ? pick(neutrals) : s.side === 'W' ? homeHex : s.side === 'E' ? awayHex : (r < 0.6 ? homeHex : awayHex)); c.multiplyScalar(0.85 + Math.random() * 0.3); this.crowdBody.setColorAt(i, c); }); this.crowdBody.instanceColor.needsUpdate = true; }
  buildLights() {
    const G = this.group, cx = this.cx, cz = this.cz; this.towers = [];
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx + dx * 60, z = cz + dz * 72, pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 44, 8), new THREE.MeshStandardMaterial({ color: 0x555a66 })); pole.position.set(x, 22, z); G.add(pole);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); panel.position.set(x, 45, z); panel.lookAt(cx, 20, cz); G.add(panel);
      const L = new THREE.SpotLight(0xfff1d6, 5200, 220, 0.85, 0.7, 1.25); L.position.set(x, 45, z); L.target.position.set(cx, 0, cz); G.add(L, L.target); this.towers.push(L);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.world.city.mats.glow, color: 0xfff1d6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.scale.set(40, 40, 1); glow.position.set(x, 45, z); G.add(glow);
    }
    const amb = new THREE.PointLight(0xffffff, 900, 160, 1.4); amb.position.set(cx, 30, cz); G.add(amb);
  }
  boardTexture() { const c = document.createElement('canvas'); c.width = 1024; c.height = 384; return c; }
  buildScoreboards() {
    this.sbCanvas = this.boardTexture(); this.sbTex = new THREE.CanvasTexture(this.sbCanvas); this.sbTex.colorSpace = THREE.SRGBColorSpace;
    for (const dz of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 6.75), new THREE.MeshBasicMaterial({ map: this.sbTex })); m.position.set(this.cx, 17, this.cz + dz * (60.5 + ROWS * ROW_D + 0.9)); m.rotation.y = dz < 0 ? 0 : Math.PI; this.group.add(m); }
    this.drawBoard();
  }
  drawBoard() {
    const g = this.sbCanvas.getContext('2d'), W = 1024, H = 384, m = this.match, a = this.teamA, b = this.teamB; g.fillStyle = '#070a14'; g.fillRect(0, 0, W, H); g.fillStyle = '#19e6ff'; g.fillRect(0, 0, W, 8); g.fillRect(0, H - 8, W, 8);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '900 56px Arial'; if (a) { g.fillStyle = a.colors.shirt; g.fillRect(40, 70, 24, 70); g.fillStyle = '#fff'; g.fillText(a.short, 190, 105); g.fillStyle = b.colors.shirt; g.fillRect(W - 64, 70, 24, 70); g.fillStyle = '#fff'; g.fillText(b.short, W - 190, 105); }
    g.font = '900 170px Arial'; g.fillStyle = '#ffd23a'; g.fillText(`${this.score[0]} - ${this.score[1]}`, W / 2, 140);
    g.font = '700 54px Arial'; g.fillStyle = '#7cff5a'; g.fillText(this.clockText(), W / 2, 270); g.font = '600 34px Arial'; g.fillStyle = '#aab'; g.fillText(this.statusText(), W / 2, 335); this.sbTex.needsUpdate = true;
  }
  clockText() { const m = this.match; if (!m) return ''; const mins = Math.floor(m.clock / m.halfLength * 45) + (m.half === 2 ? 45 : 0); return `${Math.min(mins, 90)}'`; }
  statusText() { return this.state === 'pre' ? `KICK-OFF IN ${Math.ceil(this.stateT)}s` : this.state === 'live' ? 'LIVE' : this.state === 'half' ? 'HALF TIME' : 'FULL TIME'; }
  // ticket office + gate + fixture poster
  buildOffice() {
    const G = this.group, ox = this.x0 + 14, oz = this.cz - 28, mat = (c, e, i) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: e || 0, emissiveIntensity: e ? i || 1 : 0 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 8), mat(0x1c2236)); b.position.set(ox, 2.5, oz); G.add(b); this.world.city.addCollider(ox - 7, ox + 7, oz - 4, oz + 4);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), new THREE.MeshBasicMaterial({ map: this.signTex('TICKETS', '#ffd23a') })); sign.position.set(ox + 7.05, 4.1, oz); sign.rotation.y = Math.PI / 2; G.add(sign);
    for (const dz of [-3, 0, 3]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: 0x19e6ff })); win.position.set(ox + 7.05, 1.9, oz + dz); win.rotation.y = Math.PI / 2; G.add(win); }
    this.officePos = { x: ox + 9, z: oz }; this.gatePos = { x: this.x0 + 34, z: this.cz };
    // gate arch
    const arch = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 26), mat(0x20263a)); arch.position.set(this.gatePos.x, 4.5, this.gatePos.z); G.add(arch); this.world.city.addCollider(this.gatePos.x - 1, this.gatePos.x + 1, this.gatePos.z - 13, this.gatePos.z - 3); this.world.city.addCollider(this.gatePos.x - 1, this.gatePos.x + 1, this.gatePos.z + 3, this.gatePos.z + 13);
    const gs = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshBasicMaterial({ map: this.signTex('NEON ARENA', '#19e6ff') })); gs.position.set(this.gatePos.x - 1.05, 8, this.gatePos.z); gs.rotation.y = -Math.PI / 2; G.add(gs);
    for (const dz of [-3, 3]) { const tn = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), mat(0x445, 0x19e6ff, 0.8)); tn.position.set(this.gatePos.x - 1.4, 0.7, this.gatePos.z + dz); G.add(tn); }
    // fixture poster
    this.posterCanvas = document.createElement('canvas'); this.posterCanvas.width = 1024; this.posterCanvas.height = 512; this.posterTex = new THREE.CanvasTexture(this.posterCanvas); this.posterTex.colorSpace = THREE.SRGBColorSpace;
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: this.posterTex })); poster.position.set(this.x0 + 6, 3.5, this.cz + 14); poster.rotation.y = Math.PI / 2; G.add(poster); const pp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), mat(0x888888)); pp.position.set(this.x0 + 6, 3.5, this.cz + 8.5); G.add(pp); const pp2 = pp.clone(); pp2.position.z = this.cz + 19.5; G.add(pp2);
    // food stalls
    for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 3), mat([0xe63946, 0xffb703, 0x2f7bff][k], [0x440000, 0x443300, 0x001a44][k], 0.8)); st.position.set(this.x0 + 22 + k * 0, 1.5, this.cz + 30 + k * 9); G.add(st); this.world.city.addCollider(st.position.x - 2.5, st.position.x + 2.5, st.position.z - 1.5, st.position.z + 1.5); }
  }
  signTex(text, color) { const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const g = c.getContext('2d'); g.fillStyle = '#080a14'; g.fillRect(0, 0, 1024, 220); g.font = '900 150px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = color; g.shadowBlur = 36; g.fillStyle = color; g.fillText(text, 512, 118); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  drawPoster() { const g = this.posterCanvas.getContext('2d'), a = this.teamA, b = this.teamB; if (!a) return; g.fillStyle = '#0a0d1a'; g.fillRect(0, 0, 1024, 512); const gr = g.createLinearGradient(0, 0, 1024, 512); gr.addColorStop(0, a.colors.shirt); gr.addColorStop(0.5, '#0a0d1a'); gr.addColorStop(1, b.colors.shirt); g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); g.globalAlpha = 1; g.textAlign = 'center'; g.fillStyle = '#ffd23a'; g.font = '900 54px Arial'; g.fillText('MATCH DAY · NEON ARENA', 512, 70); g.fillStyle = '#fff'; g.font = '900 78px Arial'; g.fillText(a.name.toUpperCase(), 512, 190); g.font = '900 44px Arial'; g.fillText('VS', 512, 262); g.font = '900 78px Arial'; g.fillText(b.name.toUpperCase(), 512, 340); g.font = '700 38px Arial'; g.fillStyle = '#19e6ff'; g.fillText(this.state === 'pre' ? `KICK-OFF IN ${Math.ceil(this.stateT)}s · TICKETS FROM $30` : this.state === 'live' ? 'LIVE NOW · TICKETS AT THE OFFICE' : 'NEXT MATCH SOON', 512, 440); this.posterTex.needsUpdate = true; }
  addColliders() {
    const cx = this.cx, cz = this.cz, C = this.world.city, E = 37 + ROWS * ROW_D + 1;
    C.addCollider(cx - E - 1, cx - 36.5, cz - 66, cz + 66); C.addCollider(cx + 36.5, cx + E + 1, cz - 66, cz + 66); C.addCollider(cx - 38, cx + 38, cz - 62 - ROWS * ROW_D, cz - 58); C.addCollider(cx - 38, cx + 38, cz + 58, cz + 62 + ROWS * ROW_D);
    C.addCollider(cx - 37.2, cx + 37.2, cz - 58, cz + 58);   // the pitch is fenced
  }
  // ------------------------------------------------------------------ fixtures
  nextFixture() {
    const pool = CLUBS.filter(c => c.league === 'alb' || c.league === 'ibe' || c.league === 'teu').sort((a, b) => b.rating - a.rating).slice(0, 14), a = pick(pool); let b = pick(pool); while (b === a) b = pick(pool);
    this.teamA = a; this.teamB = b; this.fixtureId++; this.score = [0, 0]; this.state = 'pre'; this.stateT = 50; this.match = null; this.colorCrowd([parseInt(a.colors.shirt.slice(1), 16), parseInt(b.colors.shirt.slice(1), 16)]);
    const d = (a.rating - b.rating) + 3; this.probs = { h: clamp(0.38 + d * 0.018, 0.12, 0.72), d: 0.25 }; this.probs.a = 1 - this.probs.h - this.probs.d; this.odds = { h: +(0.92 / this.probs.h).toFixed(2), d: +(0.92 / this.probs.d).toFixed(2), a: +(0.92 / this.probs.a).toFixed(2) };
    this.drawPoster(); this.drawBoard(); for (const p of this.players) p.root.visible = false; this.players = []; this.pendingBuild = true; this.commentOnce = false;
  }
  startMatch() {
    const [t0, t1] = [this.teamA, this.teamB]; const kit0 = t0.colors, kit1 = (() => { const k = t1.colors, d = (x, y) => { const pa = parseInt(x.slice(1), 16), pb = parseInt(y.slice(1), 16); return Math.hypot(((pa >> 16) & 255) - ((pb >> 16) & 255), ((pa >> 8) & 255) - ((pb >> 8) & 255), (pa & 255) - (pb & 255)); }; return d(t0.colors.shirt, k.shirt) < 110 ? (k.alt || { shirt: '#f8fafc', shorts: '#111827', socks: '#f8fafc' }) : k; })();
    const squads = [makeSquad(t0, this.fixtureId * 2 + 1), makeSquad(t1, this.fixtureId * 2 + 2)], forms = [FORMATIONS[t0.formation] || FORMATIONS['4-4-2'], FORMATIONS[t1.formation] || FORMATIONS['4-4-2']];
    this.match = new Match({ teams: [t0, t1], squads, formations: forms, humans: this.joined.map(p => ({ team: p.fbTeam, device: { type: p.device.type === 'pad' ? 'pad' : 'kb1' } })), lineups: [null, null], tactics: [null, null], halfLength: 140, difficulty: 'pro', knockout: false, extraTime: false, weather: 'clear', injuries: false, var: false, autoSubs: true, events: (type, d) => this.onEvent(type, d) });
    this.kits = [kit0, kit1]; this.state = 'live'; this.acc = 0; this.buildCast(); this.drawBoard(); this.refreshAudience(); if (this.commentOK) Audio.comment('intro', { gain: 1 }); this.stadiumSound(true);
  }
  // ------------------------------------------------------------------ playing: players join the live engine as human-controlled footballers
  canJoin() { return this.state === 'pre'; }
  joinMatch(p, team) {
    if (!this.canJoin() || this.joined.includes(p)) return false; p.fbTeam = team; p.prevState = p.state; p.state = 'football'; p.person.root.visible = false; this.joined.push(p); this.stateT = Math.min(this.stateT, 12); this.watchers.delete(p);
    p.say(`You play for ${team ? this.teamB.name : this.teamA.name}`, 4); Audio.sfx.checkpoint(); return true;
  }
  leaveMatch(p) { const i = this.joined.indexOf(p); if (i >= 0) this.joined.splice(i, 1); p.state = 'foot'; p.person.root.visible = true; p.pos.set(this.gatePos.x - 6, 0.16, this.gatePos.z + 4); p.yaw = -Math.PI / 2; p.cam.yaw = -Math.PI / 2; p.cam.snap = true; p.sbHtml = ''; p.fbInput = null; p.person.play('Idle'); }
  // ------------------------------------------------------------------ cast (22 players + officials)
  async spawnCast() { this.ready = true; }
  async buildCast() {
    const m = this.match, myId = this.fixtureId; for (const p of this.players) this.group.remove(p.root); this.players = []; const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const GKK = [{ shirt: '#22c55e', shorts: '#14532d', socks: '#22c55e' }, { shirt: '#f97316', shorts: '#1f2937', socks: '#f97316' }];
    for (const p of m.all) {
      const gltf = await loadGLB(p.isGK ? 'keeper' : 'footballer_' + files[(p.info.id ? [...String(p.info.id)].reduce((s, c) => s + c.charCodeAt(0), 0) : p.idx) % files.length]); if (myId !== this.fixtureId) return;
      const root = SkeletonUtils.clone(gltf.scene), kit = p.isGK ? GKK[p.team] : this.kits[p.team]; root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = o.material.clone(); const n = o.material.name; if (n === 'Shirt') { o.material.map = null; o.material.color.set(kit.shirt); } else if (n === 'Shorts') { o.material.map = null; o.material.color.set(kit.shorts); } else if (n === 'Socks') { o.material.map = null; o.material.color.set(kit.socks); } else if (n === 'Gloves') o.material.color.set('#f8fafc'); } });
      const wrap = new THREE.Group(); wrap.add(root); this.group.add(wrap); const mixer = new THREE.AnimationMixer(root), clips = {}; for (const c of gltf.animations) clips[c.name] = c;
      this.players.push({ sim: p, root: wrap, mixer, clips, cur: null, actions: {} });
    }
    for (const o of m.officials) { const gltf = await loadGLB('footballer_a'); if (myId !== this.fixtureId) return; const root = SkeletonUtils.clone(gltf.scene); root.traverse(x => { if (x.isMesh) { x.frustumCulled = false; x.material = x.material.clone(); const n = x.material.name; if (n === 'Shirt') { x.material.map = null; x.material.color.set(o.role === 'ref' ? '#e8e800' : '#e8c800'); } else if (n === 'Shorts' || n === 'Socks') { x.material.map = null; x.material.color.set('#111'); } } }); const wrap = new THREE.Group(); wrap.add(root); this.group.add(wrap); const mixer = new THREE.AnimationMixer(root), clips = {}; for (const c of gltf.animations) clips[c.name] = c; this.officials.push({ sim: o, root: wrap, mixer, clips, cur: null, actions: {} }); }
  }
  setAnim(pl, name) {
    const nm = pl.clips[name] ? name : (pl.clips.Idle ? 'Idle' : null); if (!nm || pl.cur === nm) return; const a = pl.actions[nm] || (pl.actions[nm] = pl.mixer.clipAction(pl.clips[nm])); a.reset().setEffectiveWeight(1).play(); const prev = pl.cur && pl.actions[pl.cur]; if (prev) a.crossFadeFrom(prev, 0.18, false); if (['Shoot', 'Pass', 'Tackle', 'Header', 'Fall', 'ThrowIn', 'Celebrate', 'KeeperCatch', 'KeeperDiveLeft', 'KeeperDiveRight', 'KeeperThrow'].includes(nm)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat, Infinity); pl.cur = nm;
  }
  // ------------------------------------------------------------------ events
  onEvent(type, d) {
    if (!this.match) return;   // the engine emits 'kickoff' from inside its constructor
    const A = this.teamA, B = this.teamB, nowT = this.t, on = this.commentOK, vol = this.crowdVol || 0, speak = (cat, gap = 6) => { if (on && nowT - this.lastComment > gap) { this.lastComment = nowT; Audio.comment(cat, { gain: 1 }); } };
    if (type === 'goal') { this.score = [...this.match.score]; this.excite = 1.4; this.waveT = 0; if (vol > 0.05) Audio.crowdGoal(vol); if (on) { this.lastComment = nowT; Audio.comment('goal', { gain: 1.1, pri: 3 }); } this.flash = 1.6; this.drawBoard(); }
    else if (type === 'shot') { this.excite = Math.max(this.excite, 0.5); speak('shot', 8); } else if (type === 'save') { this.excite = Math.max(this.excite, 0.7); if (vol > 0.05) Audio.crowdNear(vol); speak('save', 6); } else if (type === 'post') { this.excite = Math.max(this.excite, 0.8); if (vol > 0.05) Audio.crowdNear(vol); speak('post', 6); }
    else if (type === 'foul') speak('foul', 10); else if (type === 'halftime') { this.state = 'half'; this.stateT = 18; speak('halftime', 0); } else if (type === 'fulltime') { this.finish(); } else if (type === 'kickoff') { this.excite = Math.max(this.excite, 0.5); if (this.match.half === 2) speak('secondhalf', 0); } else if (type === 'corner') speak('corner', 12); else if (type === 'whistle' && vol > 0.25) Audio.sfx.whistle && Audio.sfx.whistle();
  }
  finish() {
    this.state = 'post'; this.stateT = 35; if (this.commentOK) Audio.comment('fulltime', { gain: 1, pri: 3 }); this.excite = 1; const s = this.match.score, res = s[0] > s[1] ? 'h' : s[0] < s[1] ? 'a' : 'd';
    for (const b of this.bets) { if (b.fixture !== this.fixtureId || b.settled) continue; b.settled = true; if (b.pick === res) { const win = Math.round(b.stake * b.odds); b.player.cash += win; b.player.say(`BET WON  +$${win}`, 5); Audio.sfx.cash(); } else b.player.say('Bet lost', 3.5); }
    this.drawBoard(); this.drawPoster();
  }
  stadiumSound(on) { Audio.stadiumBed && Audio.stadiumBed(on); }
  // ------------------------------------------------------------------ tickets / seats / bets
  buyTicket(p, tier) { const t = TIERS.find(x => x.id === tier); if (!t) return false; if (p.cash < t.price) return false; p.cash -= t.price; p.ticket = { tier, fixture: this.fixtureId, name: t.name }; p.say(`Ticket: ${t.name}`, 3); return true; }
  takeSeat(p) {
    if (!p.ticket) return false; const s = this.seatFor(p.ticket.tier); p.prevState = p.state; p.state = 'watch'; p.watchSeat = s; p.person.root.visible = false; p.pos.set(s.x, s.y, s.z); p.watchCam = 0; this.watchers.add(p); p.prompt = null; Audio.sfx.beep(); p.say('Enjoy the match!  C camera · F stand up', 3); this.stadiumSound(true); return true;
  }
  leave(p) { this.watchers.delete(p); p.state = 'foot'; p.person.root.visible = true; p.pos.set(this.gatePos.x - 6, 0.16, this.gatePos.z); p.yaw = -Math.PI / 2; p.cam.yaw = -Math.PI / 2; p.cam.snap = true; p.person.play('Idle'); p.sbHtml = ''; p.sub = ''; }
  placeBet(p, pick, stake) { if (p.cash < stake) return false; p.cash -= stake; this.bets.push({ player: p, fixture: this.fixtureId, pick, stake, odds: this.odds[pick], settled: false }); p.say(`Bet placed  $${stake} @ ${this.odds[pick]}`, 3); return true; }
  // ------------------------------------------------------------------ camera for watchers
  cameraFor(p, dt, K) {
    const m = this.match, bw = m ? this.W(m.ball.x, m.ball.z) : { x: this.cx, z: this.cz }, by = m ? m.ball.y : 0, c = this.cam.get(p) || { look: new THREE.Vector3(bw.x, 0.5, bw.z), pos: new THREE.Vector3() }; this.cam.set(p, c); const mode = p.state === 'football' ? 1 : (p.watchCam || 0), s = p.watchSeat; let pos, fov = 52;
    if (mode === 0) { pos = new THREE.Vector3(s.x, s.y + 0.75, s.z); const d = Math.hypot(bw.x - s.x, bw.z - s.z); fov = clamp(70 - d * 0.55, 24, 58); }
    else if (mode === 1 || p.state === 'football') { pos = new THREE.Vector3(this.cx - 66, 36, this.cz + clamp(bw.z - this.cz, -45, 45) * 0.9); fov = clamp(26 + Math.abs(bw.x - this.cx) * 0.1, 24, 34); }
    else if (mode === 2) { const side = (bw.z - this.cz) > 0 ? 1 : -1; pos = new THREE.Vector3(this.cx + clamp(bw.x - this.cx, -10, 10) * 0.4, 5.5, this.cz + side * 66); fov = 38; }
    else { pos = new THREE.Vector3(this.cx + 30, 60, this.cz + (bw.z - this.cz) * 0.5 + 40); fov = 40; }
    const k = 1 - Math.exp(-dt * 3.5); c.look.lerp(new THREE.Vector3(bw.x, by + 0.4, bw.z), 1 - Math.exp(-dt * 5)); if (!c.init) { c.pos.copy(pos); c.init = true; } c.pos.lerp(pos, mode === 0 ? 1 : k); K.position.copy(c.pos); K.lookAt(c.look); if (Math.abs(K.fov - fov) > 0.05) { K.fov += (fov - K.fov) * 0.08; K.updateProjectionMatrix(); }
  }
  nearOffice(p) { return Math.hypot(p.pos.x - this.officePos.x, p.pos.z - this.officePos.z) < 3.2; }
  nearGate(p) { return Math.hypot(p.pos.x - this.gatePos.x + 2.5, p.pos.z - this.gatePos.z) < 3.5; }
  // ------------------------------------------------------------------ per frame
  update(dt) {
    this.t += dt; this.refreshAudience(); this.uTime.value = this.t;
    let dmin = 9999; for (const q of this.world.players) dmin = Math.min(dmin, Math.hypot(q.x() - this.cx, q.z() - this.cz)); this.near = (!this.world.potato && dmin < (this.world.lowGpu ? 220 : 300)) || this.watchers.size > 0 || this.joined.length > 0; this.group.visible = this.near; { const crowdOn = (!this.world.lowGpu && dmin < 140) || this.watchers.size > 0 || this.joined.length > 0; if (this.crowdBody) this.crowdBody.visible = this.crowdHead.visible = crowdOn; } this.excite = Math.max(0.12, this.excite - dt * 0.18); this.uExc.value = this.excite;
    this.waveT += dt; const doWave = this.excite < 0.35 && Math.floor(this.t / 70) % 3 === 1 && (this.t % 70) < 14; this.wave += ((doWave ? 1 : 0) - this.wave) * Math.min(1, dt * 2); this.uWave.value = this.wave;
    if (this.state === 'pre') { this.stateT -= dt; if (Math.floor(this.stateT * 2) % 2 === 0 && Math.abs(this.stateT % 1) < dt) { this.drawPoster(); this.drawBoard(); } if (this.stateT <= 0) this.startMatch(); }
    else if (this.state === 'half') { this.stateT -= dt; if (this.match && this.match.phase === 'halftime') { /* engine handles restart */ } if (this.stateT < 0) this.state = 'live'; }
    else if (this.state === 'post') { this.stateT -= dt; if (Math.abs(this.stateT % 5) < dt) { this.drawBoard(); this.drawPoster(); } if (this.stateT <= 0) { for (const p of [...this.watchers]) { p.say('The stadium empties…', 3); this.leave(p); } this.nextFixture(); } }
    const m = this.match;
    if (m && (this.state === 'live' || this.state === 'half')) {
      this.acc = Math.min(0.25, (this.acc || 0) + dt); let n = 0; const ins = this.joined.map(p => p.fbInput || { mx: 0, my: 0 }); while (this.acc >= 1 / 90 && n++ < 12) { m.step(1 / 90, ins); this.acc -= 1 / 90; for (const i of ins) { i.passPressed = i.shootPressed = i.throughPressed = i.lobPressed = i.skillPressed = i.switchPressed = false; } }
      if (this.match.phase === 'fulltime' && this.state !== 'post') this.finish();
      const b = this.W(m.ball.x, m.ball.z); this.ball.position.set(b.x, Math.max(0.2, m.ball.y), b.z); this.ball.rotation.x += m.ball.vx * dt * 2; this.ball.rotation.z -= m.ball.vz * dt * 2; this.ballShadow.position.set(b.x, 0.13, b.z);
      if (this.near) for (const pl of this.players) { const s = pl.sim, w = this.W(s.x, s.z); pl.root.position.set(w.x, 0.12, w.z); pl.root.rotation.y = Math.PI / 2 - s.face; this.setAnim(pl, s.anim); pl.mixer.update(dt); }
      if (this.near) for (const pl of this.officials) { const s = pl.sim, w = this.W(s.x, s.z); pl.root.position.set(w.x, 0.12, w.z); pl.root.rotation.y = Math.PI / 2 - (s.face || 0); this.setAnim(pl, s.anim === 'Idle' ? 'Idle' : (s.speed > 4 ? 'Run' : s.speed > 0.6 ? 'Jog' : 'Idle')); pl.mixer.update(dt); }
      if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.drawBoard();
    } else { for (const pl of this.players) pl.mixer.update(dt); }
    // football players: marker ring under the controlled player + HUD
    if (m && this.joined.length) { while (this.rings.length < this.joined.length) { const r = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 28), new THREE.MeshBasicMaterial({ color: 0xffd23a, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false })); r.rotation.x = -Math.PI / 2; this.group.add(r); this.rings.push(r); } this.joined.forEach((p, i) => { const h = m.humans[i], r = this.rings[i]; if (h && h.player) { const w = this.W(h.player.x, h.player.z); r.position.set(w.x, 0.16, w.z); r.visible = true; r.material.color.set(['#ffd23a', '#4dd2ff', '#ff7ad9', '#9dff6b'][i % 4]); } else r.visible = false; const A = this.teamA, B = this.teamB; p.sbHtml = `<b>${A.short}</b> ${this.score[0]} - ${this.score[1]} <b>${B.short}</b> &nbsp; ${this.clockText()}`; p.prompt = null; }); }
    if (this.state === 'post' && this.joined.length && this.stateT < 30) for (const p of [...this.joined]) this.leaveMatch(p);
    // watchers: HUD text
    for (const p of this.watchers) { const A = this.teamA, B = this.teamB; p.sbHtml = `<b>${A.short}</b> ${this.score[0]} - ${this.score[1]} <b>${B.short}</b> &nbsp; ${this.clockText()}`; p.prompt = 'C  camera view   ·   F  stand up'; }
    // stadium ambience level by distance to the nearest player
    let d = 9999; for (const p of this.world.players) d = Math.min(d, Math.hypot(p.x() - this.cx, p.z() - this.cz)); const lvl = this.commentOK ? 1 : (this.state === 'live' || this.state === 'half' ? clamp(1.1 - d / 140, 0, 0.7) : clamp(0.5 - d / 160, 0, 0.35)); Audio.stadiumLevel && Audio.stadiumLevel(lvl, this.excite);
    this.flash = Math.max(0, (this.flash || 0) - dt);
  }
  refreshAudience() { let d = 9999; for (const p of this.world.players) d = Math.min(d, Math.hypot(p.x() - this.cx, p.z() - this.cz)); this.commentOK = this.watchers.size > 0 || this.joined.length > 0; this.crowdVol = this.commentOK ? 1 : Math.max(0, Math.min(1, 1.1 - d / 140)) * 0.7; }
  distance(x, z) { return Math.hypot(x - this.cx, z - this.cz); }
}
