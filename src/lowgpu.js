// Weak-GPU mode (Intel UHD / integrated graphics): swap physically-based materials (clearcoat car paint, IBL, specular) for cheap Lambert
// shading. These shaders are several times faster per pixel and compile in a fraction of the time (the first frames used to take 10-17 s).
import * as THREE from 'three';
const cache = new WeakMap();
export const lowMode = () => !!window.__lowGpu;
function lamb(m) {
  if (!m || !m.isMaterial || m.isMeshLambertMaterial || m.isMeshBasicMaterial || !m.isMeshStandardMaterial) return m;   // physical extends standard
  if (m.onBeforeCompile && String(m.onBeforeCompile).length > 30) return m;   // custom shaders (sea waves, crowd wave) stay as they are
  let l = cache.get(m); if (l) return l;
  l = new THREE.MeshLambertMaterial({ color: m.color.clone(), map: m.map || null, emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0), emissiveMap: m.emissiveMap || null, emissiveIntensity: m.emissiveIntensity ?? 1, vertexColors: !!m.vertexColors, flatShading: !!m.flatShading, transparent: !!m.transparent, opacity: m.opacity ?? 1, side: m.side, depthWrite: m.depthWrite, alphaTest: m.alphaTest || 0, polygonOffset: !!m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor || 0, polygonOffsetUnits: m.polygonOffsetUnits || 0 });
  l.name = m.name; l.userData = m.userData; if (m.name === 'Glass') { l.transparent = true; l.opacity = 0.55; l.color.set(0x0a1018); }
  cache.set(m, l); return l;
}
// convert every mesh under root that has not been converted yet
export function lowify(root) {
  if (!lowMode()) return;
  root.traverse(o => { if (!o.isMesh || o.userData.lowDone) return; o.userData.lowDone = true; if (Array.isArray(o.material)) o.material = o.material.map(lamb); else o.material = lamb(o.material); });
}
