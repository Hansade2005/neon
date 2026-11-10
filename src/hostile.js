// Hostile humans (bank guards, gang members): chase the nearest player on foot and punch. Hooks into npc.updatePed through ped.ai.
import { spawnPerson } from './people.js';
import { Audio } from './audio.js';
const hyp = Math.hypot, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export async function spawnHostile(world, id, x, z, o = {}) {
  const person = await spawnPerson(id); (o.parent || world.scene).add(person.root);
  const ped = { person, x, z, yaw: 0, kind: 'thug', mode: 'thug', hp: o.hp || 100, keep: true, speed: o.speed || 3.3, fleeT: 0, dead: false, cd: 0, aggro: o.aggro ?? 60, patrol: o.patrol || null, wp: 0, anim: '', alert: false };
  ped.play = a => { if (ped.anim !== a) { ped.anim = a; person.play(a, { speed: 1 }); } };
  ped.ai = dt => {
    if (ped.dead || ped.surrender || ped.stunT > 0) return; ped.cd -= dt;
    let tp = null, td = 1e9; for (const p of world.players) { if ((p.interior || null) !== (o.interior || null) && o.interior !== undefined) continue; const d = hyp(p.x() - ped.x, p.z() - ped.z); if (d < td) { td = d; tp = p; } }
    ped.alert = !!(tp && ped.aggro > 0 && td < ped.aggro && (tp.state !== 'car' || td < 30));
    if (ped.alert && td > 1.3) { const a = Math.atan2(tp.x() - ped.x, tp.z() - ped.z); ped.yaw += wrap(a - ped.yaw) * Math.min(1, dt * 9); const nx = ped.x + Math.sin(ped.yaw) * ped.speed * dt, nz = ped.z + Math.cos(ped.yaw) * ped.speed * dt; if (!world.city.blockedAt || !world.city.blockedAt(nx, nz)) { ped.x = nx; ped.z = nz; } ped.play('Run'); }
    else if (ped.alert) { ped.yaw = Math.atan2(tp.x() - ped.x, tp.z() - ped.z); ped.play('Idle'); if (ped.cd <= 0 && tp.state !== 'car') { ped.cd = 1.15; person.play('Punch', { loop: false, speed: 1.5, fade: 0.08 }); ped.anim = ''; setTimeout(() => { if (!ped.dead && hyp(tp.x() - ped.x, tp.z() - ped.z) < 2.1) { tp.hp -= o.dmg || 7; tp.person.play('Hit', { loop: false, speed: 1.2, fade: 0.08 }); Audio.sfx && Audio.sfx.punch && Audio.sfx.punch(); } }, 260); } }
    else if (ped.patrol) { const w = ped.patrol[ped.wp % ped.patrol.length], d = hyp(w.x - ped.x, w.z - ped.z); if (d < 1.2) ped.wp++; else { const a = Math.atan2(w.x - ped.x, w.z - ped.z); ped.yaw += wrap(a - ped.yaw) * Math.min(1, dt * 6); ped.x += Math.sin(ped.yaw) * 1.3 * dt; ped.z += Math.cos(ped.yaw) * 1.3 * dt; ped.play('Walk'); } }
    else ped.play('Idle');
  };
  ped.play('Idle'); world.peds.push(ped); person.root.position.set(x, 0.1, z); return ped;
}
