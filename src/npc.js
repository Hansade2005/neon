// Ambient life: lane-following traffic that obeys the lights, and pedestrians on the sidewalks.
import * as THREE from 'three';
import { N, P, RW, nodePos, DIRS, laneCoord, onRoad } from './city.js';
import { createVehicle } from './vehicle.js';
import { spawnPerson, CAST } from './people.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const PAINTS = ['#d00000', '#1d3557', '#f1f1ee', '#0d0d10', '#3b3f46', '#2f7bff', '#ffb703', '#0b6e4f', '#8d99ae', '#e76f51', '#6d597a'];
const TRAFFIC = ['meridian', 'orion', 'atlas', 'taxi', 'kestrel', 'bulldog', 'taxi', 'fox', 'viper', 'cruiser', 'bus', 'hauler', 'taxi', 'meridian'];
const TRAFFIC_LOW = ['meridian', 'orion', 'atlas', 'taxi', 'meridian', 'orion', 'taxi', 'cruiser'], PARKED_LOW = ['meridian', 'orion', 'taxi', 'atlas', 'meridian', 'orion'];
const hasEdge = (i, j, d) => { const a = i + DIRS[d][0], b = j + DIRS[d][1]; return a >= 0 && a <= N && b >= 0 && b <= N; };
const rnd = (a, b) => a + Math.random() * (b - a), pick = arr => arr[(Math.random() * arr.length) | 0];

// ---------------------------------------------------------------- traffic
function chooseNext(ai) { const opts = []; for (let d = 0; d < 4; d++) { if (d === (ai.d + 2) % 4) continue; if (hasEdge(ai.i + DIRS[ai.d][0], ai.j + DIRS[ai.d][1], d)) opts.push(d === ai.d ? ai.d : d, ...(d === ai.d ? [ai.d, ai.d] : [])); } ai.nd = opts.length ? pick(opts) : (ai.d + 2) % 4; }
export async function spawnTrafficCar(world, near) {
  // pick a random edge near a player, on a lane, away from players' sight
  let i = 0, j = 0, d = 0, lane = 0, tries = 0, x, z;
  do {
    const c = near ? { x: near.x + rnd(-190, 190), z: near.z + rnd(-190, 190) } : { x: rnd(-300, 300), z: rnd(-300, 300) };
    i = clamp(Math.round(c.x / P + N / 2), 0, N - 1); j = clamp(Math.round(c.z / P + N / 2), 0, N - 1); d = (Math.random() * 4) | 0; if (!hasEdge(i, j, d)) continue;
    lane = Math.random() < 0.5 ? 0 : 1; const n = nodePos(i, j), lc = laneCoord(d, lane, i, j), t = rnd(14, P - 22);
    x = d % 2 === 0 ? n.x + DIRS[d][0] * t : lc.v; z = d % 2 === 0 ? lc.v : n.z + DIRS[d][1] * t;
    if (world.players.every(p => Math.hypot(p.x() - x, p.z() - z) > 70) && world.vehicles.every(v => Math.hypot(v.car.x - x, v.car.z - z) > 9)) break;
  } while (++tries < 14);
  if (tries >= 14) return null;
  const id = pick(window.__lowGpu ? TRAFFIC_LOW : TRAFFIC), h = Math.atan2(DIRS[d][0], DIRS[d][1]), v = await createVehicle(world.scene, id, x, z, h, pick(PAINTS));
  v.kind = 'traffic'; v.ai = { i, j, d, lane, nd: d, cruise: id === 'cruiser' ? rnd(4.5, 6.5) : id === 'bus' || id === 'hauler' ? rnd(8, 11) : id === 'viper' ? rnd(12, 18) : rnd(10, 15) }; chooseNext(v.ai); v.car.vx = Math.sin(h) * 8; v.car.vz = Math.cos(h) * 8; world.vehicles.push(v); return v;
}
export function driveAI(world, v, dt) {
  const c = v.car, a = v.ai; if (!a) return; const n0 = nodePos(a.i, a.j), [dx, dz] = DIRS[a.d];
  const proj = (c.x - n0.x) * dx + (c.z - n0.z) * dz;
  if (proj >= P) { a.i += dx; a.j += dz; a.d = a.nd; chooseNext(a); return; }
  if (proj < -6) { a.i -= dx; a.j -= dz; return; }                 // drifted behind the node (after a turn) - snap back onto the previous edge
  const speed = c.speed; const L = 6 + speed * 0.55; let tx, tz;
  const lc = laneCoord(a.d, a.lane, a.i, a.j), along = proj + L;
  if (along <= P) { tx = a.d % 2 === 0 ? n0.x + dx * along : lc.v; tz = a.d % 2 === 0 ? lc.v : n0.z + dz * along; }
  else { const n1 = nodePos(a.i + dx, a.j + dz), lc2 = laneCoord(a.nd, a.lane, a.i + dx, a.j + dz), [ex, ez] = DIRS[a.nd], a2 = along - P; tx = a.nd % 2 === 0 ? n1.x + ex * a2 : lc2.v; tz = a.nd % 2 === 0 ? lc2.v : n1.z + ez * a2; }
  const err = wrap(Math.atan2(tx - c.x, tz - c.z) - c.h);
  // speed target
  let vt = a.cruise; const turn = a.nd !== a.d; if (turn && proj > P - 28) vt = Math.min(vt, 6.5);
  const axis = a.d % 2 === 0 ? 'x' : 'z', toLine = P - 11 - proj;
  if (toLine > -3 && toLine < 26) { const st = world.city.signalState(axis, world.t); if (st === 'r' || (st === 'y' && toLine > speed * 0.9)) vt = Math.min(vt, Math.max(0, (toLine - 1.5)) * 0.5); }
  const fx = Math.sin(c.h), fz = Math.cos(c.h);
  for (const o of world.vehicles) { if (o === v) continue; const rx = o.car.x - c.x, rz = o.car.z - c.z, f = rx * fx + rz * fz; if (f > 1 && f < 20) { const lat = Math.abs(rx * fz - rz * fx); if (lat < 2.3) vt = Math.min(vt, Math.max(0, (f - 6) * 0.6)); } }
  for (const p of world.players) { if (p.state === 'car') continue; const rx = p.x() - c.x, rz = p.z() - c.z, f = rx * fx + rz * fz; if (f > 1 && f < 16 && Math.abs(rx * fz - rz * fx) < 2) vt = Math.min(vt, Math.max(0, (f - 5) * 0.5)); }
  const ev = vt - speed; c.input = { throttle: ev > 0 ? clamp(ev / 3, 0, 1) : 0, brake: ev < -0.5 ? clamp(-ev / 5, 0, 1) : 0, steer: clamp(err * 1.7, -1, 1), hand: 0, nitro: 0 };
}

// ---------------------------------------------------------------- pedestrians
const SIDE = 31;   // distance from block centre to the walkway
function perimPos(cx, cz, t, cw) {   // t in [0, 8*SIDE); position and heading around the square, cw or ccw
  const per = 8 * SIDE; t = ((t % per) + per) % per; const e = t / (2 * SIDE), k = Math.min(3, Math.floor(e)), u = (t - k * 2 * SIDE) - SIDE;
  let x, z, hx, hz; if (k === 0) { x = cx + u; z = cz - SIDE; hx = 1; hz = 0; } else if (k === 1) { x = cx + SIDE; z = cz + u; hx = 0; hz = 1; } else if (k === 2) { x = cx - u; z = cz + SIDE; hx = -1; hz = 0; } else { x = cx - SIDE; z = cz - u; hx = 0; hz = -1; }
  return { x, z, hx: cw ? -hx : hx, hz: cw ? -hz : hz };
}
export async function spawnPed(world, near) {
  const bx = clamp(Math.round((near.x + rnd(-130, 130)) / P + N / 2 - 0.5), 0, N - 1), bz = clamp(Math.round((near.z + rnd(-130, 130)) / P + N / 2 - 0.5), 0, N - 1);
  const cx = (bx + 0.5 - N / 2) * P, cz = (bz + 0.5 - N / 2) * P, t = rnd(0, 8 * SIDE), cw = Math.random() < 0.5, pos = perimPos(cx, cz, t, cw);
  if (world.players.some(p => Math.hypot(p.x() - pos.x, p.z() - pos.z) < 40)) return null;
  const person = await spawnPerson(pick(window.__lowGpu ? CAST.slice(0, 4) : CAST).id); world.scene.add(person.root);
  const talker = Math.random() < 0.28; const ped = { person, cx, cz, t, cw, x: pos.x, z: pos.z, yaw: Math.atan2(pos.hx, pos.hz), mode: talker ? 'stand' : 'walk', speed: rnd(1.1, 1.5), anim: null, kind: 'ped', hp: 100, fleeT: 0 };
  if (talker) person.play(pick(['Talk', 'Phone', 'Idle']), { speed: rnd(0.8, 1.1) }); else person.play('Walk', { speed: ped.speed / 1.35 });
  person.update(Math.random() * 3); world.peds.push(ped); syncPed(ped); return ped;
}
function syncPed(p) { p.person.root.position.set(p.x, onRoad(p.x, p.z) ? 0 : 0.16, p.z); p.person.root.rotation.y = p.yaw; }
export function updatePed(world, p, dt) {
  let dn = 9999; for (const q of world.players) dn = Math.min(dn, Math.hypot(q.x() - p.x, q.z() - p.z)); if (dn < 130) p.person.update(dt);
  if (p.ai) { p.fleeT = 0; p.ai(dt); syncPed(p); return; }
  if (p.fleeT > 0) { p.fleeT -= dt; const a = p.fleeAng; p.x += Math.sin(a) * 4.8 * dt; p.z += Math.cos(a) * 4.8 * dt; p.yaw = a; syncPed(p); return; }
  if (p.mode === 'walk') {
    p.t += p.speed * dt; const pos = perimPos(p.cx, p.cz, p.t, p.cw); const want = Math.atan2(pos.hx, pos.hz);
    // step aside from cars / other players
    p.x += (pos.x - p.x) * Math.min(1, dt * 4); p.z += (pos.z - p.z) * Math.min(1, dt * 4); p.yaw += wrap(want - p.yaw) * Math.min(1, dt * 6);
    // cross to neighbouring block at corners occasionally (keeps crowds spread out)
  } else { /* talkers stay put and face a random heading */ }
  syncPed(p);
}
export function scareNear(world, x, z, r) { for (const p of world.peds) { const d = Math.hypot(p.x - x, p.z - z); if (d < r && p.fleeT <= 0) { p.fleeT = rnd(3, 6); p.fleeAng = Math.atan2(p.x - x, p.z - z) + rnd(-0.5, 0.5); p.person.play('Run', { speed: 1.0 }); } } }

const PARKED = ['taxi', 'hauler', 'meridian', 'orion', 'atlas', 'kestrel', 'bulldog', 'fox', 'vanta', 'meridian', 'orion', 'viper', 'viper', 'cruiser'];
export async function spawnParkedCar(world, near) {
  for (let t = 0; t < 14; t++) {
    const px = near.x + rnd(-110, 110), pz = near.z + rnd(-110, 110), i = clamp(Math.round(px / P + N / 2), 0, N - 1), j = clamp(Math.round(pz / P + N / 2), 0, N - 1), d = (Math.random() * 4) | 0; if (!hasEdge(i, j, d)) continue;
    const n = nodePos(i, j), along = rnd(16, P - 16), side = Math.random() < 0.5 ? 1 : -1, off = 8.1 * side; let x, z;
    if (d % 2 === 0) { x = n.x + DIRS[d][0] * along; z = n.z + off; } else { x = n.x + off; z = n.z + DIRS[d][1] * along; }
    if (Math.hypot(x - near.x, z - near.z) < 14 || world.vehicles.some(v => Math.hypot(v.car.x - x, v.car.z - z) < 7) || world.players.some(p => Math.hypot(p.x() - x, p.z() - z) < 14)) continue;
    const h = d % 2 === 0 ? (side > 0 ? 0 : Math.PI) + Math.PI / 2 : (side > 0 ? Math.PI : 0), id = pick(window.__lowGpu ? PARKED_LOW : PARKED), v = await createVehicle(world.scene, id, x, z, h, pick(PAINTS));
    v.kind = 'parked'; v.car.input = { throttle: 0, brake: 0, steer: 0, hand: 1, nitro: 0 }; world.vehicles.push(v); return v;
  }
  return null;
}
