// A human player: walks the streets, opens doors, drives, and has a third-person camera and a viewport.
import * as THREE from 'three';
import { spawnPerson } from './people.js';
import { seatFor, isBike } from './vehicle.js';
import { onRoad } from './city.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const WALK = 2.6, RUN = 7.0, SPRINT = 9.4;

export class Player {
  constructor(world, index, device, personId) {
    this.world = world; this.index = index; this.device = device; this.personId = personId; this.state = 'foot'; this.pos = new THREE.Vector3(); this.yaw = 0; this.vel = 0;
    this.camera = new THREE.PerspectiveCamera(62, 1.6, 0.4, 1500); this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), yaw: 0, snap: true, mode: 0, shake: 0 };
    this.vehicle = null; this.seq = null; this.cash = 500; this.bank = 2500; this.coins = 25; this.heat = 0; this.msg = null; this.viewport = { x: 0, y: 0, w: 1, h: 1 }; this.prompt = null; this.stats = { distance: 0, topSpeed: 0 };
  }
  async init(x, z, yaw) { this.person = await spawnPerson(this.personId); this.world.scene.add(this.person.root); this.pos.set(x, 0, z); this.yaw = yaw; this.cam.yaw = yaw; this.person.play('Idle'); this.syncPerson(); }
  x() { return this.state === 'car' ? this.vehicle.car.x : this.state === 'football' && this.world.arena ? this.world.arena.cx : this.pos.x; }
  z() { return this.state === 'car' ? this.vehicle.car.z : this.state === 'football' && this.world.arena ? this.world.arena.cz : this.pos.z; }
  syncPerson() { if (this.state !== 'car') { this.person.root.position.set(this.pos.x, this.pos.y, this.pos.z); this.person.root.rotation.y = this.yaw; } }
  say(text, secs = 2.5) { this.msg = { text, t: secs }; }

  seatDirect(v) { this.vehicle = v; v.driver = this.person; v.kind = 'player'; v.ai = null; v.owner = this; this.state = 'car'; this.seq = null; v.root.add(this.person.root); const st = seatFor(v.id); this.person.root.position.copy(st); this.person.root.rotation.set(0, 0, 0); this.person.play('Drive'); this.cam.snap = true; }
  // ------------------------------------------------------------------ update
  update(dt, inp) {
    this.person.update(dt); if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    if (this.state === 'foot') this.updateFoot(dt, inp); else if (this.state === 'enter' || this.state === 'exit') this.updateSeq(dt); else if (this.state === 'car') this.updateCar(dt, inp); else if (this.state === 'watch') this.updateWatch(dt, inp); else if (this.state === 'football') this.updateFootball(dt, inp);
    this.updateCamera(dt, inp);
  }
  nearestDoor() {
    let best = null, bd = 3.4; this.prompt = null;
    for (const v of this.world.vehicles) { if (v.driver || v.dead || v.exploded || v.kind === 'cop' && false) continue; for (const s of ['L', 'R']) { const w = v.doorWorld(s), d = Math.hypot(w.x - this.pos.x, w.z - this.pos.z); if (d < bd) { bd = d; best = { v, s, w }; } } }
    if (best) this.prompt = best.v.driverPerson ? (best.v.isBike ? `F  Pull rider off ${best.v.car.spec.name}` : `F  Carjack ${best.v.car.spec.name}`) : (best.v.isBike ? `F  Ride ${best.v.car.spec.name}` : `F  Enter ${best.v.car.spec.name}`); return best;
  }
  updateFoot(dt, inp) {
    const W = this.world, cy = this.cam.yaw, mag = Math.min(1, Math.hypot(inp.mx, inp.my));
    const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    let dx = fx * inp.my + rx * inp.mx, dz = fz * inp.my + rz * inp.mx; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    this.runT = inp.run && mag > 0.5 ? (this.runT || 0) + dt : Math.max(0, (this.runT || 0) - dt * 2); this.grounded = this.grounded ?? true; this.vy = this.vy || 0;
    const sea = W.sea, swim = !!(sea && sea.depth(this.pos.x, this.pos.z) > 0.55); this.stam = this.stam ?? 1;
    if (swim && !this.swimming) { this.say('Swimming: SHIFT to swim fast · F boards a boat · head for the pier', 4); this.person.root.rotation.order = 'YXZ'; }
    this.swimming = swim; if (swim) { this.swimT = (this.swimT || 0) + dt; this.stam = Math.max(0, this.stam - (inp.run ? 0.05 : 0.008) * dt); if (this.swimT > 50 || this.stam <= 0) this.hp -= 3 * dt; } else { this.swimT = 0; this.stam = Math.min(1, this.stam + dt * 0.2); }
    const target = swim ? (mag < 0.12 ? 0 : inp.run && this.stam > 0.05 ? 3.6 : 2.2) : mag < 0.12 ? 0 : inp.run ? (this.runT > 1.4 ? SPRINT : RUN) : WALK * Math.max(0.6, mag);
    this.vel += (target - this.vel) * Math.min(1, dt * 9);
    if (mag > 0.12) { const want = Math.atan2(dx, dz); this.yaw += wrap(want - this.yaw) * Math.min(1, dt * 11); this.pos.x += dx * this.vel * dt; this.pos.z += dz * this.vel * dt; }
    // jump (V / N / pad Y): hop over cars and low obstacles, or land on a car roof
    if (inp.jump && this.grounded && !this.atk && !swim) { this.vy = 5.8; this.grounded = false; }
    const sp = this.vel; if (swim) { this.person.play(sp < 0.3 ? 'Idle' : 'Walk', { speed: sp < 0.3 ? 0.8 : Math.max(0.9, sp / 1.2), fade: 0.2 }); } else if (!this.grounded) this.person.play(this.vy > 0.5 ? 'Jump' : 'JumpDown', { loop: false, fade: 0.08 }); else if (sp < 0.25) this.person.play('Idle', { fade: 0.2 }); else if (sp < 3.4) this.person.play('Walk', { speed: Math.max(0.5, sp / 1.45), fade: 0.18 }); else this.person.play('Run', { speed: sp / 4.6, fade: 0.18 });
    // punch / kick
    if (inp.punch && !this.atk) { this.atk = 0.6; this.person.play(Math.random() < 0.5 ? 'Punch' : 'Kick', { loop: false, speed: 1.4, fade: 0.1 }); W.onAttack && W.onAttack(this); }
    if (this.atk) { this.atk -= dt; if (this.atk <= 0) { this.atk = 0; this.person.cur = null; } }
    W.collideCircle(this.pos, 0.36, this.pos.y);
    const gh = W.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.grounded) { if (this.pos.y > gh + 0.25) this.grounded = false; else this.pos.y += (gh - this.pos.y) * Math.min(1, dt * 18); }
    if (!this.grounded) { this.vy -= 14 * dt; this.pos.y += this.vy * dt; if (this.vy <= 0 && this.pos.y <= gh) { this.pos.y = gh; this.vy = 0; this.grounded = true; } }
    this.syncPerson(); if (this.person.root.rotation.order === 'YXZ') { const tl = this.swimming && this.vel > 0.4 ? 1.15 : this.swimming ? 0.35 : 0; this.person.root.rotation.x += (tl - this.person.root.rotation.x) * Math.min(1, dt * 6); }
    const door = this.nearestDoor(), kiosk = this.world.gp && this.world.gp.nearKiosk(this); if (inp.interact && door && !kiosk) this.startEnter(door);
  }
  // ------------------------------------------------------------------ doors / entering / exiting
  startEnter({ v, s, w }) { const jack = !!v.driverPerson; this.state = 'enter'; this.vehicle = v; v.driver = this.person; v.kind = 'player'; v.ai = null; v.owner = this; this.seq = { t: jack ? -0.7 : 0, side: s, from: this.pos.clone(), door: w, phase: 0, jack, ejected: false }; this.prompt = null; if (jack) { this.person.play('Punch', { loop: false, speed: 1.6, fade: 0.08 }); this.world.gp && this.world.gp.addHeat(this, 1.4); } v.car.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 }; }
  seatWorld() { const v = this.vehicle, c = v.car, st = seatFor(v.id), s = Math.sin(c.h), co = Math.cos(c.h); return { x: c.x + co * st.x + s * st.z, z: c.z - s * st.x + co * st.z, y: c.y + st.y }; }
  updateSeq(dt) {
    const q = this.seq, v = this.vehicle, c = v.car; q.t += dt;
    if (this.state === 'enter') {
      if (q.t < 0) { const w = v.doorWorld(q.side); this.pos.x += (w.x - this.pos.x) * Math.min(1, dt * 9); this.pos.z += (w.z - this.pos.z) * Math.min(1, dt * 9); this.yaw += wrap(Math.atan2(c.x - this.pos.x, c.z - this.pos.z) - this.yaw) * Math.min(1, dt * 12); if (q.t > -0.35 && !q.ejected) { q.ejected = true; v.setDoor(q.side, true); const ped = this.world.ejectDriver(v, w); if (this.world.gp) this.world.gp.audioPunch && this.world.gp.audioPunch(); } q.from = this.pos.clone(); this.syncPerson(); return; }
      v.car.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 };
      if (q.t < 0.75) { const k = Math.min(1, q.t / 0.75), w = v.doorWorld(q.side); this.pos.x = q.from.x + (w.x - q.from.x) * k; this.pos.z = q.from.z + (w.z - q.from.z) * k; this.yaw += wrap(Math.atan2(c.x - this.pos.x, c.z - this.pos.z) - this.yaw) * Math.min(1, dt * 10); this.person.play('Walk', { speed: 1.2 }); }
      if (v.isBike) { if (q.phase < 2) { q.phase = 2; q.from2 = this.pos.clone(); this.person.play('Idle'); } const k = clamp((q.t - 0.0) / 0.55, 0, 1), sw = this.seatWorld(), e = k * k * (3 - 2 * k); this.pos.x = q.from2.x + (sw.x - q.from2.x) * e; this.pos.z = q.from2.z + (sw.z - q.from2.z) * e; this.pos.y = sw.y * e; this.yaw += wrap(c.h - this.yaw) * Math.min(1, dt * 10); if (q.t > 0.6) { this.attachToCar(); this.state = 'car'; this.person.play('Drive', { fade: 0.15 }); this.seq = null; this.say(v.car.spec.name, 2); } this.syncPerson(); return; }
      if (q.t >= 0.25 && q.phase === 0) { q.phase = 1; v.setDoor(q.side, true); }
      if (q.t >= 0.8 && q.phase === 1) { q.phase = 2; this.person.play('EnterCar', { loop: false, speed: 2.4, fade: 0.1 }); q.from2 = this.pos.clone(); }
      if (q.phase === 2) { const k = clamp((q.t - 0.8) / 1.5, 0, 1), sw = this.seatWorld(), e = k * k * (3 - 2 * k); this.pos.x = q.from2.x + (sw.x - q.from2.x) * e; this.pos.z = q.from2.z + (sw.z - q.from2.z) * e; this.pos.y = sw.y * e; this.yaw += wrap(c.h - this.yaw) * Math.min(1, dt * 8); if (q.t > 2.3) { q.phase = 3; this.attachToCar(); v.setDoor(q.side, false); } }
      if (q.phase === 3 && q.t > 2.9) { this.state = 'car'; this.person.play('Drive', { fade: 0.2 }); this.seq = null; this.say(v.car.spec.name, 2); }
      this.syncPerson();
    } else {
      if (q.phase === 0) { v.setDoor(q.side, true); q.phase = 1; }
      if (q.t > 0.35 && q.phase === 1) { q.phase = 2; this.detachFromCar(q.side); this.person.play('Idle'); }
      if (q.phase === 2) { const w = v.doorWorld(q.side), k = Math.min(1, (q.t - 0.35) / 0.5); this.pos.x = q.from.x + (w.x - q.from.x) * k; this.pos.z = q.from.z + (w.z - q.from.z) * k; this.pos.y = q.from.y * (1 - k); this.yaw = c.h + (q.side === 'L' ? Math.PI / 2 : -Math.PI / 2) * (1 - k) + (q.side === 'L' ? 1 : -1) * Math.PI / 2 * k; this.syncPerson(); if (q.t > 1.0) { q.phase = 3; v.setDoor(q.side, false); } }
      if (q.t > 1.5) { this.state = 'foot'; this.seq = null; v.driver = null; v.owner = null; v.kind = 'parked'; this.yaw = c.h + Math.PI / 2 * (q.side === 'L' ? 1 : -1); this.cam.yaw = c.h; }
    }
  }
  attachToCar() { const v = this.vehicle, st = seatFor(v.id); v.root.add(this.person.root); this.person.root.position.copy(st); this.person.root.rotation.set(0, 0, 0); }
  detachFromCar(side) { const v = this.vehicle, c = v.car, st = seatFor(v.id); this.world.scene.add(this.person.root); const sw = this.seatWorld(); this.pos.set(sw.x, sw.y, sw.z); this.seq.from = this.pos.clone(); this.yaw = c.h; this.syncPerson(); }
  ejectFromWreck() { if (this.state !== 'car' && this.state !== 'enter') return; const c = this.vehicle.car; this.world.scene.add(this.person.root); this.pos.set(c.x + 2.5, 0, c.z); this.yaw = c.h; this.state = 'foot'; this.seq = null; this.vehicle.driver = null; this.vehicle.owner = null; this.person.play('Hit', { loop: false }); this.say('Car destroyed!', 2.5); }
  // ------------------------------------------------------------------ driving
  updateCar(dt, inp) {
    const v = this.vehicle, c = v.car;
    c.input = { throttle: inp.throttle, brake: inp.brake, steer: inp.steer, hand: inp.hand, nitro: inp.nitro };
    if (inp.reset) { c.h = Math.round(c.h / (Math.PI / 2)) * Math.PI / 2; c.vx = c.vz = c.yaw = 0; }
    if (inp.cam) this.cam.mode = (this.cam.mode + 1) % 3;
    this.hornOn = !!inp.horn;
    const canExit = c.kmh < 8 && (!c.air || c.y < 1.5); this.prompt = canExit ? 'F  Get out' : null;
    if (inp.interact && canExit) { this.state = 'exit'; this.seq = { t: 0, side: 'L', phase: 0, from: this.pos.clone() }; this.prompt = null; c.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 }; }
    this.pos.set(c.x, 0, c.z); this.stats.topSpeed = Math.max(this.stats.topSpeed, c.kmh);
  }
  // ------------------------------------------------------------------ camera
  updateFootball(dt, inp) { this.prompt = null; }
  updateWatch(dt, inp) { const A = this.world.arena; if (inp.cam) this.watchCam = ((this.watchCam || 0) + 1) % 4; if (inp.interact) A.leave(this); }
  setCockpit(on) {
    if (on === !!this.cockpitOn) return; this.cockpitOn = on; const v = this.vehicle; if (!v) return; const hide = ['fuselage', 'canopy', 'body', 'sidewin', 'windshield', 'hull', 'boom', 'engine', 'deck', 'console'];
    v.root.traverse(o => { if (hide.includes(o.name)) o.visible = !on; }); this.person.root.visible = !on;
  }
  updateCamera(dt, inp) {
    if (this.cut) { this.cut.apply(this.camera); return; }
    if ((this.state === 'watch' || this.state === 'football') && this.world.arena) { this.world.arena.cameraFor(this, dt, this.camera); return; }
    const cam = this.cam, K = this.camera, car = this.vehicle && this.vehicle.car, driving = this.state === 'car' || this.state === 'enter' && this.seq && this.seq.t > 2.3;
    let want, look, rate = 6.5, lrate = 9, bankT = 0;
    if (this.state === 'car' && car && car.air) {   // flight camera: follows heading, banks with the aircraft, widens FOV with speed
      const heli = car.spec.craft === 'heli', sf = Math.min(1, car.speed / 75);
      cam.yaw += wrap(car.h - cam.yaw) * (cam.snap ? 1 : 1 - Math.exp(-dt * (heli ? 2.2 : 3.4)));
      this.setCockpit(cam.mode === 2);
      if (cam.mode === 2) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(car.pitch, car.h, car.roll, 'YXZ')), eye = new THREE.Vector3(heli ? 0.3 : 0.18, heli ? 1.3 : 1.5, heli ? 1.4 : 1.15).applyQuaternion(q).add(new THREE.Vector3(car.x, car.y, car.z));
        want = eye; look = eye.clone().add(new THREE.Vector3(0, 0.02, 40).applyQuaternion(q)); rate = 40; lrate = 40; bankT = -car.roll;
      } else {
        const far = cam.mode === 1, dist = ((heli ? 15 : 17) * (far ? 1.7 : 1)) + sf * 5, hh = (heli ? 4.6 : 4.3) * (far ? 1.7 : 1) + Math.max(0, car.pitch) * dist * 0.6;
        want = new THREE.Vector3(car.x - Math.sin(cam.yaw) * dist, Math.max(1.4, car.y + hh + car.pitch * dist * 0.5), car.z - Math.cos(cam.yaw) * dist);
        look = new THREE.Vector3(car.x + Math.sin(cam.yaw) * 30, car.y + 1.6 - car.pitch * 8 + car.vy * 0.3, car.z + Math.cos(cam.yaw) * 30); rate = 5.5; lrate = 7; bankT = -car.roll * 0.45;
      }
      const fv = 64 + sf * 20 + (car.nitroOn ? 6 : 0); if (Math.abs(K.fov - fv) > 0.05) { K.fov += (fv - K.fov) * 0.08; K.updateProjectionMatrix(); }
      if (sf > 0.6 && cam.mode !== 2) cam.shake = Math.max(cam.shake || 0, (sf - 0.6) * 0.05);
    } else if (this.state === 'car' && car) {
      this.setCockpit(false);
      const sf = Math.min(1, car.speed / 60), vAng = car.speed > 6 ? Math.atan2(car.vx, car.vz) : car.h, target = car.h + wrap(vAng - car.h) * 0.35;
      cam.yaw += wrap(target - cam.yaw) * (cam.snap ? 1 : 1 - Math.exp(-dt * 3.2));
      const big = Math.max(1, car.spec.body.L / 4.9), bk = (car.spec.bike ? 0.7 : 1) * (0.55 + 0.45 * big), dist = (cam.mode === 0 ? 7.2 + sf * 2.4 : cam.mode === 1 ? 11 + sf * 3 : 0.1) * bk, h = (cam.mode === 0 ? 2.5 + sf * 0.5 : cam.mode === 1 ? 4.6 : 1.2) * (car.spec.bike ? 0.85 : 1) * (1 + (big - 1) * 0.9);
      want = new THREE.Vector3(car.x - Math.sin(cam.yaw) * dist, h + car.y, car.z - Math.cos(cam.yaw) * dist); look = new THREE.Vector3(car.x + Math.sin(cam.yaw) * 6, 1.2 + car.y, car.z + Math.cos(cam.yaw) * 6);
      if (cam.mode === 2) { want.set(car.x + Math.sin(car.h) * 0.3 + Math.cos(car.h) * 0.42, 1.12 + car.y, car.z + Math.cos(car.h) * 0.3 - Math.sin(car.h) * 0.42); look.set(car.x + Math.sin(car.h) * 20, 1.05 + car.y, car.z + Math.cos(car.h) * 20); rate = 30; }
      const fv = 62 + sf * 14 + (car.nitroOn ? 8 : 0); if (Math.abs(K.fov - fv) > 0.05) { K.fov += (fv - K.fov) * 0.1; K.updateProjectionMatrix(); }
    } else {
      if (this.cockpitOn) this.setCockpit(false);
      const p = this.state === 'enter' || this.state === 'exit' ? { x: this.person.root.position.x, z: this.person.root.position.z } : this.pos;
      cam.yaw += (inp.orbit || 0) * dt * 2.4; if (!inp.orbit && this.vel > 0.5) cam.yaw += wrap(this.yaw - cam.yaw) * Math.min(1, dt * 0.9);
      const dist = this.state === 'foot' ? 3.5 : 4.4;
      want = new THREE.Vector3(p.x - Math.sin(cam.yaw) * dist, 1.9 + (this.pos.y || 0), p.z - Math.cos(cam.yaw) * dist); look = new THREE.Vector3(p.x + Math.sin(cam.yaw) * 1.2, 1.4, p.z + Math.cos(cam.yaw) * 1.2); rate = 8; lrate = 12;
      if (K.fov !== 62) { K.fov += (62 - K.fov) * 0.1; K.updateProjectionMatrix(); }
    }
    const k = cam.snap ? 1 : 1 - Math.exp(-dt * rate); cam.pos.lerp(want, k); cam.look.lerp(look, cam.snap ? 1 : 1 - Math.exp(-dt * lrate)); cam.snap = false;
    K.position.copy(cam.pos); if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt); K.position.x += (Math.random() - 0.5) * cam.shake * 0.5; K.position.y += (Math.random() - 0.5) * cam.shake * 0.5; }
    K.lookAt(cam.look); cam.bank = (cam.bank || 0) + (bankT - (cam.bank || 0)) * Math.min(1, dt * 4); if (Math.abs(cam.bank) > 0.002) K.rotateZ(cam.bank);
  }
}
