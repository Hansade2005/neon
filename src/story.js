// SUPERSTAR LIFE: story engine (async script runner, cut-scenes, dialogue, objectives) + Act 1.
import * as THREE from 'three';
import * as UI from './ui.js';
import { Audio } from './audio.js';
import { createVehicle } from './vehicle.js';
import { CARS } from './car.js';
import { nodePos } from './city.js';
import { install } from './story2.js';
const hyp = Math.hypot, V = a => new THREE.Vector3(...a), sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = id => document.getElementById(id);

export class Story {
  constructor(world, players, gp) {
    this.world = world; this.players = players; this.p = players[0]; this.gp = gp; this.M = world.mansion; this.target = null; this.waits = []; this.skip = false; this.fame = 0; this.paps = []; this.t = 0; this.running = true;
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 70, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); this.beam.visible = false; world.scene.add(this.beam);
    this.studio = nodePos(2, 3); this.buildStudioSign();
    window.addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'Space') this.skip = true; });
  }
  buildStudioSign() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#0a0612'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#ff2bd6'; g.font = '900 120px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2bd6'; g.shadowBlur = 34; g.fillText('NEON RECORDS', 512, 120); g.font = '700 40px Arial'; g.fillStyle = '#19e6ff'; g.shadowColor = '#19e6ff'; g.fillText('RECORDING STUDIOS', 512, 215); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); s.position.set(this.studio.x, 14, this.studio.z); this.world.scene.add(s); this.sign = s;
  }
  // ------------------------------------------------------------------ building blocks
  setTarget(pos, text) { this.target = pos ? { x: pos.x, z: pos.z, r: pos.r || 4 } : null; $('obj').textContent = text ? '◆ ' + text : ''; this.beam.visible = !!pos; if (pos) this.beam.position.set(pos.x, 35, pos.z); this.world.pois = this.world.pois.filter(q => !q.story); if (pos) this.world.pois.push({ x: pos.x, z: pos.z, color: '#ffd23a', r: 7, story: true }); }
  until(fn) { return new Promise(res => this.waits.push({ fn, res })); }
  async subtitle(who, text, voice) { const el = $('sub'); el.innerHTML = `<b>${who}</b> ${text}`; el.style.opacity = 1; const d = voice ? await Audio.story(voice) : 0; await sleep(Math.max(1400, (d || 0) * 1000 + 350, voice ? 0 : text.length * 55)); el.style.opacity = 0; }
  async bark(who, text, voice) { this.subtitle(who, text, voice); }
  async cutscene(shots) {
    const p = this.p; p.locked = true; $('bars').className = 'bars on'; $('obj').style.opacity = 0; this.skip = false; let aborted = false;
    for (const sh of shots) {
      if (aborted) break; const t0 = performance.now(), dur = sh.dur * 1000; const a = sh.a, b = sh.b || sh.a; this.skip = false;
      if (sh.sub) this.subtitle(sh.sub[0], sh.sub[1], sh.voice); else $('sub').style.opacity = 0;
      p.cut = { apply: K => { const t = Math.min(1, (performance.now() - t0) / dur), e = t * t * (3 - 2 * t); K.position.lerpVectors(V(a.pos), V(b.pos), e); K.lookAt(new THREE.Vector3().lerpVectors(V(a.look), V(b.look), e)); K.fov = a.fov + ((b.fov ?? a.fov) - a.fov) * e; K.updateProjectionMatrix(); } };
      await new Promise(res => { const iv = setInterval(() => { if (performance.now() - t0 >= dur || this.skip) { clearInterval(iv); aborted = aborted || this.skip && shots.length > 1; res(); } }, 40); });
    }
    p.cut = null; $('bars').className = 'bars'; $('sub').style.opacity = 0; $('obj').style.opacity = 1; p.locked = false; p.cam.snap = true;
  }
  talk(who, portrait, text, voice) {   // one dialogue line; resolves when the player continues
    return new Promise(res => { if (voice) Audio.story(voice); this.panel(`<div class="dlg"><img src="../assets/ui/person_${portrait}.jpg"><div><b>${who}</b><p>${text}</p></div></div><div class="menu"><div class="it" data-i="n">CONTINUE ▶</div></div>`, () => { UI.closePanel(); this.close(); res(); }); });
  }
  choose(who, portrait, options) {   // -> index
    return new Promise(res => this.panel(`<div class="dlg"><img src="../assets/ui/person_${portrait}.jpg"><div><b>${who}</b><p>Choose a reply:</p></div></div><div class="menu">${options.map((o, i) => `<div class="it" data-i="${i}">${i + 1}. ${o}</div>`).join('')}</div>`, i => { UI.closePanel(); this.close(); res(+i); }));
  }
  panel(html, act) { UI.panel(`<div class="screen small" style="width:640px">${html}</div>`, act, () => {}); this.onPanelOpen && this.onPanelOpen(); }
  close() { this.onPanelClose && this.onPanelClose(); }
  addInteract(x, z, prompt, action, r) { const k = { x, z, shop: false, custom: { prompt, action }, g: null, r }; this.gp.kiosks.push(k); return () => { const i = this.gp.kiosks.indexOf(k); if (i >= 0) this.gp.kiosks.splice(i, 1); }; }
  interact(x, z, prompt) { return new Promise(res => { const off = this.addInteract(x, z, prompt, () => { off(); res(); }); }); }
  setFame(n) { this.fame = n; this.p.fame = n; }
  // ------------------------------------------------------------------ garage
  chooseCar() {
    const pool = CARS.filter(c => ['vanta', 'phantom', 'kestrel', 'bulldog', 'viper'].includes(c.id));
    return new Promise(res => this.panel(`<h2>THE GARAGE</h2><div class="menu">${pool.map(c => `<div class="it" data-i="${c.id}">${c.name} <small>${c.cls}</small></div>`).join('')}</div>`, async id => { UI.closePanel(); this.close(); const M = this.M, v = await this.world.addVehicle(id, M.driveway.x, M.driveway.z, Math.PI / 2, null, 'parked'); v.car.h = Math.PI / 2; res(v); }));
  }
  // ------------------------------------------------------------------ paparazzi (bikes) chasing the star
  async spawnPaps() {
    const W = this.world; Audio.story('paps_0'); this.subtitle('Paparazzi', 'Nova! Nova! Over here!');
    for (let i = 0; i < 3; i++) { const a = this.M.cx + 90 + i * 8, v = await W.addVehicle('viper', a, this.M.cz + 7 + i * 2, -Math.PI / 2, ['#ffd23a', '#2f7bff', '#ff2bd6'][i], 'pap'); v.kind = 'pap'; v.cruise = 22 + i * 2; v.route = null; v.routeT = 0; W.attachDriver(v, ['m4', 'm2', 'f4'][i]); this.paps.push(v); }
  }
  updatePaps(dt) {
    const p = this.p, W = this.world; for (const v of this.paps) { if (v.exploded) continue; this.gp.copDrive(v, p, dt); const d = hyp(v.car.x - p.x(), v.car.z - p.z()); if (d < 14 && p.state === 'car' && Math.random() < dt * 0.5) { p.flash = 0.35; this.setFame(this.fame + 5); p.say('+5 FAME', 1); } }
    p.flashEl && 0;
  }
  // ------------------------------------------------------------------ ACT 1
  async act1() {
    const p = this.p, M = this.M, c = [M.cx, M.cz]; p.locked = true; p.hp = 100;
    p.pos.set(M.start.x, 0.1, M.start.z); p.yaw = Math.PI; p.cam.yaw = Math.PI; p.cam.snap = true;
    await this.cutscene([
      { dur: 7, a: { pos: [c[0] + 100, 56, c[1] + 86], look: [c[0] - 25, 6, c[1] - 35], fov: 52 }, b: { pos: [c[0] + 46, 30, c[1] + 40], look: [c[0] - 25, 6, c[1] - 35], fov: 50 }, sub: ['Narrator', 'Los Angeles. Seven in the morning. Another day in the Hollywood Hills.'], voice: 'narr_0' },
      { dur: 6.5, a: { pos: [c[0] - 62, 14, c[1] + 8], look: [c[0] - 22, 1, c[1] - 14], fov: 46 }, b: { pos: [c[0] - 34, 9, c[1] - 4], look: [c[0] - 22, 1, c[1] - 14], fov: 44 }, sub: ['Narrator', 'For most people, this is a dream. For Nova Vega, it is Tuesday.'], voice: 'narr_1' },
      { dur: 6, a: { pos: [c[0] - 8, 2.3, c[1] - 17], look: [c[0] - 16, 1.6, c[1] - 25], fov: 42 }, b: { pos: [c[0] - 11, 2, c[1] - 20], look: [c[0] - 16, 1.6, c[1] - 25], fov: 38 }, sub: ['Narrator', 'Three number-one albums. Two world tours. And one very loud alarm clock.'], voice: 'narr_2' },
    ]);
    p.pos.set(M.start.x, 0.1, M.start.z); p.cam.snap = true;
    this.setTarget({ x: M.npcs.marcus.x + 2, z: M.npcs.marcus.z, r: 4 }, 'Talk to Marcus by the pool');
    await this.interact(M.npcs.marcus.x, M.npcs.marcus.z, 'F  Talk to Marcus'); this.setTarget(null, '');
    await this.talk('Marcus', 'm1', 'Morning, superstar. Coffee\'s hot, and the whole world is waiting for you.', 'marcus_0');
    for (let rounds = 0; rounds < 3; rounds++) {
      const ch = await this.choose('Nova', 'f1', ['Five more minutes. Please.', 'I\'m ready. Where\'s the car?', 'Where are the kids?']); Audio.story(['nova_1', 'nova_2', 'nova_3'][ch]);
      if (ch === 0) await this.talk('Marcus', 'm1', 'Ha! Tell that to your manager. He has called six times already.', 'marcus_1');
      else if (ch === 2) await this.talk('Marcus', 'm1', 'Zoe and Leo are out back, pretending the pool is a pirate ship.', 'marcus_3');
      else { await this.talk('Marcus', 'm1', 'The garage is open. Take whichever one you like, just don\'t scratch the paint.', 'marcus_2'); break; }
    }
    await this.talk('Marcus', 'm1', 'Studio at nine. The label wants to hear the new single. Go make history.', 'marcus_4');
    this.setTarget({ x: M.garageSpot.x, z: M.garageSpot.z, r: 4 }, 'Pick a car in the garage'); await this.interact(M.garageSpot.x, M.garageSpot.z, 'F  Choose a car');
    this.setTarget(null, ''); const car = await this.chooseCar(); this.setTarget({ x: M.driveway.x, z: M.driveway.z, r: 6 }, 'Get in your car'); this.setFame(10);
    await this.until(() => p.state === 'car' && p.vehicle === car); this.setTarget(this.studio, 'Drive to Neon Records Studios'); this.studioOpen = true;
    await this.until(() => hyp(p.x() - M.cx, p.z() - M.cz) > 130); await this.spawnPaps(); this.pursuit = true; p.say('Lose the paparazzi, or enjoy the fame', 4); Audio.story('nova_4');
    await this.until(() => p.state === 'car' && hyp(p.x() - this.studio.x, p.z() - this.studio.z) < 14 && p.vehicle.car.speed < 12);
    this.pursuit = false; this.setTarget(null, ''); for (const v of this.paps) { v.kind = 'gone'; this.world.scene.remove(v.root); this.world.vehicles.splice(this.world.vehicles.indexOf(v), 1); } this.paps = [];
    const s = this.studio; await this.cutscene([{ dur: 6, a: { pos: [s.x + 20, 6, s.z + 14], look: [s.x, 6, s.z], fov: 52 }, b: { pos: [s.x + 12, 4, s.z + 8], look: [s.x, 5, s.z], fov: 44 }, sub: ['Producer', 'Everyone, quiet! The Queen of the Neon Skyline has arrived.'], voice: 'producer_0' }, { dur: 4, a: { pos: [s.x + 12, 4, s.z + 8], look: [s.x, 5, s.z], fov: 44 }, sub: ['Nova', 'Let\'s make a hit.'], voice: 'nova_7' }]);
    this.setFame(this.fame + 100);
    await this.talk('Narrator', 'f1', 'Act one is complete. The tour begins in Los Angeles.', 'narr_3');
    await this.actEnd(1, 'Act 2: The Tour');
  }
  update(dt) {
    this.t += dt; for (let i = this.waits.length - 1; i >= 0; i--) if (this.waits[i].fn()) { const w = this.waits.splice(i, 1)[0]; w.res(); }
    if (this.target) { const d = hyp(this.p.x() - this.target.x, this.p.z() - this.target.z); this.beam.material.opacity = 0.25 + Math.sin(this.t * 3) * 0.08; if (this.beam.visible) this.beam.position.y = 35; }
    if (this.pursuit) this.updatePaps(dt);
    if (this.p.flash > 0) { this.p.flash -= dt; $('flash').style.opacity = Math.min(1, this.p.flash * 3); } else $('flash').style.opacity = 0;
    $('fame').textContent = '★ FAME ' + this.fame;
  }
}

install(Story);
