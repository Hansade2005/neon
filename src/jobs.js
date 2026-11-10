// Vehicle jobs: taxi fares, bus route, truck deliveries. Starts automatically when a player drives a taxi / bus / hauler.
import { N, P, nodePos } from './city.js';
import { Audio } from './audio.js';
const hyp = Math.hypot, rnd = (a, b) => a + Math.random() * (b - a), JOB_CARS = ['taxi', 'bus', 'hauler'];
const node = (i, j) => nodePos(Math.max(1, Math.min(N - 1, i)), Math.max(1, Math.min(N - 1, j)));
function nearNode(x, z, minD, maxD) { for (let t = 0; t < 40; t++) { const i = Math.round(x / P + N / 2 + rnd(-4, 4)), j = Math.round(z / P + N / 2 + rnd(-4, 4)), n = node(i, j), d = hyp(n.x - x, n.z - z); if (d >= minD && d <= maxD) return n; } return node(Math.round(x / P + N / 2) + 2, Math.round(z / P + N / 2)); }

export class Jobs {
  constructor(world, players) { this.world = world; this.players = players; }
  mark(p, pos, color, label) { this.unmark(p); if (!pos) return; p.job.poi = { x: pos.x, z: pos.z, color, r: 7, job: true, label }; this.world.pois.push(p.job.poi); }
  unmark(p) { if (p.job && p.job.poi) { const i = this.world.pois.indexOf(p.job.poi); if (i >= 0) this.world.pois.splice(i, 1); p.job.poi = null; } }
  end(p, msg) { this.unmark(p); if (p.job && p.job.earned > 0) msg = `${msg || 'Shift over'}  ·  earned $${p.job.earned}`; p.job = null; p.jobText = ''; if (msg) p.say(msg, 3); }
  pay(p, amt, text) { amt = Math.round(amt); p.cash = (p.cash || 0) + amt; p.job.earned += amt; p.say(`${text}  +$${amt}`, 3); Audio.sfx && Audio.sfx.cash && Audio.sfx.cash(); }
  arrived(p, tgt, dt, need) { const v = p.vehicle, d = hyp(v.car.x - tgt.x, v.car.z - tgt.z); if (d < 11 && Math.abs(v.car.speed) < 3.2) p.job.dwell = (p.job.dwell || 0) + dt; else p.job.dwell = 0; return p.job.dwell >= need; }
  update(dt) { for (const p of this.players) this.tick(p, dt); }
  tick(p, dt) {
    const v = p.state === 'car' ? p.vehicle : null, type = v && !v.exploded && JOB_CARS.includes(v.id) ? v.id : null;
    if (!type || p.story) { if (p.job) this.end(p, p.job && p.vehicle && p.vehicle.exploded ? 'Vehicle destroyed. Shift over' : 'Shift over'); return; }
    let j = p.job; if (!j || j.type !== type) { if (j) this.end(p); j = p.job = { type, stage: 'start', earned: 0, n: 0, t: 0, dwell: 0 }; p.say(type === 'taxi' ? 'TAXI JOB: pick up fares (yellow marker)' : type === 'bus' ? 'BUS ROUTE: stop at every marker' : 'TRUCK JOB: collect cargo, then deliver', 4); }
    const c = v.car; j.t += dt;
    if (type === 'taxi') {
      if (j.stage === 'start') { j.from = nearNode(c.x, c.z, 90, 260); j.stage = 'pickup'; this.mark(p, j.from, '#ffd23a', 'FARE'); }
      if (j.stage === 'pickup') { p.jobText = `TAXI · pick up your fare  (${Math.round(hyp(c.x - j.from.x, c.z - j.from.z))} m)`; if (this.arrived(p, j.from, dt, 1.0)) { j.to = nearNode(j.from.x, j.from.z, 260, 560); j.dist = hyp(j.to.x - j.from.x, j.to.z - j.from.z); j.limit = j.dist / 8 + 25; j.t0 = j.t; j.stage = 'drop'; this.mark(p, j.to, '#4dff88', 'DROP'); p.say('Fare aboard. Take me to the green marker', 3); } }
      else if (j.stage === 'drop') { const left = Math.max(0, j.limit - (j.t - j.t0)); p.jobText = `TAXI · drop-off  ${Math.round(hyp(c.x - j.to.x, c.z - j.to.z))} m · ${Math.ceil(left)} s for the tip`; if (this.arrived(p, j.to, dt, 0.8)) { const tip = left > 0 ? 0.4 : 0; this.pay(p, (30 + j.dist * 0.18) * (1 + tip), tip ? 'FARE + TIP' : 'FARE'); j.n++; j.stage = 'start'; } }
    } else if (type === 'bus') {
      if (j.stage === 'start') { const o = nearNode(c.x, c.z, 0, 200), i0 = Math.round(o.x / P + N / 2), k0 = Math.round(o.z / P + N / 2); j.route = [node(i0, k0), node(i0 + 2, k0), node(i0 + 2, k0 + 2), node(i0, k0 + 2)]; j.k = 0; j.stage = 'stop'; this.mark(p, j.route[0], '#ff5a7a', 'STOP'); }
      if (j.stage === 'stop') { const s = j.route[j.k]; p.jobText = `BUS · stop ${j.k + 1}/4  (${Math.round(hyp(c.x - s.x, c.z - s.z))} m) · stop fully for passengers`; if (this.arrived(p, s, dt, 1.6)) { this.pay(p, 60, 'PASSENGERS'); j.k++; if (j.k >= j.route.length) { this.pay(p, 200, 'ROUTE COMPLETE'); j.stage = 'start'; } else this.mark(p, j.route[j.k], '#ff5a7a', 'STOP'); } }
    } else if (type === 'hauler') {
      if (j.stage === 'start') { j.from = nearNode(c.x, c.z, 60, 220); j.stage = 'load'; this.mark(p, j.from, '#ffd23a', 'CARGO'); }
      if (j.stage === 'load') { p.jobText = `TRUCK · collect cargo (${Math.round(hyp(c.x - j.from.x, c.z - j.from.z))} m)`; if (this.arrived(p, j.from, dt, 1.5)) { j.to = nearNode(j.from.x, j.from.z, 320, 640); j.dist = hyp(j.to.x - j.from.x, j.to.z - j.from.z); j.hp0 = v.hp; j.stage = 'deliver'; this.mark(p, j.to, '#4dff88', 'DELIVER'); p.say('Cargo loaded. Drive carefully!', 3); } }
      else if (j.stage === 'deliver') { p.jobText = `TRUCK · deliver (${Math.round(hyp(c.x - j.to.x, c.z - j.to.z))} m) · cargo ${v.hp >= j.hp0 - 8 ? 'intact' : 'damaged'}`; if (this.arrived(p, j.to, dt, 1.5)) { const dmg = Math.max(0, Math.min(1, (j.hp0 - v.hp) / 40)); this.pay(p, (120 + j.dist * 0.25) * (1 - dmg * 0.6), dmg > 0.1 ? 'DELIVERY (damaged)' : 'DELIVERY'); j.stage = 'start'; } }
    }
  }
}
