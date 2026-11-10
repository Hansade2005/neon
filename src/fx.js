// Particle effects: fire, smoke, sparks (one Points object, additive + normal passes).
import * as THREE from 'three';
const MAX = 700;
export class FX {
  constructor(scene) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const tex = new THREE.CanvasTexture(c);
    this.layers = {}; for (const [name, additive] of [['fire', true], ['smoke', false]]) {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), siz = new Float32Array(MAX); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));
      const mat = new THREE.PointsMaterial({ map: tex, vertexColors: true, size: 2, sizeAttenuation: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: additive ? 1 : 0.55 });
      mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('uniform float size;', 'attribute float size2; uniform float size;').replace('gl_PointSize = size;', 'gl_PointSize = size * size2;').replace('#include <fog_vertex>', '#include <fog_vertex>\n gl_PointSize = min(gl_PointSize, 120.0);'); };
      geo.setAttribute('size2', new THREE.BufferAttribute(siz, 1)); const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts); this.layers[name] = { pts, pos, col, siz, p: [] };
    }
  }
  emit(layer, x, y, z, vx, vy, vz, life, size, color, grow = 1) { const L = this.layers[layer]; if (L.p.length >= MAX) L.p.shift(); L.p.push({ x, y, z, vx, vy, vz, life, max: life, size, color, grow }); }
  fire(x, y, z, n = 3, spread = 1) { for (let i = 0; i < n; i++) this.emit('fire', x + (Math.random() - 0.5) * spread, y, z + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 0.8, 1.6 + Math.random() * 2.2, (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.5, 2.2 + Math.random() * 1.6, [1, 0.45 + Math.random() * 0.35, 0.1], 0.7); }
  smoke(x, y, z, n = 2, dark = 0.2) { for (let i = 0; i < n; i++) this.emit('smoke', x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), (Math.random() - 0.5) * 0.7 + 0.5, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 0.7, 2.2 + Math.random() * 2, 2.5 + Math.random() * 2, [dark, dark, dark], 1.8); }
  blast(x, y, z) { for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, s = 2 + Math.random() * 9, up = Math.random() * 7; this.emit('fire', x, y, z, Math.cos(a) * s, up, Math.sin(a) * s, 0.4 + Math.random() * 0.7, 3 + Math.random() * 3, [1, 0.5 + Math.random() * 0.4, 0.1], 0.5); } for (let i = 0; i < 40; i++) this.smoke(x, y + 0.5, z, 1, 0.12); }
  update(dt) {
    for (const k in this.layers) {
      const L = this.layers[k]; let n = 0; const keep = [];
      for (const p of L.p) { p.life -= dt; if (p.life <= 0) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (k === 'smoke') p.vy *= 1 - dt * 0.3; keep.push(p); }
      L.p = keep;
      for (const p of keep) { const t = p.life / p.max; L.pos[n * 3] = p.x; L.pos[n * 3 + 1] = p.y; L.pos[n * 3 + 2] = p.z; const f = k === 'fire' ? t : 1; L.col[n * 3] = p.color[0] * f; L.col[n * 3 + 1] = p.color[1] * f; L.col[n * 3 + 2] = p.color[2] * f; L.siz[n] = p.size * (1 + (1 - t) * p.grow) * (k === 'smoke' ? 1 : t * 0.9 + 0.2); n++; }
      L.pts.geometry.setDrawRange(0, n); for (const a of ['position', 'color', 'size', 'size2']) L.pts.geometry.attributes[a].needsUpdate = true;
    }
  }
}
