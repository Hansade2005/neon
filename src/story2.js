// SUPERSTAR LIFE, Acts 2-5: concert minigame, stage, thugs, chases, escape and the two endings.
import * as THREE from 'three';
import { Audio } from './audio.js';
import { spawnPerson } from './people.js';
import { nodePos } from './city.js';
import * as UI from './ui.js';
const hyp = Math.hypot, sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const SONGS = [
  { name: 'Neon Skyline', bpm: 112, root: 57, scale: [0, 3, 5, 7, 10], bars: 24, dens: 0.55, seed: 7 },
  { name: 'Midnight Strip', bpm: 124, root: 55, scale: [0, 2, 3, 7, 9], bars: 28, dens: 0.62, seed: 21 },
  { name: 'Lake Effect', bpm: 98, root: 52, scale: [0, 2, 4, 7, 9], bars: 24, dens: 0.58, seed: 33 },
  { name: 'Queen of the Skyline', bpm: 132, root: 57, scale: [0, 3, 5, 7, 10], bars: 32, dens: 0.72, seed: 99 },
];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const HIDE = { x: 640, z: 300 }, HARBOR = { x: -640, z: -280 }, GATE = 392;

export function install(Story) {
  const S = Story.prototype;
  S.run = async function (start = 1) {
    if (this.p.person && !this.p.isNova) { await this.switchTo('f1'); this.p.isNova = true; }
    const acts = [null, this.act1, this.act2, this.act3, this.act4, this.act5];
    for (let a = start; a <= 5 && this.running; a++) await acts[a].call(this);
  };
  // ---------------------------------------------------------------- overlays
  S.fade = async function (to, ms = 700) { let f = $('fade'); if (!f) { f = document.createElement('div'); f.id = 'fade'; f.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:5'; $('story').appendChild(f); } f.style.transition = `opacity ${ms}ms`; f.offsetWidth; f.style.opacity = to; await sleep(ms); };
  S.card = async function (title, sub, ms = 3200) {
    let c = $('card'); if (!c) { c = document.createElement('div'); c.id = 'card'; c.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:6;color:#fff;text-align:center;opacity:0;transition:opacity .6s;pointer-events:none;font-family:Georgia,serif'; $('story').appendChild(c); }
    c.innerHTML = `<div style="font:800 54px Arial;letter-spacing:8px;color:#ff2bd6;text-shadow:0 0 24px #ff2bd6">${title}</div><div style="font:600 22px Arial;margin-top:14px;letter-spacing:3px;color:#19e6ff">${sub}</div>`; c.style.opacity = 1; await sleep(ms); c.style.opacity = 0; await sleep(600);
  };
  S.actEnd = async function (n, next) {
    const p = this.p; this.setTarget(null, ''); const cash = Math.round(p.cash || 0);
    const r = await new Promise(res => this.panel(`<h2>ACT ${n} COMPLETE</h2><div class="bal"><div>FAME <b>${this.fame}</b></div><div>CASH <b>$${cash}</b></div></div>${next ? `<p style="opacity:.8">Next: ${next}</p>` : ''}<div class="menu"><div class="it" data-i="next">${next ? 'CONTINUE ▶' : 'KEEP EXPLORING'}</div><div class="it" data-i="title">QUIT TO TITLE</div></div>`, i => { UI.closePanel(); this.close(); res(i); }));
    if (r === 'title') { this.running = false; this.onQuit && this.onQuit(); await new Promise(() => {}); }
  };
  S.reward = function (fame, cash, text) { this.setFame(this.fame + fame); this.p.cash = (this.p.cash || 0) + cash; this.p.say(`${text}  +${fame} FAME  +$${cash}`, 3); };
  S.teleport = function (x, z, yaw = Math.PI) { const p = this.p; if (p.state === 'car') this.gp.teleportTo(p, { x, z }); if (p.state !== 'foot') { p.state = 'foot'; p.seq = null; p.vehicle && (p.vehicle.driver = null); } p.pos.set(x, 0.1, z); p.yaw = yaw; p.cam.yaw = yaw; p.cam.snap = true; p.person.play('Idle'); };
  S.ensureCar = async function (id = 'vanta', x, z, h = 0) { const p = this.p; let v = p.vehicle; if (p.state === 'car' && v && !v.exploded) return v; v = await this.world.addVehicle(id, x ?? p.x() + 3, z ?? p.z(), h, null, 'parked'); v.car.h = h; v.hp = v.maxHp || v.hp; p.state = 'foot'; p.pos.set(v.car.x, 0.1, v.car.z); p.seatDirect(v); return v; };
  S.switchTo = async function (id) { const p = this.p; try { const old = p.person, nr = await spawnPerson(id); const par = old.root.parent; par.add(nr.root); nr.root.position.copy(old.root.position); nr.root.rotation.copy(old.root.rotation); par.remove(old.root); p.person = nr; nr.play(p.state === 'car' ? 'Drive' : 'Idle'); } catch (e) { console.warn('switch failed', e); } };
  S.hotelSign = function (pos) { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#071018'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#ffd23a'; g.font = '900 100px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ffb020'; g.shadowBlur = 30; g.fillText('NEON GRAND HOTEL', 512, 120); g.font = '700 38px Arial'; g.fillStyle = '#19e6ff'; g.fillText('SUITES · ROOF POOL · 24H', 512, 212); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); m.position.set(pos.x, 14, pos.z); this.world.scene.add(m); };
  // ---------------------------------------------------------------- stage + concert minigame
  S.buildStage = function (city) {
    const A = this.world.arena, cx = A.cx, cz = A.cz; if (!this.stage) {
      const G = new THREE.Group(); this.stage = { G, beams: [], cx, cz }; this.world.scene.add(G);
      const rise = new THREE.Mesh(new THREE.BoxGeometry(26, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.35, metalness: 0.6, emissive: 0x220033, emissiveIntensity: 0.6 })); rise.position.set(cx, 0.07, cz); G.add(rise);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(26.4, 0.06, 16.4), new THREE.MeshBasicMaterial({ color: 0xff2bd6 })); edge.position.set(cx, 0.15, cz); G.add(edge);
      this.stage.screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); const scr = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), this.stage.screenMat); scr.position.set(cx - 8.4, 6.5, cz); scr.rotation.y = Math.PI / 2; G.add(scr);
      for (const dz of [-14, 14]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5, 2.2), new THREE.MeshStandardMaterial({ color: 0x101014 })); sp.position.set(cx - 6, 2.5, cz + dz); G.add(sp); }
      const truss = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 30), new THREE.MeshStandardMaterial({ color: 0x2a2a33, metalness: 0.8 })); truss.position.set(cx - 2, 12, cz); G.add(truss);
      const cols = [0xff2bd6, 0x19e6ff, 0xffd23a, 0x7a5cff];
      for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(2.4, 22, 14, 1, true), new THREE.MeshBasicMaterial({ color: cols[i % 4], transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); const pv = new THREE.Group(); pv.position.set(cx - 2, 12, cz - 13 + i * 3.7); b.position.y = -11; pv.add(b); G.add(pv); this.stage.beams.push(pv); }
    }
    const st = this.stage, c = document.createElement('canvas'); c.width = 1024; c.height = 360; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#120028'); gr.addColorStop(1, '#ff2bd6'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 360); g.fillStyle = '#05010a'; for (let i = 0; i < 26; i++) { const w = 20 + (i * 37) % 36, h = 60 + (i * 53) % 150; g.fillRect(i * 40, 360 - h, w, h); } g.fillStyle = '#fff'; g.font = '900 90px Arial'; g.textAlign = 'center'; g.shadowColor = '#19e6ff'; g.shadowBlur = 28; g.fillText('NOVA VEGA', 512, 120); g.font = '700 46px Arial'; g.fillStyle = '#19e6ff'; g.fillText((city || 'LOS ANGELES').toUpperCase() + ' · LIVE', 512, 190); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; st.screenMat.map = t; st.screenMat.needsUpdate = true; return st;
  };
  S.stageCam = function (on) {
    const p = this.p, st = this.stage; if (!on) { p.cut = null; return; } const t0 = performance.now();
    p.cut = { apply: K => { const t = (performance.now() - t0) / 1000, ph = Math.sin(t * 0.12) * 0.9; K.position.set(st.cx + 14 + Math.cos(ph) * 10, 3.2 + Math.sin(t * 0.3) * 0.8, st.cz + Math.sin(ph) * 14); K.lookAt(st.cx, 1.7, st.cz); K.fov = 58; K.updateProjectionMatrix(); } };
  };
  S.concert = async function (songIdx, o = {}) {
    const song = SONGS[songIdx], p = this.p, st = this.stage; const dur = 60 / song.bpm / 2, STEP = dur, lanes = ['D', 'F', 'J', 'K'], KEY = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
    let seed = song.seed; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; const notes = []; let lastLane = -1;
    for (let s = 16; s < song.bars * 8; s++) { const onBeat = s % 2 === 0; if (rnd() < song.dens * (onBeat ? 1 : 0.55)) { let l = (rnd() * 4) | 0; if (l === lastLane && rnd() < 0.6) l = (l + 1 + ((rnd() * 3) | 0)) % 4; lastLane = l; notes.push({ t: s * STEP, lane: l, hit: false, miss: false }); } }
    const total = notes.length, endT = song.bars * 8 * STEP + 1.5, cutT = o.blackoutAt ? endT * o.blackoutAt : 1e9;
    p.locked = true; this.stageCam(true); $('bars').className = 'bars on'; $('obj').style.opacity = 0; Audio.setMusicLevel && Audio.setMusicLevel(0.0);
    const root = document.createElement('div'); root.style.cssText = 'position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:4;width:520px;font-family:Arial;color:#fff;text-align:center;pointer-events:none'; const cv = document.createElement('canvas'); cv.width = 520; cv.height = 400; cv.style.cssText = 'background:linear-gradient(#0008,#000c);border:1px solid #ff2bd666;border-radius:10px'; root.appendChild(cv); $('story').appendChild(root); const g = cv.getContext('2d');
    const ac = new (window.AudioContext || window.webkitAudioContext)(), master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); const nb = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const tone = (t, f, d, type, vol, lp) => { const os = ac.createOscillator(), gn = ac.createGain(); os.type = type; os.frequency.value = f; gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); let n = os; if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; os.connect(fl); n = fl; } n.connect(gn); gn.connect(master); os.start(t); os.stop(t + d + 0.05); };
    const kick = t => { const os = ac.createOscillator(), gn = ac.createGain(); os.frequency.setValueAtTime(150, t); os.frequency.exponentialRampToValueAtTime(42, t + 0.14); gn.gain.setValueAtTime(0.9, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.25); os.connect(gn); gn.connect(master); os.start(t); os.stop(t + 0.3); };
    const hat = (t, v) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = nb; fl.type = 'highpass'; fl.frequency.value = 7000; gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(fl); fl.connect(gn); gn.connect(master); s.start(t); s.stop(t + 0.08); };
    const snare = t => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = nb; fl.type = 'bandpass'; fl.frequency.value = 1800; gn.gain.setValueAtTime(0.5, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.16); s.connect(fl); fl.connect(gn); gn.connect(master); s.start(t); s.stop(t + 0.2); };
    const prog = [0, 5, 3, 7]; let nextStep = 0; const t0 = ac.currentTime + 0.4;
    const sched = () => { while (nextStep * STEP + t0 < ac.currentTime + 0.25 && nextStep < song.bars * 8) { const s = nextStep++, t = t0 + s * STEP, bar = (s / 8) | 0, ch = prog[bar % 4], sc = song.scale, st8 = s % 8; if (st8 % 4 === 0) kick(t); if (st8 === 4) snare(t); hat(t, st8 % 2 ? 0.07 : 0.14); if (st8 % 2 === 0 && s >= 8) tone(t, mtof(song.root - 24 + ch), STEP * 1.8, 'sawtooth', 0.22, 420); if (s >= 16) { const n = sc[(s * 3 + bar) % sc.length] + (st8 % 4 === 3 ? 12 : 0); tone(t, mtof(song.root + 12 + ch + n), STEP * 0.9, 'triangle', 0.12); } if (st8 === 0) for (const iv of [0, 7, 12]) tone(t, mtof(song.root + ch + iv), STEP * 7, 'sine', 0.06); } };
    const iv = setInterval(sched, 25); sched();
    let score = 0, combo = 0, best = 0, hits = 0, hype = 0.5, flashTxt = '', flashT = 0, done = false, perfect = 0; const press = [false, false, false, false], fx = [0, 0, 0, 0];
    const judge = l => { const now = ac.currentTime - t0; let n = null; for (const q of notes) if (q.lane === l && !q.hit && !q.miss && Math.abs(q.t - now) < 0.16 && (!n || q.t < n.t)) n = q; fx[l] = 1; if (!n) { combo = 0; hype = Math.max(0, hype - 0.03); return; } n.hit = true; const d = Math.abs(n.t - now), per = d < 0.06; hits++; if (per) perfect++; combo++; best = Math.max(best, combo); score += (per ? 100 : 60) * (1 + Math.min(4, (combo / 10) | 0) * 0.25); hype = Math.min(1, hype + 0.03); flashTxt = per ? 'PERFECT' : 'GOOD'; flashT = 0.4; };
    const kd = e => { if (e.repeat || !(e.code in KEY)) return; e.preventDefault(); judge(KEY[e.code]); }; window.addEventListener('keydown', kd, true); const padPrev = [0, 0, 0, 0];
    this.skip = false; let last = performance.now(), blacked = false;
    await new Promise(res => { const loop = () => {
      const now = ac.currentTime - t0, dt = Math.min(0.05, (performance.now() - last) / 1000); last = performance.now();
      const gp = (navigator.getGamepads && navigator.getGamepads()[0]); if (gp) for (let l = 0; l < 4; l++) { const b = gp.buttons[l] && gp.buttons[l].pressed ? 1 : 0; if (b && !padPrev[l]) judge(l); padPrev[l] = b; }
      for (const q of notes) if (!q.hit && !q.miss && now > q.t + 0.16) { q.miss = true; combo = 0; hype = Math.max(0, hype - 0.05); flashTxt = 'MISS'; flashT = 0.4; }
      const beat = (now / (60 / song.bpm)) % 1, pulse = Math.pow(1 - beat, 3) * (0.5 + hype * 0.5); st.beams.forEach((b, i) => { b.rotation.z = Math.sin(now * 0.8 + i) * 0.5; b.rotation.x = Math.cos(now * 0.6 + i * 1.7) * 0.4; b.children[0].material.opacity = 0.12 + pulse * 0.3 * (0.4 + hype); });
      g.clearRect(0, 0, 520, 400); g.fillStyle = '#fff'; g.font = '800 17px Arial'; g.textAlign = 'left'; g.fillText('♪ ' + song.name.toUpperCase(), 14, 26); g.textAlign = 'right'; g.fillText('SCORE ' + Math.round(score), 506, 26); g.fillStyle = '#ffffff22'; g.fillRect(14, 36, 492, 7); g.fillStyle = '#ff2bd6'; g.fillRect(14, 36, 492 * hype, 7);
      for (let l = 0; l < 4; l++) { const x = 70 + l * 95; g.fillStyle = fx[l] > 0 ? '#ffffff30' : '#ffffff0c'; g.fillRect(x - 40, 60, 80, 300); fx[l] = Math.max(0, fx[l] - dt * 5); g.strokeStyle = ['#ff2bd6', '#19e6ff', '#ffd23a', '#7a5cff'][l]; g.lineWidth = 3; g.strokeRect(x - 30, 330, 60, 28); g.fillStyle = '#fff'; g.font = '700 14px Arial'; g.textAlign = 'center'; g.fillText(lanes[l], x, 376); }
      for (const q of notes) { if (q.hit || q.miss) continue; const y = 344 - (q.t - now) / 1.6 * 280; if (y < 50 || y > 380) continue; const x = 70 + q.lane * 95; g.fillStyle = ['#ff2bd6', '#19e6ff', '#ffd23a', '#7a5cff'][q.lane]; g.shadowColor = g.fillStyle; g.shadowBlur = 14; g.beginPath(); g.arc(x, y, 20, 0, 6.3); g.fill(); g.shadowBlur = 0; }
      if (flashT > 0) { flashT -= dt; g.fillStyle = flashTxt === 'MISS' ? '#ff5a5a' : '#fff'; g.font = '900 28px Arial'; g.textAlign = 'center'; g.fillText(flashTxt, 260, 200); } if (combo > 4) { g.fillStyle = '#ffd23a'; g.font = '800 20px Arial'; g.textAlign = 'center'; g.fillText(combo + ' COMBO', 260, 240); }
      if (now > cutT && !blacked) { blacked = true; res(); return; } if (now > endT || this.skip && o.skippable) { res(); return; } requestAnimationFrame(loop); }; loop(); });
    clearInterval(iv); window.removeEventListener('keydown', kd, true); const hitsTot = notes.filter(n => n.t < (blacked ? cutT : 1e9)).length || 1; const acc = hits / (blacked ? hitsTot : total);
    if (blacked) { master.gain.setTargetAtTime(0, ac.currentTime, 0.02); } else { master.gain.setTargetAtTime(0, ac.currentTime + 0.5, 0.4); }
    setTimeout(() => ac.close(), 1500); root.remove(); this.stageCam(false); p.locked = false; $('bars').className = 'bars'; $('obj').style.opacity = 1; Audio.setMusicLevel && Audio.setMusicLevel(1);
    const rank = acc > 0.9 ? 'S' : acc > 0.75 ? 'A' : acc > 0.55 ? 'B' : 'C'; return { score: Math.round(score), acc, rank, best, perfect, blacked };
  };
  S.concertResult = async function (r) { const f = Math.round(60 + r.acc * 240), c = Math.round(1500 + r.acc * 6500); this.reward(f, c, 'SHOW RANK ' + r.rank); await new Promise(res => this.panel(`<h2>CONCERT RESULT</h2><div class="bal"><div>RANK <b>${r.rank}</b></div><div>SCORE <b>${r.score}</b></div><div>ACCURACY <b>${Math.round(r.acc * 100)}%</b></div><div>BEST COMBO <b>${r.best}</b></div></div><div class="menu"><div class="it" data-i="n">CONTINUE ▶</div></div>`, () => { UI.closePanel(); this.close(); res(); })); };
  S.stagePerformance = async function (song, city, voiceIntro) {
    const A = this.world.arena; this.buildStage(city); this.teleport(A.cx, A.cz + 2, -Math.PI / 2); this.p.person.play('Talk'); this.stageCam(true); await this.fade(0, 600);
    if (voiceIntro) await this.subtitle('Announcer', voiceIntro[1], voiceIntro[0]); Audio.story('nova2_0'); await this.subtitle('Nova', 'Just my voice and a little luck.');
    const r = await this.concert(song); await this.concertResult(r); return r;
  };
  // ---------------------------------------------------------------- hostile NPCs
  S.spawnThug = async function (id, x, z, o = {}) {
    const person = await spawnPerson(id); this.world.scene.add(person.root); const T = this, W = this.world;
    const ped = { person, x, z, yaw: 0, kind: 'thug', mode: 'thug', hp: o.hp || 100, keep: true, speed: o.speed || 3.3, fleeT: 0, dead: false, cd: 0, aggro: o.aggro ?? 60, patrol: o.patrol || null, wp: 0, anim: '', surrender: false };
    ped.play = a => { if (ped.anim !== a) { ped.anim = a; person.play(a, { speed: 1 }); } };
    ped.ai = dt => {
      if (ped.dead || ped.surrender) return; if (ped.stunT > 0) return; ped.cd -= dt;
      let tp = null, td = 1e9; for (const p of W.players) { const d = hyp(p.x() - ped.x, p.z() - ped.z); if (d < td) { td = d; tp = p; } }
      if (tp && td < ped.aggro && (tp.state !== 'car' || td < 30)) { ped.alert = true; } if (ped.alert && tp && td > 1.3) { const a = Math.atan2(tp.x() - ped.x, tp.z() - ped.z); ped.yaw += wrap(a - ped.yaw) * Math.min(1, dt * 9); ped.x += Math.sin(ped.yaw) * ped.speed * dt; ped.z += Math.cos(ped.yaw) * ped.speed * dt; ped.play('Run'); }
      else if (ped.alert && tp) { const a = Math.atan2(tp.x() - ped.x, tp.z() - ped.z); ped.yaw = a; ped.play('Idle'); if (ped.cd <= 0 && tp.state !== 'car') { ped.cd = 1.15; person.play('Punch', { loop: false, speed: 1.5, fade: 0.08 }); ped.anim = ''; setTimeout(() => { if (!ped.dead && hyp(tp.x() - ped.x, tp.z() - ped.z) < 2) { tp.hp -= o.dmg || 7; tp.person.play('Hit', { loop: false, speed: 1.2, fade: 0.08 }); Audio.sfx && Audio.sfx.punch && Audio.sfx.punch(); } }, 260); } }
      else if (ped.patrol) { const w = ped.patrol[ped.wp % ped.patrol.length]; const d = hyp(w.x - ped.x, w.z - ped.z); if (d < 1.2) ped.wp++; else { const a = Math.atan2(w.x - ped.x, w.z - ped.z); ped.yaw += wrap(a - ped.yaw) * Math.min(1, dt * 6); ped.x += Math.sin(ped.yaw) * 1.3 * dt; ped.z += Math.cos(ped.yaw) * 1.3 * dt; ped.play('Walk'); } }
      else ped.play('Idle');
    };
    ped.play('Idle'); W.peds.push(ped); person.root.position.set(x, 0.1, z); return ped;
  };
  S.thugsLeft = function (list) { return list.filter(t => !t.dead).length; };
  S.cleanup = function (list) { for (const t of list) t.keep = false; };
  // ---------------------------------------------------------------- driving helpers
  S.direct = function (v, X, Z, sp) { const c = v.car, err = wrap(Math.atan2(X - c.x, Z - c.z) - c.h), ev = sp - c.speed; c.input = { throttle: ev > 0 ? clamp(ev / 3, 0, 1) : 0, brake: ev < -0.5 ? clamp(-ev / 5, 0, 1) : 0, steer: clamp(err * 1.9, -1, 1), hand: 0, nitro: 0 }; };
  S.driveTo = function (v, X, Z, sp, dt) { const c = v.car; v._stk = (Math.abs(c.speed) < 1.5 ? (v._stk || 0) + dt : 0); if (v._stk > 5) { const a = Math.atan2(X - c.x, Z - c.z); c.x += Math.sin(a) * 25; c.z += Math.cos(a) * 25; c.h = a; v._stk = 0; } v.cruise = sp; if (!v.route) { v.route = null; v.routeT = 0; } const inCity = Math.abs(c.x) < GATE - 4 && Math.abs(c.z) < GATE - 4; if (!inCity || Math.abs(X) > GATE) { if (inCity && Math.abs(X) > GATE) this.gp.copDrive(v, { x: () => Math.sign(X) * (GATE - 12), z: () => 0 }, dt); else this.direct(v, X, Z, sp); } else this.gp.copDrive(v, { x: () => X, z: () => Z }, dt); };
  // ---------------------------------------------------------------- places
  S.buildHideout = function () {
    if (this.hide) return; const W = this.world, C = W.city, G = new THREE.Group(), H = HIDE; W.scene.add(G); this.hide = G;
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }), box = (w, h, d, x, y, z, m, col = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(H.x + x, y, H.z + z); G.add(b); if (col) C.addCollider(H.x + x - w / 2, H.x + x + w / 2, H.z + z - d / 2, H.z + z + d / 2); return b; };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), M(0x2a2c30)); floor.rotation.x = -Math.PI / 2; floor.position.set(H.x, 0.03, H.z); G.add(floor);
    const wall = M(0x585a60), roof = M(0x2a2b30); box(60, 9, 1, 0, 4.5, -22, wall); box(60, 9, 1, 0, 4.5, 22, wall); box(1, 9, 44, -30, 4.5, 0, wall); box(1, 9, 14, 30, 4.5, -15, wall); box(1, 9, 14, 30, 4.5, 15, wall); box(62, 0.6, 46, 0, 9.3, 0, roof, false);
    for (const [x, z] of [[-18, -8], [-12, 10], [10, -12], [18, 12], [-4, 4]]) box(3, 2.4, 3, x, 1.2, z, M(0x7a5a2e));
    box(10, 3.2, 8, -22, 1.6, -14, M(0x3a3d44)); // cell block
    const lamp = new THREE.PointLight(0xff4a3a, 22, 36); lamp.position.set(H.x - 20, 6, H.z - 14); G.add(lamp); const l2 = new THREE.PointLight(0xffd9a0, 24, 50); l2.position.set(H.x, 7, H.z); G.add(l2);
    this.hideCell = { x: H.x - 22, z: H.z - 8.5 }; this.hideCrate = { x: H.x - 4, z: H.z + 4 }; this.hideExit = { x: H.x + 36, z: H.z }; this.hideInside = { x: H.x - 22, z: H.z - 9.5 };
  };
  S.buildHarbor = function () {
    if (this.harbor) return; const W = this.world, G = new THREE.Group(), H = HARBOR; W.scene.add(G); this.harbor = G; const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), new THREE.MeshStandardMaterial({ color: 0x0a3550, roughness: 0.1, metalness: 0.5, emissive: 0x04202e, emissiveIntensity: 0.8 })); sea.rotation.x = -Math.PI / 2; sea.position.set(H.x - 250, -0.02, H.z); G.add(sea);
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.9 })); quay.rotation.x = -Math.PI / 2; quay.position.set(H.x + 60, 0.03, H.z); G.add(quay);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(110, 0.3, 9), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 })); pier.position.set(H.x - 55, 0.1, H.z); G.add(pier); for (let i = 0; i < 12; i++) { const l = new THREE.PointLight(0xffd9a0, 8, 16); l.position.set(H.x - i * 9, 3, H.z + 4); G.add(l); }
    this.pierEnd = { x: H.x - 100, z: H.z };
  };
  // ================================================================= ACT 2
  S.act2 = async function () {
    const p = this.p, W = this.world; await this.fade(1, 600); await this.card('ACT 2', 'THE TOUR · LOS ANGELES'); Audio.story('n2_0'); this.hotelPos = nodePos(4, 2); this.hotelSign(this.hotelPos);
    await this.stagePerformance(0, 'Los Angeles', ['announcer_0', 'Ladies and gentlemen, the Queen of the Neon Skyline, Nova Vega!']);
    await this.fade(1, 500); await this.subtitle('Narrator', 'She sang her heart out. The crowd sang it back.', 'n2_1');
    // after-party
    const cb = W.city.clubBlock; this.teleport(cb.cx, cb.cz + 26, Math.PI); await this.fade(0, 600); const dante = await this.spawnThug('ghost', cb.cx + 8, cb.cz + 8, { hp: 300 }); dante.ai = null; dante.person.root.rotation.y = Math.PI / 2; dante.keep = true;
    this.setTarget({ x: cb.cx + 5, z: cb.cz + 8, r: 4 }, 'Meet the VIP at the Neon Club'); await this.interact(cb.cx + 8, cb.cz + 8, 'F  Talk to the VIP'); this.setTarget(null, '');
    await this.talk('Mysterious VIP', 'm3', 'Nova Vega. I have followed every show. Every song.', 'ghost_0');
    const ch = await this.choose('Nova', 'f1', ['Thanks. Do I know you?', 'Security. Someone get this man out.']); Audio.story(ch === 0 ? 'nova2_1' : 'rex_0'); if (ch === 1) await this.talk('Rex', 'm5', 'Perimeter is secure. Anything you need, boss.', 'rex_0');
    await this.talk('Mysterious VIP', 'm3', 'Not yet.', 'ghost_1'); this.p.say('Something about him feels wrong…', 3);
    await this.subtitle('Narrator', 'But in the shadows, someone was listening very closely.', 'n2_2'); dante.person.dispose && dante.person.dispose(); this.world.peds.splice(this.world.peds.indexOf(dante), 1);
    // hotel
    this.teleport(this.hotelPos.x, this.hotelPos.z + 16, Math.PI); this.setTarget({ x: this.hotelPos.x, z: this.hotelPos.z, r: 5 }, 'Go to your hotel room'); await this.interact(this.hotelPos.x, this.hotelPos.z, 'F  Enter the suite'); this.setTarget(null, '');
    await this.fade(1, 500); await this.fade(0, 500); await new Promise(res => this.panel('<h2>A NOTE UNDER THE DOOR</h2><p style="font:italic 22px Georgia;line-height:1.5">“Do you always leave through the east gate?<br>You never answered my letters.<br>— D.”</p><div class="menu"><div class="it" data-i="n">CONTINUE ▶</div></div>', () => { UI.closePanel(); this.close(); res(); })); Audio.story('ghost_2');
    await this.talk('Rex', 'm5', 'Sir, I think that\'s enough for tonight.', 'rex_1'); await this.talk('Nova', 'f1', 'Let\'s keep the tour going. I\'m not hiding.', 'nova2_2');
    await this.actEnd(2, 'Act 3: On the Road');
  };
  // ================================================================= ACT 3
  S.act3 = async function () {
    const p = this.p, W = this.world; this.hotelPos ||= nodePos(4, 2);
    // --- Las Vegas
    await this.fade(1, 600); await this.card('ACT 3 · LAS VEGAS', 'NEON AND NOISE'); Audio.story('n2_3');
    await this.stagePerformance(1, 'Las Vegas'); await this.fade(1, 500);
    const clues = [nodePos(3, 4), nodePos(5, 4), nodePos(4, 6)]; this.teleport(this.hotelPos.x, this.hotelPos.z + 16); await this.fade(0, 500);
    for (let i = 0; i < 3; i++) { this.setTarget({ x: clues[i].x, z: clues[i].z, r: 5 }, `Find the evidence  ${i}/3`); await this.interact(clues[i].x, clues[i].z, 'F  Pick up photo'); this.p.say(['A photo of your car outside the studio.', 'Photos of Zoe and Leo\'s school. Never! Hold on, kids are safe with Marcus.', 'A map with the east gate circled.'][i], 4); }
    this.setTarget(null, ''); const lena = await this.spawnThug('lena', p.x() + 4, p.z() + 2); lena.ai = null; lena.person.play('Idle');
    await this.talk('Agent Ortiz', 'f3', 'Ms. Vega, I\'m Agent Ortiz. Someone has been following your tour.', 'lena_0'); await this.talk('Nova', 'f1', 'Rex, did you see his face?', 'nova2_3'); await this.talk('Rex', 'm5', 'Pack your things. We\'re moving tonight.', 'rex_2'); lena.keep = false;
    // --- Chicago
    await this.fade(1, 600); await this.card('ACT 3 · CHICAGO', 'COLD RAIN, LONG ROAD'); Audio.story('n2_4');
    await this.stagePerformance(2, 'Chicago'); await this.fade(1, 500);
    const start = nodePos(1, 1), dest = nodePos(7, 6); this.teleport(start.x + 12, start.z + 14); await this.fade(0, 500);
    const car = await this.ensureCar('meridian', start.x + 8, start.z + 4, 0); await this.talk('Rex', 'm5', 'Get in. We drive to the safehouse. Stay sharp.', 'rex_3');
    this.setTarget(dest, 'Drive to the safehouse. They are right behind you.'); const chasers = []; for (const [dx, dz] of [[-40, -20], [-55, -30]]) { const v = await W.addVehicle('bulldog', start.x + dx, start.z + dz, 0, '#202228', 'pap'); v.cruise = 24; v.route = null; v.routeT = 0; W.attachDriver(v, 'thug_a'); chasers.push(v); }
    Audio.story('thug_0'); let fails = 0; this.chasers = chasers;
    await new Promise(res => { const cancel = setInterval(async () => { if (this.cancelled) return clearInterval(cancel); if (p.state !== 'car' || p.vehicle.exploded) { p.say('Car wrecked! Here is a spare.', 3); await this.ensureCar('vanta', p.x(), p.z(), p.yaw); fails++; } if (hyp(p.x() - dest.x, p.z() - dest.z) < 18) { clearInterval(cancel); res(); } }, 800); const upd = dt => { if (this.cancelled) return; for (const v of chasers) if (!v.exploded) this.gp.copDrive(v, p, dt); }; this.hookUpdate = upd; });
    this.hookUpdate = null; this.setTarget(null, ''); for (const v of chasers) { v.kind = 'gone'; W.scene.remove(v.root); const i = W.vehicles.indexOf(v); if (i >= 0) W.vehicles.splice(i, 1); } this.setFame(this.fame + 120);
    await this.talk('Rex', 'm5', 'That was no accident. Somebody cut those brakes.', 'rex_3');
    await this.actEnd(3, 'Act 4: The Kidnapping');
  };
  // ================================================================= ACT 4
  S.act4 = async function () {
    const p = this.p, W = this.world, A = W.arena; await this.fade(1, 600); await this.card('ACT 4 · NEW YORK', 'THE BIGGEST STAGE OF HER LIFE'); Audio.story('n2_5');
    this.buildStage('New York'); this.teleport(A.cx, A.cz + 2, -Math.PI / 2); this.p.person.play('Talk'); this.stageCam(true); await this.fade(0, 600); await this.subtitle('Announcer', 'New York! Are you ready?!', 'announcer_1');
    const r = await this.concert(3, { blackoutAt: 0.62 }); this.stageCam(true);
    // blackout
    await this.fade(1, 250); Audio.story('announcer_2'); await this.subtitle('Announcer', 'Something is wrong with the lights! Please remain calm!'); Audio.story('announcer_3'); this.subtitle('Announcer', 'Please proceed calmly to the exits!');
    W.scareNear && 0; await sleep(1600); Audio.story('ghost_3'); await this.subtitle('Dante', 'Good evening, Nova. You never answered my letters.'); Audio.story('ghost_4'); await this.subtitle('Dante', 'Don\'t hurt her. She is the whole show.');
    await this.subtitle('Narrator', 'The lights went out. And so did the world.', 'n2_6'); this.stageCam(false); this.p.person.play('Idle');
    // Rex's fight on the stage
    await this.switchTo('rex'); this.p.isNova = false; this.p.hp = 100; this.teleport(A.cx - 2, A.cz, Math.PI / 2); this.p.hasPistol = true; this.p.ammo = Math.max(this.p.ammo || 0, 60); await this.fade(0, 700);
    const thugs = []; for (const [x, z, id] of [[8, -6, 'thug_a'], [10, 5, 'thug_b'], [14, 0, 'thug_a']]) thugs.push(await this.spawnThug(id, A.cx + x, A.cz + z, { hp: 90, aggro: 70 }));
    Audio.story('rex_4'); this.subtitle('Rex', 'Nova! Nova! Stay with me!'); this.setTarget({ x: A.cx + 10, z: A.cz, r: 8 }, 'Fight through the gunmen  (J punch · K shoot)');
    await this.until(() => this.thugsLeft(thugs) === 0 || hyp(this.p.x() - A.cx, this.p.z() - A.cz) > 400); this.cleanup(thugs); this.setTarget(null, '');
    // the van
    this.buildHideout(); const van = await W.addVehicle('atlas', A.cx + 70, A.cz + 40, 0.3, '#14161a', 'pap'); van.cruise = 26; W.attachDriver(van, 'thug_b'); this.van = van; const rexCar = await this.ensureCar('vanta', A.cx + 40, A.cz + 20, 0.3);
    await this.subtitle('Rex', 'Hold on. I\'m coming. I\'m coming for you.', 'rex_5'); this.setTarget(HIDE, 'Chase the van! Don\'t lose it.'); let far = 0, arrived = false;
    this.hookUpdate = dt => { if (van.exploded) return; const d = hyp(van.car.x - p.x(), van.car.z - p.z()), gap = hyp(van.car.x - HIDE.x, van.car.z - HIDE.z); if (gap < 22) { arrived = true; van.car.input = { throttle: 0, brake: 1, steer: 0, hand: 1, nitro: 0 }; return; } this.driveTo(van, HIDE.x, HIDE.z, d > 120 ? 8 : d > 50 ? 20 : 26, dt); if (d > 260) far += dt; else far = 0; if (far > 10) { van.car.x = p.x() + 40; van.car.z = p.z() + 40; far = 0; } };
    let said = false; await new Promise(res => { const iv = setInterval(async () => { if (p.state !== 'car' || p.vehicle.exploded) { p.say('Take this one!', 2); await this.ensureCar('vanta', p.x(), p.z(), p.yaw); } if (!said && hyp(van.car.x - p.x(), van.car.z - p.z()) < 120) { said = true; Audio.story('rex_6'); this.subtitle('Rex', 'I see the van. Stay on him!'); } if (arrived && hyp(van.car.x - p.x(), van.car.z - p.z()) < 40) { clearInterval(iv); res(); } }, 600); });
    this.hookUpdate = null; this.setTarget(null, ''); p.locked = true; await this.subtitle('Rex', 'Nobody takes her. Nobody.', 'rex_7'); p.locked = false; this.setFame(this.fame + 150);
    await this.actEnd(4, 'Act 5: Escape');
  };
  // ================================================================= ACT 5
  S.act5 = async function () {
    const p = this.p, W = this.world, H = HIDE; await this.fade(1, 600); await this.card('ACT 5', 'ESCAPE'); this.buildHideout(); this.buildHarbor(); await this.switchTo('f1'); p.isNova = true; p.hp = 100;
    if (p.state === 'car') this.gp.teleportTo(p, { x: H.x, z: H.z }); this.teleport(this.hideInside.x, this.hideInside.z + 1.5, 0); await this.fade(0, 700);
    await this.subtitle('Dante', 'You are mine now. The fans never needed you. I did.', 'ghost_5'); await this.subtitle('Dante', 'You will sing for me. Only for me.', 'ghost_6');
    const guards = []; guards.push(await this.spawnThug('thug_a', H.x - 8, H.z - 12, { hp: 80, aggro: 11, patrol: [{ x: H.x - 8, z: H.z - 14 }, { x: H.x + 6, z: H.z - 14 }] })); guards.push(await this.spawnThug('thug_b', H.x + 6, H.z + 10, { hp: 80, aggro: 11, patrol: [{ x: H.x + 6, z: H.z + 10 }, { x: H.x - 10, z: H.z + 14 }] })); guards.push(await this.spawnThug('thug_a', H.x + 22, H.z + 2, { hp: 80, aggro: 11, patrol: [{ x: H.x + 22, z: H.z + 8 }, { x: H.x + 22, z: H.z - 8 }] }));
    Audio.story('nova2_4'); this.setTarget(this.hideCell, 'Pick the lock of your cell'); await this.interact(this.hideCell.x, this.hideCell.z, 'F  Pick the lock'); Audio.story('nova2_5'); await this.subtitle('Nova', 'The lock. I can pick it.'); this.p.say('Click…', 2);
    this.setTarget(this.hideCrate, 'Find a weapon in the crates'); await this.interact(this.hideCrate.x, this.hideCrate.z, 'F  Search the crate'); p.hasPistol = true; p.ammo = Math.max(p.ammo || 0, 40); Audio.story('nova2_6'); this.subtitle('Nova', 'A weapon. Finally.'); p.say('PISTOL + 40 ROUNDS  (T to draw, K to shoot)', 4);
    this.setTarget(this.hideExit, 'Sneak out. Reach the exit gate.'); await this.until(() => hyp(p.x() - this.hideExit.x, p.z() - this.hideExit.z) < 6); this.cleanup(guards); this.setTarget(null, '');
    // Dante flees by car
    const ghostCar = await W.addVehicle('phantom', H.x + 60, H.z - 10, Math.PI, '#101014', 'pap'); ghostCar.cruise = 26; W.attachDriver(ghostCar, 'ghost'); this.buildHarbor(); const mine = await this.ensureCar('vanta', H.x + 44, H.z + 6, Math.PI);
    await this.subtitle('Dante', 'No! This was supposed to be perfect!', 'ghost_7'); Audio.story('nova2_7'); this.subtitle('Nova', 'There. The pier. That\'s my way out.'); this.setTarget(HARBOR, 'Chase Dante to the harbour pier'); let arrived = false, far = 0;
    this.hookUpdate = dt => { if (ghostCar.exploded) return; const d = hyp(ghostCar.car.x - p.x(), ghostCar.car.z - p.z()), gap = hyp(ghostCar.car.x - this.pierEnd.x * 0.5 - HARBOR.x * 0.5, ghostCar.car.z - HARBOR.z); if (hyp(ghostCar.car.x - (HARBOR.x + 10), ghostCar.car.z - HARBOR.z) < 14) { arrived = true; ghostCar.car.input = { throttle: 0, brake: 1, steer: 0, hand: 1, nitro: 0 }; return; } this.driveTo(ghostCar, HARBOR.x + 10, HARBOR.z, d > 130 ? 10 : d > 60 ? 21 : 27, dt); if (d > 300) far += dt; else far = 0; if (far > 10) { ghostCar.car.x = p.x() - 40; ghostCar.car.z = p.z() - 40; far = 0; } };
    await new Promise(res => { const iv = setInterval(async () => { if (p.state !== 'car' || p.vehicle.exploded) { p.say('Spare car!', 2); await this.ensureCar('vanta', p.x(), p.z(), p.yaw); } if (arrived && hyp(ghostCar.car.x - p.x(), ghostCar.car.z - p.z()) < 40) { clearInterval(iv); res(); } }, 600); });
    this.hookUpdate = null; this.setTarget(null, ''); await this.fade(1, 400); if (p.state === 'car') this.gp.teleportTo(p, { x: HARBOR.x + 22, z: HARBOR.z }); this.teleport(HARBOR.x + 24, HARBOR.z + 3, Math.PI / 2); await this.fade(0, 500);
    // showdown
    ghostCar.kind = 'gone'; const boss = await this.spawnThug('ghost', HARBOR.x + 6, HARBOR.z, { hp: 260, aggro: 90, dmg: 9, speed: 3.6 }); const goons = [await this.spawnThug('thug_a', HARBOR.x + 12, HARBOR.z - 5, { hp: 90, aggro: 90 }), await this.spawnThug('thug_b', HARBOR.x + 12, HARBOR.z + 6, { hp: 90, aggro: 90 })];
    Audio.story('nova2_8'); this.subtitle('Nova', 'It\'s over, Ghost.'); this.setTarget({ x: boss.x, z: boss.z, r: 6 }, 'Defeat Dante and his men  (K shoot · J punch)'); await this.until(() => { if (boss.hp <= 70 && !boss.surrender && !boss.dead) { boss.surrender = true; boss.person.play('Hit', { loop: false }); } return boss.surrender || boss.dead; }); this.cleanup(goons); this.setTarget(null, '');
    p.locked = true; boss.surrender = true; await this.subtitle('Dante', 'No! This was supposed to be perfect!', 'ghost_7'); p.locked = false;
    const end = await this.choose('Nova', 'f1', ['Call Agent Ortiz. Let the law take him.', 'Walk away. Let them see the truth.']);
    if (end === 0) { Audio.story('lena_1'); await this.talk('Agent Ortiz', 'f3', 'We found the van. Move in, now!', 'lena_1'); await this.talk('Agent Ortiz', 'f3', 'Dante Kane. We\'ve been after him for two years.', 'lena_2'); await this.talk('Agent Ortiz', 'f3', 'It\'s over, Kane. Hands where I can see them.', 'lena_3'); Audio.story('nova2_9'); }
    else { Audio.story('nova2_10'); await this.subtitle('Nova', 'Let them see the truth.'); await this.subtitle('Narrator', 'By dawn the whole world knew. The evidence did the talking.'); }
    this.cleanup([boss]); await this.fade(1, 800);
    // epilogue
    const M = this.M; this.teleport(M.start.x, M.start.z, Math.PI); await this.switchTo('f1'); await this.fade(0, 900);
    await this.talk('Marcus', 'm1', 'You\'re safe. You\'re really safe.', 'marcus2_2'); await this.talk('Marcus', 'm1', 'Welcome home, superstar.', 'marcus2_3'); Audio.story('nova2_11'); await this.subtitle('Nova', 'I\'m home.');
    this.setFame(this.fame + 300 + (end === 0 ? 100 : 0)); const cash = Math.round(p.cash || 0);
    await new Promise(res => this.panel(`<h2>THE END</h2><p style="opacity:.85">${end === 0 ? 'Justice served. Nova headlines a sold-out world tour, with Rex in the front row.' : 'Nova retires the spotlight and keeps the music — for family, and for the fans who stayed.'}</p><div class="bal"><div>FAME <b>${this.fame}</b></div><div>CASH <b>$${cash}</b></div></div><p style="opacity:.6">NEON OVERDRIVE · SUPERSTAR LIFE</p><div class="menu"><div class="it" data-i="free">KEEP EXPLORING</div><div class="it" data-i="title">QUIT TO TITLE</div></div>`, i => { UI.closePanel(); this.close(); if (i === 'title') this.onQuit && this.onQuit(); res(); }));
  };
  const upd = S.update; S.update = function (dt) { upd.call(this, dt); this.hookUpdate && this.hookUpdate(dt); };
}
