// Gameplay systems: heat & police, on-foot combat, pedestrians' fate, cash / bank / wallet kiosks, minimap.
import * as THREE from 'three';
import { N, P, RW, HALF, nodePos, onRoad } from './city.js';
import { createVehicle } from './vehicle.js';
import { scareNear } from './npc.js';
import { Audio } from './audio.js';
import * as UI from './ui.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), hyp = Math.hypot, rnd = (a, b) => a + Math.random() * (b - a);
const SAVE = 'neon_save_v1', COIN = 10;   // 1 Neon Coin = $10
export const loadSave = i => { try { return JSON.parse(localStorage.getItem(SAVE + i) || 'null'); } catch (e) { return null; } };
export const saveGame = p => { try { localStorage.setItem(SAVE + p.index, JSON.stringify({ cash: p.cash, bank: p.bank, coins: p.coins, pistol: p.hasPistol, ammo: p.ammo })); } catch (e) {} };

export class Gameplay {
  constructor(world, players) {
    this.world = world; this.players = players; this.t = 0; this.kiosks = []; this.cops = []; this.drops = []; this.flashes = [];
    for (const p of players) { const s = loadSave(p.index); if (s) Object.assign(p, { cash: s.cash, bank: s.bank, coins: s.coins }); p.hp = 100; p.armor = 0; p.hasPistol = !!(s && s.pistol); p.ammo = s ? s.ammo || 0 : 0; p.armed = false; p.bustT = 0; p.lastHeatT = 0; p.heatCool = 0; p.wallet = null; p.pistolObj = null; }
    this.buildKiosks(); this.buildMinimapBase(); this.loadPistol();
    if (world.hospital) this.kiosks.push({ x: world.hospital.entrance.x + 3.5, z: world.hospital.entrance.z - 1, shop: false, hospital: true, g: null });
    if (world.arena) { const A = world.arena; this.kiosks.push({ x: A.officePos.x, z: A.officePos.z, shop: false, tickets: true, g: null }, { x: A.gatePos.x - 3, z: A.gatePos.z, shop: false, gate: true, g: null }); }
    if (world.club) this.kiosks.push({ x: world.club.cx + 19.2, z: world.club.cz + 2, shop: false, bar: true, g: null });
    world.onAttack = p => this.melee(p);
  }
  // ------------------------------------------------------------------ kiosks (ATM + shop)
  buildKiosks() {
    const S = this.world.scene, rng = (a => () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)(99), atm = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.5, metalness: 0.6 }), scrA = new THREE.MeshBasicMaterial({ color: 0x19e6ff }), scrS = new THREE.MeshBasicMaterial({ color: 0x7cff5a });
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      if (rng() > 0.55) continue; const cx = (a + 0.5 - N / 2) * P, cz = (b + 0.5 - N / 2) * P, shop = rng() < 0.4; const side = (rng() * 4) | 0, o = 30.5;
      const x = cx + (side === 0 ? -o : side === 1 ? o : (rng() - 0.5) * 40), z = cz + (side === 2 ? -o : side === 3 ? o : (rng() - 0.5) * 40), rot = side === 0 ? Math.PI / 2 : side === 1 ? -Math.PI / 2 : side === 2 ? 0 : Math.PI;
      const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.7), body); box.position.y = 1.15; g.add(box);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), shop ? scrS : scrA); scr.position.set(0, 1.55, 0.36); g.add(scr);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.28, 0.2), shop ? scrS : scrA); sign.position.set(0, 2.4, 0.1); g.add(sign);
      g.position.set(x, 0.16, z); g.rotation.y = rot; S.add(g); this.kiosks.push({ x, z, shop, g });
    }
  }
  nearKiosk(p) { let best = null, bd = 2.6; for (const k of this.kiosks) { if (k.off) continue; const d = hyp(k.x - p.pos.x, k.z - p.pos.z); if (d < bd) { bd = d; best = k; } } return best; }
  // ------------------------------------------------------------------ pistol model
  async loadPistol() { try { const g = await new GLTFLoader().loadAsync('../assets/polyhaven/models/service_pistol/service_pistol.gltf'); this.pistolSrc = g.scene; } catch (e) { this.pistolSrc = null; } }
  attachPistol(p) {
    if (p.pistolObj || !this.pistolSrc) return; const hand = p.person.root.getObjectByName('hand_r'); if (!hand) return;
    const m = this.pistolSrc.clone(true); m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; } }); const box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), s = 0.22 / Math.max(sz.x, sz.y, sz.z);
    const wrap = new THREE.Group(); m.scale.setScalar(s); m.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(s)); wrap.add(m); wrap.position.set(0.0, 0.07, 0.03); wrap.rotation.set(0, Math.PI / 2, Math.PI / 2); hand.add(wrap); p.pistolObj = wrap;
  }
  // ------------------------------------------------------------------ pedestrians fate
  hurtPed(ped, dmg, p, kind) {
    if (ped.dead) return; ped.hp -= dmg; scareNear(this.world, ped.x, ped.z, 22);
    if (ped.hp <= 0) { ped.dead = true; ped.deadT = 0; ped.person.play('Die', { loop: false, speed: 1.1, fade: 0.1 }); ped.mode = 'dead'; ped.fleeT = 0; if (p) { const c = Math.round(rnd(20, 140)); p.cash += c; p.say('+$' + c, 1.5); Audio.sfx.cash(); this.addHeat(p, kind === 'car' ? 1 : kind === 'gun' ? 1.1 : 0.6); } }
    else { ped.person.play('Hit', { loop: false, speed: 1.2, fade: 0.08 }); ped.stunT = 0.9; if (p) this.addHeat(p, 0.25); }
  }
  melee(p) {
    Audio.sfx.whoosh(); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    setTimeout(() => { for (const ped of this.world.peds) { if (ped.dead) continue; const dx = ped.x - p.pos.x, dz = ped.z - p.pos.z, f = dx * fx + dz * fz, l = Math.abs(dx * fz - dz * fx); if (f > 0 && f < 1.5 && l < 0.8) { Audio.sfx.punch(); this.hurtPed(ped, 38, p, 'punch'); break; } } }, 220);
  }
  shoot(p) {
    if (!p.armed || p.ammo <= 0) { if (p.armed && p.ammo <= 0) Audio.sfx.empty(); return; } p.ammo--; Audio.sfx.shot(true); p.cam.shake = 0.12; const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const L = this.world.fxLights.acquire(); if (L) { const hp = p.person.root.position; L.color.setHex(0xffd27a); L.intensity = 8; L.distance = 14; L.position.set(hp.x + fx * 0.8, 1.35, hp.z + fz * 0.8); this.flashes.push({ L, t: 0.06 }); }
    scareNear(this.world, p.pos.x, p.pos.z, 38); this.addHeat(p, 0.2);
    let best = null, bd = 40; for (const ped of this.world.peds) { if (ped.dead) continue; const dx = ped.x - p.pos.x, dz = ped.z - p.pos.z, f = dx * fx + dz * fz, l = Math.abs(dx * fz - dz * fx); if (f > 0.5 && f < bd && l < 0.65) { bd = f; best = ped; } }
    for (const v of this.cops) { const dx = v.car.x - p.pos.x, dz = v.car.z - p.pos.z, f = dx * fx + dz * fz, l = Math.abs(dx * fz - dz * fx); if (f > 0.5 && f < bd && l < 1.4) { bd = f; best = null; this.addHeat(p, 1.5); } }
    for (const v of this.world.vehicles) { if (v.exploded) continue; const dx = v.car.x - p.pos.x, dz = v.car.z - p.pos.z, f = dx * fx + dz * fz, l = Math.abs(dx * fz - dz * fx); if (f > 0.5 && f < bd && l < 1.1) { bd = f; best = null; v.damage(9); this.addHeat(p, 0.3); Audio.burst(3200, 2, 0.08, 0.2); if (v.driverPerson && v.hp < 40) { v.kind = 'traffic'; v.ai = null; } } }
    if (best) this.hurtPed(best, 55, p, 'gun'); p.pistolKick = 0.12;
  }
  // ------------------------------------------------------------------ heat & police
  addHeat(p, v) { const was = Math.floor(p.heat); p.heat = clamp(p.heat + v, 0, 5); p.heatCool = 8; if (Math.floor(p.heat) > was && was === 0) { Audio.sfx.wanted(); Audio.voice('police', { pri: 2 }); } }
  async spawnCop(p) {
    for (let k = 0; k < 12; k++) {
      const ang = rnd(0, Math.PI * 2), r = rnd(110, 170), px = p.x() + Math.cos(ang) * r, pz = p.z() + Math.sin(ang) * r, i = clamp(Math.round(px / P + N / 2), 0, N), j = clamp(Math.round(pz / P + N / 2), 0, N), n = nodePos(i, j);
      if (this.players.every(q => hyp(q.x() - n.x, q.z() - n.z) > 80)) { const v = await createVehicle(this.world.scene, 'police', n.x, n.z, 0, null); v.kind = 'cop'; this.world.attachDriver(v, Math.random() < 0.7 ? 'cop_m' : 'cop_f'); v.siren = true; v.cruise = rnd(24, 30); v.route = null; v.routeT = 0; this.world.vehicles.push(v); this.cops.push(v); return v; }
    }
  }
  clearLine(ax, az, bx, bz) { const d = hyp(bx - ax, bz - az), n = Math.ceil(d / 3); for (let k = 1; k < n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; for (const b of this.world.city.near(x, z, 1)) if (x > b.minX - 1.2 && x < b.maxX + 1.2 && z > b.minZ - 1.2 && z < b.maxZ + 1.2) return false; } return true; }
  copDrive(v, p, dt) {
    const c = v.car, tx = p.x(), tz = p.z(), dist = hyp(tx - c.x, tz - c.z); let gx, gz, vt = v.cruise;
    if (dist < 55 && this.clearLine(c.x, c.z, tx, tz)) { gx = tx; gz = tz; vt = Math.min(v.cruise + 4, 10 + dist * 0.6); }
    else {
      v.routeT -= dt; if (!v.route || v.routeT <= 0) { v.route = this.bfs(c.x, c.z, tx, tz); v.routeT = 1.2; }
      const r = v.route; while (r.length > 1 && hyp(r[0].x - c.x, r[0].z - c.z) < 12) r.shift(); const w = r[0] || { x: tx, z: tz }; gx = w.x; gz = w.z;
    }
    const err = wrap(Math.atan2(gx - c.x, gz - c.z) - c.h); if (Math.abs(err) > 0.9) vt = Math.min(vt, 9); const ev = vt - c.speed;
    c.input = { throttle: ev > 0 ? clamp(ev / 3, 0, 1) : 0, brake: ev < -1 ? clamp(-ev / 6, 0, 1) : 0, steer: clamp(err * 1.9, -1, 1), hand: Math.abs(err) > 1.2 && c.speed > 10 ? 1 : 0, nitro: 0 };
  }
  bfs(x0, z0, x1, z1) {
    const si = clamp(Math.round(x0 / P + N / 2), 0, N), sj = clamp(Math.round(z0 / P + N / 2), 0, N), ti = clamp(Math.round(x1 / P + N / 2), 0, N), tj = clamp(Math.round(z1 / P + N / 2), 0, N);
    const prev = new Map(), q = [[si, sj]]; prev.set(si + ',' + sj, null);
    while (q.length) { const [i, j] = q.shift(); if (i === ti && j === tj) break; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + dx, b = j + dz; if (a < 0 || a > N || b < 0 || b > N || prev.has(a + ',' + b)) continue; prev.set(a + ',' + b, [i, j]); q.push([a, b]); } }
    const path = []; let cur = [ti, tj]; while (cur) { path.push(nodePos(cur[0], cur[1])); cur = prev.get(cur[0] + ',' + cur[1]); } path.reverse(); path.push({ x: x1, z: z1 }); return path;
  }
  busted(p) {
    p.heat = 0; p.bustT = 0; const fine = Math.min(p.cash, Math.round(200 + p.cash * 0.1)); p.cash -= fine; p.say(`BUSTED  -$${fine}`, 3.5); p.weaponsConfiscated = false; Audio.sfx.deny();
    for (const v of this.cops) { v.kind = 'gone'; } this.clearCops(); if (p.state === 'car') { p.state = 'foot'; p.vehicle.driver = null; p.vehicle.kind = 'parked'; p.world.scene.add(p.person.root); p.pos.set(p.vehicle.car.x + 2.5, 0, p.vehicle.car.z); p.vehicle.root.remove(p.person.root); p.person.play('Idle'); }
    p.armed = false; saveGame(p); this.teleportTo(p, this.world.station ? this.world.station.entrance : null);
  }
  teleportTo(p, spot) { if (!spot) return; if (p.state === 'car' && p.vehicle) { p.world.scene.add(p.person.root); p.vehicle.root.remove(p.person.root); p.vehicle.driver = null; p.vehicle.owner = null; p.vehicle.kind = 'parked'; p.state = 'foot'; p.seq = null; } if (p.state !== 'foot') return; p.pos.set(spot.x + (Math.random() - 0.5) * 3, 0.16, spot.z + 2); p.yaw = Math.PI; p.cam.yaw = Math.PI; p.cam.snap = true; p.person.play('Idle'); }
  clearCops() { for (const v of this.cops) { this.world.scene.remove(v.root); const i = this.world.vehicles.indexOf(v); if (i >= 0) this.world.vehicles.splice(i, 1); } this.cops.length = 0; Audio.siren(false); }
  // ------------------------------------------------------------------ per-frame
  update(dt, inputs) {
    this.t += dt; const W = this.world;
    for (const f of this.flashes) { f.t -= dt; if (f.t <= 0) { W.fxLights.release(f.L); } } this.flashes = this.flashes.filter(f => f.t > 0);
    // dead / hit pedestrians
    for (let i = W.peds.length - 1; i >= 0; i--) { const ped = W.peds[i]; if (ped.dead) { ped.deadT += dt; if (ped.deadT > 14) { ped.person.dispose(); W.peds.splice(i, 1); } continue; } if (ped.stunT > 0) { ped.stunT -= dt; if (ped.stunT <= 0) { ped.person.play('Run', { speed: 1 }); ped.fleeT = rnd(3, 6); ped.fleeAng = rnd(0, 6.28); } } }
    // cars running people over; crashes
    for (const v of W.vehicles) { const c = v.car; if (c.speed < 4) continue; for (const ped of W.peds) { if (ped.dead) continue; const dx = ped.x - c.x, dz = ped.z - c.z; if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue; const s = Math.sin(c.h), co = Math.cos(c.h), lx = dx * co - dz * s, lz = dx * s + dz * co; if (Math.abs(lx) < c.spec.body.W / 2 + 0.3 && Math.abs(lz) < c.spec.body.L / 2 + 0.2) { this.hurtPed(ped, c.speed * 12, v.owner, 'car'); } } }
    // players
    for (const p of this.players) {
      const inp = inputs[p.index] || {};
      // inputs that need gameplay
      if (p.state === 'foot') {
        if (inp.weapon && p.hasPistol) { p.armed = !p.armed; if (p.armed) this.attachPistol(p); if (p.pistolObj) p.pistolObj.visible = p.armed; }
        if (p.armed && p.pistolObj) p.pistolObj.visible = true;
        if (p.armed) { if (!p.atk && p.vel < 0.25) p.person.play('PistolAim', { fade: 0.15 }); else if (!p.atk && p.vel >= 0.25) p.person.play(p.vel > 3.2 ? 'PistolRun' : 'PistolRun', { speed: p.vel > 3.2 ? p.vel / 4.4 : 0.55, fade: 0.15 }); if (inp.shoot && this.t - (p.lastShot || 0) > 0.28) { p.lastShot = this.t; this.shoot(p); } }
        if (p.pistolObj && !p.armed) p.pistolObj.visible = false;
        const k = this.nearKiosk(p); if (k) { p.prompt = k.custom ? k.custom.prompt : k.tickets ? 'F  Ticket office · bets · snacks' : k.gate ? (p.ticket && p.ticket.fixture === this.world.arena.fixtureId ? 'F  Show ticket · go to your seat' : 'F  Gate (ticket needed)') : k.hospital ? 'F  Hospital · treatment' : k.bar ? 'F  Bar · order a drink' : k.shop ? 'F  Shop' : 'F  ATM · Bank · Wallet'; if (inp.interact && !p.atk) { this.openKiosk(p, k); } }
      } else if (p.pistolObj) p.pistolObj.visible = false;
      if (inp.phone) this.openWallet(p);
      // heat decay
      p.heatCool -= dt; const near = this.cops.reduce((m, v) => Math.min(m, hyp(v.car.x - p.x(), v.car.z - p.z())), 9999);
      if (p.heat > 0) { if (near > 90) p.heat -= dt * 0.07; else if (p.heatCool <= 0) p.heat -= dt * 0.012; if (p.heat < 0.1) { p.heat = 0; if (this.cops.length) { Audio.voice('police', { pri: 1 }); p.say('Wanted level lost', 2); this.clearCops(); } } }
      // busted check
      const sp = p.state === 'car' ? p.vehicle.car.speed : p.vel; const nc = this.cops.filter(v => hyp(v.car.x - p.x(), v.car.z - p.z()) < 6.5 && v.car.speed < 14).length;
      if (p.heat >= 1 && nc && sp < 8) { p.bustT += dt; if (p.bustT > 3) this.busted(p); } else p.bustT = Math.max(0, p.bustT - dt * 0.8);
      // crashes
      // health / respawn
      if (p.hp <= 0) { p.hp = 100; p.cash = Math.max(0, p.cash - 200); p.say('WASTED  -$200', 3); this.teleportTo(p, W.hospital ? W.hospital.entrance : null); }
    }
    for (const e of W.events) { if (e.type === 'explosion') { if (e.v.lastOwner) e.v.lastOwner.say('Car destroyed!  Press M to call a new one ($100)', 5); Audio.sfx.explosion(); for (const p of this.players) { const d = hyp(p.x() - e.x, p.z() - e.z); if (d < 80) p.cam.shake = Math.max(p.cam.shake, 0.6 * (1 - d / 80)); } if (e.v.lastHitBy) this.addHeat(e.v.lastHitBy, 1); } if (e.type === 'crash' && e.v.owner && e.hit > 7) { const o = e.v.owner; o.hp = Math.max(1, o.hp - e.hit * 0.8); if (W.vehicles.some(w => w.kind === 'traffic' && hyp(w.car.x - e.v.car.x, w.car.z - e.v.car.z) < 6)) this.addHeat(o, 0.3); } }
    // cops
    const maxHeat = Math.max(0, ...this.players.map(p => p.heat)), want = maxHeat >= 0.9 ? Math.min(6, Math.ceil(maxHeat * 1.4)) : 0;
    if (this.cops.length < want && !this.spawningCop) { this.spawningCop = true; const tgt = this.players.filter(p => p.heat >= 0.9)[(Math.random() * 2) | 0] || this.players[0]; this.spawnCop(tgt).finally(() => { this.spawningCop = false; }); }
    for (let i = this.cops.length - 1; i >= 0; i--) { const v = this.cops[i]; if (v.kind === 'gone') continue; const tgt = this.players.filter(p => p.heat >= 0.5).sort((a, b) => hyp(a.x() - v.car.x, a.z() - v.car.z) - hyp(b.x() - v.car.x, b.z() - v.car.z))[0]; if (tgt) this.copDrive(v, tgt, dt); else v.car.input = { throttle: 0, brake: 1, steer: 0, hand: 0, nitro: 0 }; }
    const nearest = this.cops.reduce((m, v) => Math.min(m, ...this.players.map(p => hyp(v.car.x - p.x(), v.car.z - p.z()))), 9999); Audio.siren(this.cops.length > 0 && nearest < 140, clamp(0.16 - nearest / 1500, 0.02, 0.15));
    // pistol recoil kick
    for (const p of this.players) if (p.pistolKick > 0) p.pistolKick -= dt;
  }
  // ------------------------------------------------------------------ kiosk panels
  money(n) { return '$' + Math.round(n).toLocaleString(); }
  openKiosk(p, k) { Audio.sfx.beep(); Audio.voice(k.shop ? 'shop' : 'atm', { pri: 1 }); if (k.custom) { k.custom.action(p); return; } if (k.gate) { const A = this.world.arena; if (p.ticket && p.ticket.fixture === A.fixtureId) { A.takeSeat(p); } else { p.say('You need a ticket for this match', 2.5); Audio.sfx.deny(); } return; } this.panelFor(p, k.tickets ? 'tickets' : k.hospital ? 'hospital' : k.bar ? 'bar' : k.shop ? 'shop' : 'atm'); }
  openWallet(p) { this.panelFor(p, 'wallet'); }
  panelFor(p, mode) {
    const g = this, row = (id, t, sub) => `<div class="it row" data-i="${id}"><span>${t}</span><b>${sub || ''}</b></div>`;
    const head = `<div class="logo"><b style="font-size:40px">${mode === 'shop' ? 'NEON MART' : mode === 'wallet' ? 'WALLET' : mode === 'bar' ? 'NEON CLUB BAR' : mode === 'hospital' ? 'NEON GENERAL HOSPITAL' : mode === 'tickets' ? 'NEON ARENA TICKETS' : 'NEON BANK'}</b></div><div class="bal"><div>CASH <b>${g.money(p.cash)}</b></div><div>BANK <b>${g.money(p.bank)}</b></div><div>COINS <b>${p.coins.toLocaleString()} NC</b></div><div>HP <b>${Math.round(p.hp)}</b></div><div>ARMOR <b>${p.armor}</b></div><div>AMMO <b>${p.ammo}</b></div></div>`;
    const atm = [row('dep100', 'Deposit $100'), row('dep1000', 'Deposit $1,000'), row('depall', 'Deposit all cash'), row('wd100', 'Withdraw $100'), row('wd1000', 'Withdraw $1,000'), row('wd5000', 'Withdraw $5,000'), row('buycoin', 'Buy 10 Neon Coins', '$100 from bank'), row('sellcoin', 'Sell 10 Neon Coins', '$100 to bank')];
    const shop = [row('pistol', p.hasPistol ? 'Pistol (owned)' : 'Pistol', '$450'), row('ammo', 'Ammo ×30', '$60'), row('heal', 'Health pack', '$40'), row('armor', 'Body armor', '$200'), row('buycoin2', 'Pay with coins: 20 NC → $200 cash')];
    const wal = [row('callcar', 'Call a car', '$100  delivered to the nearest road'), row('send', 'Send 10 NC to another player'), row('buycoin', 'Buy 10 Neon Coins', '$100 from bank'), row('sellcoin', 'Sell 10 Neon Coins', '$100 to bank')];
    const bar = [row('drink', 'Neon Sunset cocktail', '$25  +20 HP'), row('water', 'Sparkling water', '$8  +5 HP'), row('round', 'Buy the club a round', '$300'), row('tip', 'Tip the DJ', '$50')];
    const hosp = [row('treat', 'Full treatment', '$100  → full health'), row('medkit', 'Buy a medkit', '$60  (heal anywhere)'), row('checkup', 'Free check-up', '+10 HP')];
    const A = this.world.arena; let tick = [];
    if (mode === 'tickets' && A) { tick = [`<div class="bal"><div>${A.teamA.name} <b>vs</b> ${A.teamB.name}</div><div>STATUS <b>${A.statusText()}</b></div><div>SCORE <b>${A.score[0]} - ${A.score[1]}</b></div></div>`, ...['standing', 'stand', 'lower', 'vip'].map(id => { const t = A.constructor.TIERS ? null : null; return row('tk_' + id, { standing: 'Standing · behind the goal', stand: 'Main stand · halfway line', lower: 'Lower tier · pitch-side', vip: 'VIP glass suite' }[id], '$' + { standing: 30, stand: 80, lower: 150, vip: 400 }[id]); }), row('bet_h', `Bet $200 · ${A.teamA.short} win`, '×' + A.odds.h), row('bet_d', `Bet $200 · Draw`, '×' + A.odds.d), row('bet_a', `Bet $200 · ${A.teamB.short} win`, '×' + A.odds.a), row('pie', 'Pie & drink', '$12  +10 HP')]; if (A.canJoin()) tick.push(row('play_0', `PLAY football for ${A.teamA.name}`, 'join the live match'), row('play_1', `PLAY football for ${A.teamB.name}`, 'join the live match')); }
    const list = mode === 'tickets' ? tick : mode === 'atm' ? atm : mode === 'shop' ? shop : mode === 'bar' ? bar : mode === 'hospital' ? hosp : wal;
    UI.panel(`<div class="screen small" style="width:560px">${head}<div class="menu">${list.join('')}<div class="it" data-i="close">CLOSE</div></div></div>`, (id) => {
      const ok = () => { Audio.sfx.cash(); saveGame(p); g.panelFor(p, mode); }, no = () => { Audio.sfx.deny(); };
      if (id === 'close') { UI.closePanel(); g.onPanelClose && g.onPanelClose(); return; }
      if (id.startsWith('dep')) { const n = id === 'depall' ? p.cash : +id.slice(3); if (n > 0 && p.cash >= n) { p.cash -= n; p.bank += n; ok(); } else no(); }
      else if (id.startsWith('wd')) { const n = +id.slice(2); if (p.bank >= n) { p.bank -= n; p.cash += n; ok(); } else no(); }
      else if (id === 'buycoin') { if (p.bank >= 10 * COIN) { p.bank -= 10 * COIN; p.coins += 10; ok(); } else no(); } else if (id === 'sellcoin') { if (p.coins >= 10) { p.coins -= 10; p.bank += 10 * COIN; ok(); } else no(); }
      else if (id === 'buycoin2') { if (p.coins >= 20) { p.coins -= 20; p.cash += 200; ok(); } else no(); }
      else if (id === 'pistol') { if (!p.hasPistol && p.cash >= 450) { p.cash -= 450; p.hasPistol = true; p.ammo += 24; p.say('Pistol bought  T to draw', 3); ok(); } else no(); } else if (id === 'ammo') { if (p.hasPistol && p.cash >= 60) { p.cash -= 60; p.ammo += 30; ok(); } else no(); }
      else if (id === 'heal') { if (p.cash >= 40) { p.cash -= 40; p.hp = 100; ok(); } else no(); } else if (id === 'armor') { if (p.cash >= 200) { p.cash -= 200; p.armor = 100; ok(); } else no(); }
      else if (id === 'drink') { if (p.cash >= 25) { p.cash -= 25; p.hp = Math.min(100, p.hp + 20); p.say('Cheers!', 1.5); ok(); } else no(); } else if (id === 'water') { if (p.cash >= 8) { p.cash -= 8; p.hp = Math.min(100, p.hp + 5); ok(); } else no(); }
      else if (id === 'round') { if (p.cash >= 300) { p.cash -= 300; p.say('The whole club cheers!', 2.5); p.coins += 2; ok(); } else no(); } else if (id === 'tip') { if (p.cash >= 50) { p.cash -= 50; p.say('The DJ shouts you out!', 2.5); ok(); } else no(); }
      else if (id === 'treat') { if (p.cash >= 100) { p.cash -= 100; p.hp = 100; p.say('Good as new, says Dr. Tanaka', 2.5); ok(); } else no(); } else if (id === 'medkit') { if (p.cash >= 60) { p.cash -= 60; p.hp = 100; ok(); } else no(); } else if (id === 'checkup') { p.hp = Math.min(100, p.hp + 10); ok(); }
      else if (id.startsWith('tk_')) { const A = g.world.arena, price = { standing: 30, stand: 80, lower: 150, vip: 400 }[id.slice(3)]; if (A && A.buyTicket(p, id.slice(3))) { Audio.sfx.cash(); saveGame(p); g.panelFor(p, mode); } else no(); }
      else if (id.startsWith('play_')) { const A = g.world.arena; if (A && A.joinMatch(p, +id[5])) { UI.closePanel(); g.onPanelClose && g.onPanelClose(); } else no(); }
      else if (id.startsWith('bet_')) { const A = g.world.arena; if (A && A.state !== 'post' && A.placeBet(p, id[4], 200)) ok(); else no(); } else if (id === 'pie') { if (p.cash >= 12) { p.cash -= 12; p.hp = Math.min(100, p.hp + 10); ok(); } else no(); }
      else if (id === 'callcar') { if (p.cash >= 100) { p.cash -= 100; g.callCar(p); saveGame(p); g.panelFor(p, mode); } else no(); }
      else if (id === 'send') { const o = g.players.find(q => q !== p); if (o && p.coins >= 10) { p.coins -= 10; o.coins += 10; saveGame(p); saveGame(o); p.say(`Sent 10 NC to ${o.person.info.name}`, 2.5); ok(); } else no(); }
    }, () => { UI.closePanel(); g.onPanelClose && g.onPanelClose(); });
    g.onPanelOpen && g.onPanelOpen();
  }
  callCar(p) {
    const W = this.world; let x = p.x(), z = p.z(), spot = null;
    for (let r = 22; r <= 70 && !spot; r += 8) for (let k = 0; k < 16 && !spot; k++) { const a = Math.random() * 6.28, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (!onRoad(px, pz) || W.vehicles.some(v => Math.hypot(v.car.x - px, v.car.z - pz) < 8)) continue; const u = px / P + N / 2, nearV = Math.abs(u - Math.round(u)) * P < RW / 2; spot = { x: px, z: pz, h: nearV ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) }; }
    if (!spot) { p.say('No clear road nearby, try again', 2.5); p.cash += 100; return; }
    W.addVehicle(p.homeCar || 'kestrel', spot.x, spot.z, spot.h, null, 'parked').then(v => { v.car.h = spot.h; p.say('Your car is waiting nearby (marked on the map)', 4); this.callMark = v; W.pois = W.pois.filter(q => !q.callcar); W.pois.push({ x: spot.x, z: spot.z, color: '#ffd23a', r: 6, callcar: true }); Audio.sfx.cash(); });
  }
  // ------------------------------------------------------------------ minimap
  buildMinimapBase() {
    const S = 240, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), sc = S / (N * P + RW); g.fillStyle = '#0a0d14'; g.fillRect(0, 0, S, S); g.fillStyle = '#1e2533';
    for (let k = 0; k <= N; k++) { const v = (k - N / 2) * P; g.fillRect((v + HALF + RW / 2 - RW / 2) * sc, 0, RW * sc, S); g.fillRect(0, (v + HALF + RW / 2 - RW / 2) * sc, S, RW * sc); }
    this.mapBase = c; this.mapScale = sc;
  }
  drawMinimap(p, ctx2, size) {
    const sc = this.mapScale * (size / 240) * 1.0, W = this.world, half = HALF + RW / 2, cx = size / 2, cy = size / 2, rot = p.state === 'car' ? p.vehicle.car.h : p.cam.yaw; ctx2.save(); ctx2.clearRect(0, 0, size, size); ctx2.beginPath(); ctx2.arc(cx, cy, size / 2 - 2, 0, 7); ctx2.clip(); ctx2.fillStyle = '#05070c'; ctx2.fillRect(0, 0, size, size);
    ctx2.translate(cx, cy); ctx2.rotate(rot); const zoom = 3.2; ctx2.scale(zoom, zoom); const px = (p.x() + half) * sc, pz = (p.z() + half) * sc; ctx2.translate(-px, -pz); ctx2.drawImage(this.mapBase, 0, 0, size, size);
    const dot = (x, z, col, r) => { ctx2.fillStyle = col; ctx2.beginPath(); ctx2.arc((x + half) * sc, (z + half) * sc, r / zoom, 0, 7); ctx2.fill(); };
    for (const k of this.kiosks) dot(k.x, k.z, k.shop ? '#7cff5a' : '#19e6ff', 3);
    for (const q of W.pois) dot(q.x, q.z, q.color, q.r);
    for (const v of W.vehicles) if (v.kind === 'parked' && !v.exploded && !v.owner) dot(v.car.x, v.car.z, '#e8eefc', 2.4);
    for (const v of this.cops) dot(v.car.x, v.car.z, (Math.floor(this.t * 4) % 2) ? '#ff3b3b' : '#3b6bff', 4);
    if (W.race) W.race.drawMap && W.race.drawMap(dot);
    for (const o of this.players) if (o !== p) dot(o.x(), o.z(), '#ffd23a', 4);
    ctx2.restore(); ctx2.save(); ctx2.translate(cx, cy); ctx2.fillStyle = '#fff'; ctx2.beginPath(); ctx2.moveTo(0, -7); ctx2.lineTo(5, 6); ctx2.lineTo(0, 3); ctx2.lineTo(-5, 6); ctx2.closePath(); ctx2.fill(); ctx2.restore();
    ctx2.strokeStyle = '#19e6ff'; ctx2.lineWidth = 2; ctx2.beginPath(); ctx2.arc(cx, cy, size / 2 - 2, 0, 7); ctx2.stroke();
  }
}
