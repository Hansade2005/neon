// Fixed pool of point lights. Adding or removing a light changes the shader programs (a multi-second hitch on weaker GPUs),
// so every temporary light (muzzle flash, explosion glow, interior lighting) is borrowed from a pool that always stays in the scene.
import * as THREE from 'three';
export class LightPool {
  constructor(scene, n) { this.scene = scene; this.lights = []; for (let i = 0; i < n; i++) { const L = new THREE.PointLight(0xffffff, 0, 10, 1.6); L.free = true; scene.add(L); this.lights.push(L); } }
  acquire() { const L = this.lights.find(l => l.free); if (!L) return null; L.free = false; return L; }
  release(L) { if (!L) return; L.intensity = 0; L.free = true; if (L.parent !== this.scene) this.scene.add(L); L.position.set(0, -50, 0); }
  tick() { for (const L of this.lights) { let p = L.parent; while (p && !p.isScene) p = p.parent; if (!p) { this.scene.add(L); L.intensity = 0; L.free = true; L.position.set(0, -50, 0); } } }
}
