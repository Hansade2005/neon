// The living world: city + vehicles + pedestrians + players, one physics/AI step per frame.
import { LightPool } from './lights.js';
import * as THREE from 'three';
import { City, onRoad, nodePos, HALF } from './city.js';
import { createVehicle, addHeadlights } from './vehicle.js';
import { spawnTrafficCar, spawnParkedCar, driveAI, spawnPed, updatePed, scareNear } from './npc.js';
import { FX } from './fx.js';
import { Club, Hospital, Station } from './venues.js';
import { Arena } from './arena.js';
import { Mansion } from './mansion.js';
import { spawnPerson, CAST } from './people.js';
import { seatFor } from './vehicle.js';
const hyp = Math.hypot;

export class World {
  constructor(scene, renderer, opts) {
    this.scene = scene; this.renderer = renderer; this.fxLights = new LightPool(scene, 1); this.city = new City(THREE, scene, opts); this.vehicles = []; this.peds = []; this.players = []; this.t = 0; this.cfg = { traffic: opts.traffic ?? 22, peds: opts.peds ?? 18 }; this.spawning = 0; this.events = []; this.fx = new FX(scene); this.driverLoading = 0; this.pois = []; const S = this.city.special || {}; if (S.hospital) { this.hospital = new Hospital(this, S.hospital.cx, S.hospital.cz); this.pois.push({ x: S.hospital.cx, z: S.hospital.cz, color: '#ff3b3b', r: 5 }); } if (S.police) { this.station = new Station(this, S.police.cx, S.police.cz); this.pois.push({ x: S.police.cx, z: S.police.cz, color: '#3b6bff', r: 5 }); }
    if (opts.story) { this.mansion = new Mansion(this, -430, 0); this.pois.push({ x: -430, z: 0, color: '#ffd23a', r: 6 }); }
    if (opts.arena !== false) { const x0 = HALF + 9 + 1; this.arena = new Arena(this, 430, 0, x0); this.pois.push({ x: 430, z: 0, color: '#7cff5a', r: 6 }); }
    if (this.city.clubBlock && opts.club !== false) { this.club = new Club(this, this.city.clubBlock.cx, this.city.clubBlock.cz); this.pois.push({ x: this.city.clubBlock.cx, z: this.city.clubBlock.cz, color: '#ff2bd6', r: 5 }); }
    const pm = new THREE.PMREMGenerator(renderer); import('three/examples/jsm/environments/RoomEnvironment.js').then(m => { this.city.setEnvironment(pm.fromScene(new m.RoomEnvironment(), 0.04).texture); });
  }
  playerCenters() { return this.players.map(p => ({ x: p.x(), z: p.z() })); }
  async addVehicle(id, x, z, h, paint, kind = 'parked') { const v = await createVehicle(this.scene, id, x, z, h, paint); v.kind = kind; this.vehicles.push(v); if (this.city.lightsOn) addHeadlights(v, kind === 'player'); return v; }
  groundAt(x, z, y) {
    let h = onRoad(x, z) ? 0 : 0.16; if (this.sea) { if (x > 950 && x < 1105 && Math.abs(z - 150) < 4.2) h = 1.4; else { const dp = this.sea.depth(x, z); if (dp > 0) h = h * (1 - dp) + (-0.45 + Math.sin(x * 0.045 + this.t * 1.3) * 0.1) * dp; } }
    for (const v of this.vehicles) { const c = v.car, ox = x - c.x, oz = z - c.z; if (Math.abs(ox) > 4 || Math.abs(oz) > 4 || v.exploded) continue; const s = Math.sin(c.h), co = Math.cos(c.h), lx = ox * co - oz * s, lz = ox * s + oz * co; if (Math.abs(lx) < c.spec.body.W / 2 && Math.abs(lz) < c.spec.body.L / 2 && y >= 0.55) h = Math.max(h, c.spec.bike ? 0.95 : 1.28 + (c.spec.id === 'atlas' ? 0.3 : 0)); }
    return h;
  }
  collideCircle(pos, r, py = 0) {
    for (const b of this.city.near(pos.x, pos.z, r + 2)) {
      const px = Math.max(b.minX, Math.min(pos.x, b.maxX)), pz = Math.max(b.minZ, Math.min(pos.z, b.maxZ)); let dx = pos.x - px, dz = pos.z - pz, d = hyp(dx, dz);
      if (d < r) { if (d < 1e-4) { dx = pos.x - (b.minX + b.maxX) / 2; dz = pos.z - (b.minZ + b.maxZ) / 2; d = hyp(dx, dz) || 1; } pos.x += dx / d * (r - d); pos.z += dz / d * (r - d); }
    }
    for (const v of this.vehicles) {
      const c = v.car, ox = pos.x - c.x, oz = pos.z - c.z; if (Math.abs(ox) > 4 || Math.abs(oz) > 4 || py > 0.85) continue;
      const s = Math.sin(c.h), co = Math.cos(c.h), lx = ox * co - oz * s, lz = ox * s + oz * co, hw = c.spec.body.W / 2 + r, hl = c.spec.body.L / 2 + r;   // left-axis, forward-axis
      if (Math.abs(lx) < hw && Math.abs(lz) < hl) { const px = hw - Math.abs(lx), pz = hl - Math.abs(lz); if (px < pz) { const sg = Math.sign(lx) || 1; pos.x += co * sg * px; pos.z += -s * sg * px; } else { const sg = Math.sign(lz) || 1; pos.x += s * sg * pz; pos.z += co * sg * pz; } }
    }
  }
  collideStatic(car) {
    const W = car.spec.collW || car.spec.body.W, L = car.spec.body.L, rad = W * 0.5, off = [-(L / 2 - rad - 0.1), 0, L / 2 - rad - 0.1]; let hit = 0;
    for (const o of off) {
      const cx = car.x + Math.sin(car.h) * o, cz = car.z + Math.cos(car.h) * o;
      for (const b of this.city.near(cx, cz, rad + 2)) {
        if (b.airOnly && !car.air) continue; if (car.air && car.y > (b.h || 0) + 2) continue;
        const px = Math.max(b.minX, Math.min(cx, b.maxX)), pz = Math.max(b.minZ, Math.min(cz, b.maxZ)); let dx = cx - px, dz = cz - pz, d = hyp(dx, dz);
        if (d < rad) { if (d < 1e-4) { dx = cx - (b.minX + b.maxX) / 2; dz = cz - (b.minZ + b.maxZ) / 2; d = hyp(dx, dz) || 1; } const nx = dx / d, nz = dz / d; car.x += nx * (rad - d); car.z += nz * (rad - d); hit = Math.max(hit, car.bounce(nx, nz, 0.3)); }
      }
    }
    return hit;
  }
  carCar(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = hyp(dx, dz), min = (a.len + b.len) * 0.3 + 0.4; if (d >= min || d < 1e-4) return 0;
    const nx = dx / d, nz = dz / d, push = (min - d) / 2; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
    const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; if (rv >= 0) return 0; const j = -1.3 * rv / (1 / a.mass + 1 / b.mass);
    a.vx -= j * nx / a.mass; a.vz -= j * nz / a.mass; b.vx += j * nx / b.mass; b.vz += j * nz / b.mass; return -rv;
  }
  update(dt) {
    this.fxLights.tick(); this.t += dt; const steps = Math.ceil(dt / (1 / 120)), h = dt / steps, vs = this.vehicles;
    for (const v of vs) if (v.ai) driveAI(this, v, dt);
    for (let s = 0; s < steps; s++) {
      for (const v of vs) { const c = v.car; c.onSidewalk = !onRoad(c.x, c.z); c.step(h); if (!(isFinite(c.x) && isFinite(c.z) && isFinite(c.y) && isFinite(c.h))) { c.x = c.lx ?? 0; c.z = c.lz ?? 0; c.y = 0; c.h = c.lh ?? 0; c.vx = c.vz = c.vy = 0; c.speed = 0; c.fwd = 0; } else { c.lx = c.x; c.lz = c.z; c.lh = c.h; } const hit = this.collideStatic(c); if (c.groundHit) { v.damage(c.groundHit); if (v.owner) v.owner.cam.shake = 0.6; this.events.push({ type: 'crash', v, hit: c.groundHit }); c.groundHit = 0; } if (hit > 4 && v.owner) { v.owner.cam.shake = Math.min(0.6, hit * 0.03); this.events.push({ type: 'crash', v, hit }); } if (hit > 6 && v.kind === 'traffic') v.ai = null; if (hit > 6) v.damage(hit * 1.3); }
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const hit = (vs[i].car.air && vs[i].car.y > 3) || (vs[j].car.air && vs[j].car.y > 3) ? 0 : this.carCar(vs[i].car, vs[j].car); if (hit > 3) { this.events.push({ type: 'crash', v: vs[i], hit }); if (hit > 5) { vs[i].damage(hit * 1.1); vs[j].damage(hit * 1.1); if (vs[j].kind === 'traffic' && hit > 6) vs[j].ai = null; if (vs[i].kind === 'traffic' && hit > 6) vs[i].ai = null; } const o = vs[i].owner || vs[j].owner; if (o) o.cam.shake = Math.min(0.6, hit * 0.04); } }
    }
    for (const v of vs) v.update(dt);
    // distance culling: cars and people far from every player cost draw calls but are invisible detail
    if ((this.cullT = (this.cullT || 0) + dt) > 0.25) {
      this.cullT = 0;
      for (const v of vs) { let d2 = 1e12; for (const p of this.players) { const dx = p.x() - v.car.x, dz = p.z() - v.car.z; d2 = Math.min(d2, dx * dx + dz * dz); } v.root.visible = d2 < (this.potato ? 4900 : this.lowGpu ? 19600 : 52900) || !!v.owner || v.kind === 'player'; }
      for (const q of this.peds) { let d2 = 1e12; for (const p of this.players) { const dx = p.x() - q.x, dz = p.z() - q.z; d2 = Math.min(d2, dx * dx + dz * dz); } q.person.root.visible = d2 < (this.potato ? 2025 : this.lowGpu ? 8100 : 28900); }
    }
    // pedestrians react to speeding cars
    for (const v of vs) if (v.car.speed > 9) scareNear(this, v.car.x + Math.sin(v.car.h) * 3, v.car.z + Math.cos(v.car.h) * 3, 3.2);
    for (const p of this.peds) updatePed(this, p, dt);
    this.updateDamage(dt); this.fx.update(dt); this.club && this.club.update(dt); this.hospital && this.hospital.update(dt); this.arena && this.arena.update(dt); this.mansion && this.mansion.update(dt); this.station && this.station.update(dt); this.city.updateSignals(this.t); this.manage();
  }
  manage() {
    const cs = this.playerCenters().filter(c => Math.abs(c.x) < 760 && Math.abs(c.z) < 760); if (!cs.length) return; const far = (x, z, R) => cs.every(c => hyp(c.x - x, c.z - z) > R);
    for (let i = this.vehicles.length - 1; i >= 0; i--) { const v = this.vehicles[i]; if (v.kind === 'traffic' && far(v.car.x, v.car.z, 280)) { this.scene.remove(v.root); this.vehicles.splice(i, 1); } }
    for (let i = this.peds.length - 1; i >= 0; i--) { const p = this.peds[i]; if (!p.keep && far(p.x, p.z, 170)) { p.person.dispose(); this.peds.splice(i, 1); } }
    // NPC drivers appear in nearby traffic cars (seated, visible through the glass) and are removed when far away
    if (this.driverLoading === 0) { for (const v of this.vehicles) { if (v.kind !== 'traffic') continue; const near = cs.some(c => hyp(c.x - v.car.x, c.z - v.car.z) < 55); if (near && !v.driverPerson && !v.driverTried) { v.driverTried = true; this.driverLoading++; this.attachDriver(v).finally(() => this.driverLoading--); break; } if (!near && v.driverPerson) { v.root.remove(v.driverPerson.root); v.driverPerson = null; v.driverTried = false; } } }
    // a steady supply of free parked cars and bikes around every player, so a replacement is never far away
    for (let i = this.vehicles.length - 1; i >= 0; i--) { const v = this.vehicles[i]; if ((v.kind === 'parked' && !v.exploded && !v.keep && far(v.car.x, v.car.z, 280)) || (v.kind === 'wreck' && far(v.car.x, v.car.z, 160))) { this.scene.remove(v.root); this.vehicles.splice(i, 1); } }
    if (this.spawning === 0) { const c0 = cs[(Math.random() * cs.length) | 0], near = this.vehicles.filter(v => v.kind === 'parked' && !v.exploded && !v.owner && Math.hypot(v.car.x - c0.x, v.car.z - c0.z) < 120).length; if (near < 8) { this.spawning++; spawnParkedCar(this, c0).finally(() => this.spawning--); return; } }
    if (this.spawning === 0) {
      const tc = this.vehicles.filter(v => v.kind === 'traffic').length, pc = this.peds.length, c = cs[(Math.random() * cs.length) | 0];
      if (tc < this.cfg.traffic * cs.length) { this.spawning++; spawnTrafficCar(this, c).finally(() => this.spawning--); }
      else if (pc < this.cfg.peds * cs.length) { this.spawning++; spawnPed(this, c).finally(() => this.spawning--); }
    }
  }
}

World.prototype.updateDamage = function (dt) {
  for (const v of this.vehicles) {
    const c = v.car;
    if (v.exploded) { v.fireT += dt; c.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 }; if (v.fireT < 28) { this.fx.fire(c.x, 0.9, c.z, 2, 1.4); this.fx.smoke(c.x, 1.4, c.z, 1, 0.1); if (v.light) { v.light.intensity = 14 + Math.random() * 8; } } else if (v.light) { this.fxLights.release(v.light); v.light = null; } continue; }
    if (v.hp < 35 && v.hp > 0) { this.fx.smoke(c.x + Math.sin(c.h) * c.spec.body.L * 0.3, 1.0, c.z + Math.cos(c.h) * c.spec.body.L * 0.3, v.hp < 18 ? 2 : 1, v.hp < 18 ? 0.12 : 0.4); if (v.hp < 18) this.fx.fire(c.x + Math.sin(c.h) * c.spec.body.L * 0.3, 0.9, c.z + Math.cos(c.h) * c.spec.body.L * 0.3, 1, 0.5); }
    if (v.fuseT) { v.fuseT -= dt; if (v.fuseT <= 0) this.explode(v); }
    if (v.hp <= 0) this.explode(v);
  }
};
World.prototype.explode = function (v) {
  if (v.exploded) return; v.lastOwner = v.owner; v.exploded = true; v.hp = 0; v.fireT = 0; const c = v.car, W = this;
  this.fx.blast(c.x, 1, c.z); this.events.push({ type: 'explosion', v, x: c.x, z: c.z });
  const L = this.fxLights.acquire(); if (L) { L.color.setHex(0xff7a1a); L.intensity = 30; L.distance = 28; L.position.set(0, 1.4, 0); v.root.add(L); v.light = L; }
  v.root.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (/Paint/.test(o.material.name)) { o.material.color.set(0x0c0c0c); o.material.roughness = 0.95; o.material.metalness = 0.1; } if (/Glass/.test(o.material.name)) o.material.color.set(0x050505); } });
  v.setDoor('L', true); v.setDoor('R', true); v.siren = false; v.kind = 'wreck'; v.ai = null; c.vy = 3; c.vx += (Math.random() - 0.5) * 3; c.vz += (Math.random() - 0.5) * 3; c.health = 0;
  if (v.driverPerson) { v.root.remove(v.driverPerson.root); v.driverPerson = null; }
  for (const o of this.vehicles) { if (o === v) continue; const dx = o.car.x - c.x, dz = o.car.z - c.z, d = Math.hypot(dx, dz); if (d < 12) { o.car.vx += dx / (d || 1) * 9; o.car.vz += dz / (d || 1) * 9; o.damage(60 * (1 - d / 12)); } }
  for (const ped of this.peds) { const d = Math.hypot(ped.x - c.x, ped.z - c.z); if (d < 9 && !ped.dead) { ped.hp = 0; ped.dead = true; ped.deadT = 0; ped.mode = 'dead'; ped.person.play('Die', { loop: false, speed: 1.4, fade: 0.05 }); } }
  for (const p of this.players) { const d = Math.hypot(p.x() - c.x, p.z() - c.z); if (p.vehicle === v && (p.state === 'car' || p.state === 'enter')) { p.hp -= 75; p.ejectFromWreck && p.ejectFromWreck(); } else if (d < 7) { p.hp -= 70 * (1 - d / 7); p.cam.shake = 0.5; } }
};
World.prototype.attachDriver = async function (v, id) {
  const person = await spawnPerson(id || CAST[(Math.random() * CAST.length) | 0].id); if (v.driverPerson || v.dead || !this.vehicles.includes(v) || v.exploded) return;
  const st = seatFor(v.id); v.root.add(person.root); person.root.position.copy(st); person.play('Drive'); v.driverPerson = person;
};
World.prototype.ejectDriver = function (v, doorPos) {
  const person = v.driverPerson; if (!person) return null; v.driverPerson = null; v.root.remove(person.root); this.scene.add(person.root);
  const ang = Math.random() * 6.28, ped = { person, cx: doorPos.x, cz: doorPos.z, t: 0, cw: false, x: doorPos.x, z: doorPos.z, yaw: Math.random() * 6.28, mode: 'walk', speed: 1.3, kind: 'ped', hp: 100, fleeT: 0, stunT: 1.1 };
  person.play('Hit', { loop: false, speed: 1.1, fade: 0.05 }); this.peds.push(ped); v.ai = null; v.kind = 'parked'; return ped;
};
