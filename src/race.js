// Street race: checkpoint loop through the city, rivals, countdown, laps, prizes.
import * as THREE from 'three';
import { nodePos } from './city.js';
import { Audio } from './audio.js';
import * as UI from './ui.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), hyp = Math.hypot;
const RIVALS = ['kestrel', 'bulldog', 'fox', 'orion', 'vanta'], COLORS = ['#e63946', '#ffb703', '#2f7bff', '#7cff5a', '#ff2bd6'], NAMES = ['Rex', 'Nova', 'Cass', 'Dutch'];
export class Race {
  constructor(world, players, gp) { this.world = world; this.players = players; this.gp = gp; this.racers = []; this.state = 'setup'; this.t = 0; this.laps = 2; this.finished = []; this.over = false; }
  buildRoute() {
    const i0 = 2 + ((Math.random() * 2) | 0), j0 = 2 + ((Math.random() * 2) | 0), w = 4, h = 3, nodes = [];
    for (let i = 0; i < w; i++) nodes.push([i0 + i, j0]);
    for (let j = 0; j < h; j++) nodes.push([i0 + w, j0 + j]);
    for (let i = w; i > 0; i--) nodes.push([i0 + i, j0 + h]);
    for (let j = h; j > 0; j--) nodes.push([i0, j0 + j]);
    this.route = nodes.map(([i, j]) => nodePos(i, j));
  }
  async start() {
    this.buildRoute(); const W = this.world, R = this.route, A = R[0], B = R[1], h = Math.atan2(B.x - A.x, B.z - A.z);
    const fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
    const place = k => ({ x: A.x - fx * (6 + Math.floor(k / 2) * 7) + lx * (k % 2 ? 2.6 : -2.6), z: A.z - fz * (6 + Math.floor(k / 2) * 7) + lz * (k % 2 ? 2.6 : -2.6) });
    let slot = 0;
    for (const p of this.players) {
      const pos = place(slot++), v = await W.addVehicle(p.raceCar || 'kestrel', pos.x, pos.z, h, COLORS[slot % COLORS.length], 'player');
      p.seatDirect(v); this.racers.push({ kind: 'player', p, v, cp: 1, lap: 0, done: false, name: p.person.info.name, prog: 0 });
    }
    let k = 0;
    while (this.racers.length < Math.max(4, this.players.length + 2) && k < 4) {
      const pos = place(slot++), v = await W.addVehicle(RIVALS[k % RIVALS.length], pos.x, pos.z, h, COLORS[(k + 2) % COLORS.length], 'rival');
      v.ai = null; v.skill = 0.9 + Math.random() * 0.1; this.racers.push({ kind: 'ai', v, cp: 1, lap: 0, done: false, name: NAMES[k], prog: 0 }); k++;
    }
    for (const r of this.racers) r.v.car.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 };
    if (!this.mixed) { for (const v of W.vehicles) if (v.kind === 'traffic') W.scene.remove(v.root); W.vehicles = W.vehicles.filter(v => v.kind !== 'traffic'); W.cfg.traffic = 3; }
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x19e6ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.marker.position.y = 30; W.scene.add(this.marker); this.state = 'countdown'; this.cd = 4.5;
  }
  async respawn(r) {
    if (r.respawning) return; r.respawning = true; const R = this.route, n = R.length, a = R[(r.cp - 1 + n) % n], b = R[r.cp % n], h = Math.atan2(b.x - a.x, b.z - a.z), old = r.v;
    const v = await this.world.addVehicle(r.p.raceCar || 'kestrel', a.x, a.z, h, COLORS[0], 'player'); old.kind = 'wreck'; r.p.vehicle = null; r.p.seatDirect(v); r.v = v; v.car.h = h; r.respawnT = undefined; r.respawning = false; r.p.say('New car at the last checkpoint', 3);
  }
  seq(r) { return r.cp + r.lap * this.route.length; }
  drawMap(dot) { const c = this.route && this.racers[0] ? this.route[this.racers[0].cp % this.route.length] : null; if (c) dot(c.x, c.z, '#19e6ff', 6); }
  update(dt) {
    if (this.state === 'countdown') {
      const prev = Math.ceil(this.cd); this.cd -= dt; const n = Math.ceil(this.cd);
      if (n !== prev && n > 0 && n <= 3) { for (const p of this.players) p.say(String(n), 0.9); Audio.sfx.countBeep(false); }
      if (this.cd <= 0) { this.state = 'go'; this.t = 0; for (const p of this.players) p.say('GO!', 1.5); Audio.sfx.countBeep(true); for (const r of this.racers) r.v.car.input = { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0 }; }
      return;
    }
    if (this.state !== 'go') return;
    this.t += dt; const R = this.route, n = R.length;
    for (const r of this.racers) {
      if (r.kind === 'player' && !r.done && (r.v.exploded || r.v.hp <= 0)) { r.respawnT = (r.respawnT ?? 4) - dt; if (r.respawnT <= 0) this.respawn(r); }
      if (r.done) { r.v.car.input = { throttle: 0, brake: 0.6, steer: 0, hand: 0, nitro: 0 }; continue; }
      const c = r.v.car, tgt = R[r.cp % n], d = hyp(tgt.x - c.x, tgt.z - c.z); r.prog = this.seq(r) * 1000 - d;
      if (d < 16) {
        r.cp++; if (r.cp - 1 >= n * (r.lap + 1)) { r.lap++; r.cp = r.lap * n + 1; }
        if (r.kind === 'player') Audio.sfx.checkpoint();
        if (r.lap >= this.laps) { r.done = true; r.time = this.t; this.finished.push(r); if (r.kind === 'player') r.p.say('FINISHED  P' + this.finished.length, 4); }
      }
      if (r.kind === 'ai' && !r.done) {
        const tt = R[r.cp % n], nx = R[(r.cp + 1) % n], err = wrap(Math.atan2(tt.x - c.x, tt.z - c.z) - c.h), dd = hyp(tt.x - c.x, tt.z - c.z);
        const turn = Math.abs(wrap(Math.atan2(nx.x - tt.x, nx.z - tt.z) - Math.atan2(tt.x - c.x, tt.z - c.z)));
        let vt = 38 * r.v.skill; if (dd < 45 && turn > 0.8) vt = Math.min(vt, 14 + dd * 0.4); if (Math.abs(err) > 0.7) vt = Math.min(vt, 11);
        const ev = vt - c.speed; c.input = { throttle: ev > 0 ? clamp(ev / 3, 0, 1) : 0, brake: ev < -1.5 ? clamp(-ev / 6, 0, 1) : 0, steer: clamp(err * 1.8, -1, 1), hand: 0, nitro: 0 };
      }
    }
    const order = [...this.racers].sort((a, b) => (b.done - a.done) || (a.done && b.done ? a.time - b.time : b.prog - a.prog));
    order.forEach((r, i) => { r.pos = i + 1; });
    for (const r of this.racers) if (r.kind === 'player') { r.p.raceText = 'LAP ' + Math.min(this.laps, r.lap + 1) + '/' + this.laps + '  ·  POS ' + r.pos + '/' + this.racers.length; const t = R[r.cp % n]; this.marker.position.set(t.x, 30, t.z); }
    if (this.racers.filter(r => r.kind === 'player').every(r => r.done) && !this.over) this.finish();
  }
  finish() {
    this.over = true; this.state = 'done'; const prizes = [3000, 1500, 750, 300];
    const order = [...this.racers].sort((a, b) => (b.done - a.done) || a.time - b.time || b.prog - a.prog);
    for (const r of this.racers) if (r.kind === 'player') { const pos = order.indexOf(r) + 1; r.p.cash += prizes[pos - 1] || 0; r.p.say('+$' + (prizes[pos - 1] || 0), 3); r.p.raceText = ''; }
    const rows = order.map((r, i) => '<div class="it row"><span>' + (i + 1) + '. ' + r.name + '</span><b>' + (r.done ? r.time.toFixed(1) + 's' : 'DNF') + (r.kind === 'player' ? '  +$' + (prizes[i] || 0) : '') + '</b></div>').join('');
    this.world.scene.remove(this.marker);
    if (this.mixed) {   // shared world: no modal menu, so football players and roamers keep playing. Results show on the racers' own HUD.
      const html = '<b>RACE RESULTS</b><br>' + order.map((r, i) => (i + 1) + '. ' + r.name + ' ' + (r.done ? r.time.toFixed(1) + 's' : 'DNF')).join('<br>');
      setTimeout(() => {
        for (const r of this.racers) if (r.kind === 'player') r.p.sbHtml = html; for (const r of this.racers) if (r.kind === 'ai') { r.v.kind = 'parked'; r.v.car.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 }; }
        setTimeout(() => { for (const r of this.racers) if (r.kind === 'player') { r.p.sbHtml = ''; r.p.raceText = ''; } this.state = 'closed'; if (this.world.race === this) this.world.race = null; }, 14000);
      }, 2500); return;
    }
    setTimeout(() => {
      UI.panel('<div class="screen small" style="width:520px"><h2>RACE RESULTS</h2><div class="menu">' + rows + '<div class="it" data-i="roam">KEEP DRIVING</div><div class="it" data-i="title">QUIT TO TITLE</div></div></div>',
        i => { UI.closePanel(); if (i === 'title') this.onQuit && this.onQuit(); else this.onClose && this.onClose(); }, () => { UI.closePanel(); this.onClose && this.onClose(); });
      this.onOpen && this.onOpen();
    }, 2500);
  }
}
