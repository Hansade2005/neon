// Characters: skinned people (Blender/MPFB models) driven by the shared Mixamo-retargeted clip library.
import { lowify } from './lowgpu.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const CAST = [
  { id: 'm1', name: 'Marcus Okoye', g: 'm' }, { id: 'm2', name: 'Kenji Arakawa', g: 'm' }, { id: 'm3', name: 'Dante Moreau', g: 'm' }, { id: 'm4', name: 'Rafael Duarte', g: 'm' }, { id: 'm5', name: 'Idris Mbaye', g: 'm' }, { id: 'm6', name: 'Viktor Lind', g: 'm' },
  { id: 'f1', name: 'Elena Varga', g: 'f' }, { id: 'f2', name: 'Aiko Tanaka', g: 'f' }, { id: 'f3', name: 'Amara Nwosu', g: 'f' }, { id: 'f4', name: 'Sofia Ricci', g: 'f' }, { id: 'f5', name: 'Mei Chen', g: 'f' }, { id: 'f6', name: 'Grace Adeyemi', g: 'f' },
];
export const STAFF = [{ id: 'cop_m', name: 'Officer Reyes', g: 'm', role: 'police' }, { id: 'cop_f', name: 'Officer Walker', g: 'f', role: 'police' }, { id: 'doc_m', name: 'Dr. Tanaka', g: 'm', role: 'doctor' }, { id: 'doc_f', name: 'Dr. Moreau', g: 'f', role: 'doctor' }, { id: 'medic_m', name: 'Paramedic Mbaye', g: 'm', role: 'medic' }, { id: 'ghost', name: 'Dante Kane', g: 'm', role: 'villain' }, { id: 'thug_a', name: 'Goon', g: 'm', role: 'thug' }, { id: 'thug_b', name: 'Goon', g: 'm', role: 'thug' }, { id: 'lena', name: 'Agent Ortiz', g: 'f', role: 'agent' }, { id: 'rex', name: 'Rex Holloway', g: 'm', role: 'guard' }];
const loader = new GLTFLoader(); const cache = {}; let animsP = null;
const load = (url) => (cache[url] ||= loader.loadAsync(url));
export async function clips() { animsP ||= load('../assets/models/anims.glb').then(g => { const m = {}; for (const c of g.animations) m[c.name] = c; return m; }); return animsP; }
const TEMPLATE_H = 1.76;

export class Person {
  constructor(root, mixer, clipMap, info, height) { this.root = root; this.mixer = mixer; this.clips = clipMap; this.info = info; this.actions = {}; this.cur = null; this.height = height; }
  play(name, { fade = 0.25, loop = true, speed = 1, clamp = false } = {}) {
    if (this.cur === name && loop) return this.actions[name];
    const clip = this.clips[name]; if (!clip) return null;
    let a = this.actions[name]; if (!a) { a = this.mixer.clipAction(clip); this.actions[name] = a; }
    a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = clamp || !loop; a.timeScale = speed; a.enabled = true; a.setEffectiveWeight(1);
    const prev = this.cur && this.actions[this.cur]; if (prev && prev !== a) a.crossFadeFrom(prev, fade, false);
    a.play(); this.cur = name; return a;
  }
  update(dt) { this.mixer.update(dt); }
  dispose() { this.root.parent && this.root.parent.remove(this.root); }
}
// Build a person. Skeleton is cloned per instance; clips are scaled for the person's height (pelvis translation only).
export async function spawnPerson(id) {
  const info = CAST.concat(STAFF).find(c => c.id === id) || CAST[0], gltf = await load(`../assets/models/person_${info.id}.glb`), all = await clips();
  const root = SkeletonUtils.clone(gltf.scene); root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; if (o.material) { o.material = o.material.clone(); o.material.envMapIntensity = 0.6; if (o.material.map) o.material.map.anisotropy = 4; } } }); lowify(root);
  const box = new THREE.Box3().setFromObject(root), height = box.max.y - box.min.y, ratio = height / TEMPLATE_H, scaled = {};
  for (const [n, c] of Object.entries(all)) {
    const tracks = c.tracks.filter(t => !t.name.startsWith('Root.') && !t.name.startsWith('Armature.')).map(t => { if (t.name.endsWith('pelvis.position')) { const v = t.values.slice(); for (let i = 0; i < v.length; i++) v[i] *= ratio; return new THREE.VectorKeyframeTrack(t.name, t.times, v); } return t; });
    scaled[n] = new THREE.AnimationClip(n, c.duration, tracks);
  }
  const wrap = new THREE.Group(); wrap.add(root);
  return new Person(wrap, new THREE.AnimationMixer(root), scaled, info, height);
}
