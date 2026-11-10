// Neon Overdrive - game shell: renderer, split-screen, loop, HUD.
import { spawnPerson } from './people.js';
import { createVehicle } from './vehicle.js';
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { nodePos } from './city.js';
import { initInput, readDevice, readFootball, deviceList, endFrame } from './input.js';
import * as UI from './ui.js';
import { Audio } from './audio.js';
import { Gameplay } from './gameplay.js';
import { Race } from './race.js';
import { Story } from './story.js';
import { Jobs } from './jobs.js';
import { Interiors } from './interiors.js';
import { Sea } from './sea.js';
import { Airport } from './airport.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
import { lowify } from './lowgpu.js';
const LOW_GPU = (() => { try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); const n = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; window.__gpuName = n; return /Intel|UHD|HD Graphics|Iris|SwiftShader|Mali|Adreno/i.test(n); } catch (x) { return false; } })();
window.__lowGpu = LOW_GPU; const capRatio = r => LOW_GPU ? Math.min(r, 1100 / Math.max(1, window.innerWidth)) : r;
renderer.setPixelRatio(capRatio(Math.min(window.devicePixelRatio, LOW_GPU ? 0.8 : 1.5))); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.autoClear = false;
let scene = new THREE.Scene();
initInput();
let world = null, gp = null, story = null, players = [], hudRoot = document.getElementById('hud'), running = false, last = performance.now();
const $ = (el, sel) => el.querySelector(sel);

function layout(n) {
  if (n === 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (n === 2) return [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }];
  return [{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }].slice(0, n);
}
const START_CARS = ['kestrel', 'vanta', 'bulldog', 'orion'];
const PERSONS = ['m1', 'f1', 'm3', 'f3'];
export async function startGame(opts = {}) {
  const n = opts.players || 1; hudRoot.innerHTML = ''; showLoad('Building the city');
  if (world) { running = false; scene = new THREE.Scene(); world = null; players = []; story = null; }
  renderer.setPixelRatio(capRatio(Math.min(window.devicePixelRatio, { low: 0.75, medium: 1, high: 1.5 }[UI.settings.quality] || 1.5)));
  if (LOW_GPU && !window.__lowApplied) { window.__lowApplied = true; UI.settings.quality = 'low'; }
  world = new World(scene, renderer, { story: !!opts.story, time: opts.time || params.get('time') || 'night', weather: opts.weather || params.get('weather') || 'clear', traffic: opts.traffic ?? (LOW_GPU ? 11 : 20), peds: opts.peds ?? (LOW_GPU ? 7 : 16) }); world.lowGpu = LOW_GPU;
  const devs = opts.devices || (n === 1 ? [{ type: 'kb', layout: 'merged' }] : n === 2 ? [{ type: 'kb', layout: 'a' }, { type: 'kb', layout: 'b' }] : [{ type: 'kb', layout: 'a' }, { type: 'kb', layout: 'b' }, ...deviceList().filter(d => d.type === 'pad')]);
  const lay = layout(n), base = nodePos(4, 4);
  players = [];
  for (let i = 0; i < n; i++) {
    const p = new Player(world, i, devs[i] || devs[0], (opts.persons || PERSONS)[i]); p.viewport = lay[i]; p.cash = 500; p.homeCar = (opts.cars || START_CARS)[i];
    const cx = base.x - 8.1, cz = base.z + 30 + i * 12;
    if (opts.story) await p.init(world.mansion.start.x, world.mansion.start.z, Math.PI); else { const car = await world.addVehicle((opts.cars || START_CARS)[i], cx, cz, 0, null, 'parked'); car.owner = null;
    await p.init(cx + 3.3, cz + 0.6, -Math.PI / 2); } world.players.push(p); players.push(p);
    const el = document.createElement('div'); el.className = 'ph'; el.innerHTML = `<div class="prompt"></div><div class="speed"><div class="gear"></div><b>0</b><small>km/h</small><div class="bar"><i></i></div></div><div class="top"><span class="cash"></span><span class="nm"></span></div><div class="stars"></div><div class="vit"><div class="hpbar"><i></i></div><div class="armbar"><i></i></div><div class="ammo"></div></div><canvas class="mm" width="170" height="170"></canvas><div class="msg"></div><div class="race"></div><div class="sbx"></div><div class="keys"></div>`;
    hudRoot.appendChild(el); p.hud = el; layoutHud(p);
  }
  gp = new Gameplay(world, players); world.gp = gp; world.jobs = new Jobs(world, players); if (!opts.story) world.interiors = new Interiors(world, gp); world.sea = new Sea(world, gp); world.airport = new Airport(world, gp); gp.onPanelOpen = () => { running = false; }; gp.onPanelClose = () => { running = true; last = performance.now(); };
  if (opts.story) { world.addVehicle('hornet', world.mansion.cx + 50, world.mansion.cz + 60, 0, null, 'parked').then(v => { v.keep = true; }); story = new Story(world, players, gp); story.onPanelOpen = () => { running = false; }; story.onPanelClose = () => { running = true; last = performance.now(); }; story.onQuit = () => { running = false; world = null; players = []; story = null; hudRoot.innerHTML = ''; scene = new THREE.Scene(); UI.title(); }; window.__story = story; setTimeout(() => story.run(+(params.get('act') || 1)), 600); }
  if (opts.modes && world.arena) { players.forEach((p, i) => { if (opts.modes[i] === 'football') { p.pos.set(world.arena.gatePos.x - 6, 0.16, world.arena.gatePos.z + i * 2); world.arena.joinMatch(p, i % 2); } }); }
  const racers = opts.mode !== 'race' && opts.modes ? players.filter((p, i) => opts.modes[i] === 'race') : [];
  if (racers.length) { racers.forEach(p => { p.raceCar = (opts.cars || START_CARS)[p.index]; }); const r = new Race(world, racers, gp); r.mixed = true; world.race = r; await r.start(); }
  if (!opts.story) {   // street-race hub: any free-roam player can join a race while others keep playing
    const rb = nodePos(4, 4); gp.kiosks.push({ x: rb.x + 6, z: rb.z + 22, shop: false, custom: { prompt: 'F  Join a street race', action: async p => { if (world.race && world.race.state !== 'closed' && world.race.state !== 'done') { p.say('A race is already running', 2.5); return; } if (p.state !== 'foot') return; p.raceCar = p.homeCar || 'kestrel'; const r = new Race(world, [p], gp); r.mixed = true; world.race = r; await r.start(); } } }); world.pois.push({ x: rb.x + 6, z: rb.z + 22, color: '#ffd23a', r: 6 });
  }
  if (opts.mode === 'race') {
    players.forEach((p, i) => { p.raceCar = (opts.cars || START_CARS)[i]; });
    const r = new Race(world, players, gp); world.race = r; r.onOpen = () => { running = false; }; r.onClose = () => { running = true; last = performance.now(); };
    r.onQuit = () => { running = false; world = null; players = []; hudRoot.innerHTML = ''; scene = new THREE.Scene(); UI.title(); }; await r.start();
  }
  if (LOW_GPU) {
    try {
      const ids = [...new Set([...(opts.cars || START_CARS), 'meridian', 'orion', 'atlas', 'taxi', 'cruiser', 'kestrel', 'fox', 'bulldog', 'police'])], tmp = [], cam = new THREE.PerspectiveCamera(60, 1.6, 0.1, 200), o = players[0].pos;
      ids.forEach((id, k) => { tmp.push(createVehicle(scene, id, o.x - 14 + k * 3.2, o.z + 12, 0, null).then(v => v.root)); });
      const roots = await Promise.all(tmp), pp = await Promise.all(['m1', 'f1', 'm2', 'f2'].map(id => spawnPerson(id)));
      pp.forEach((q, k) => { scene.add(q.root); q.root.position.set(o.x - 6 + k * 2.5, 0, o.z + 7); q.update(0.01); });
      cam.position.set(o.x, 3, o.z); cam.lookAt(o.x, 1, o.z + 12); renderer.setScissorTest(false); renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.render(scene, cam); renderer.render(scene, cam);
      roots.forEach(r => scene.remove(r)); pp.forEach(q => scene.remove(q.root));
    } catch (e) { console.warn('model prewarm', e); }
  }
  try { await Promise.race([renderer.compileAsync(scene, players[0].camera), new Promise(r => setTimeout(r, 25000))]); } catch (e) { console.warn('prewarm', e); }
  lowify(scene); if (!window.__lowTimer) window.__lowTimer = setInterval(() => lowify(scene), 1500);
  hideLoad(); window.__g = { gp, world, players, scene, renderer, THREE, step(dt, inputs) { for (const p of players) p.update(dt, inputs[p.index] || { mx: 0, my: 0, throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0, run: false, orbit: 0, interact: false, cam: false, punch: false, shoot: false, horn: false, reset: false }); world.update(dt); } }; running = true; window.__ready = true; resize();
}
function layoutHud(p) { const v = p.viewport; Object.assign(p.hud.style, { left: v.x * 100 + '%', top: (1 - v.y - v.h) * 100 + '%', width: v.w * 100 + '%', height: v.h * 100 + '%' }); }
function resize() { renderer.setSize(window.innerWidth, window.innerHeight, false); }
window.addEventListener('resize', resize); resize();

let frameN = 0, lastInputs = [];
// adaptive resolution: keep the game fast (and therefore not in slow motion) on weaker graphics cards
let ft = 16, ratio = null, adaptT = 0;
function adapt(raw) {
  if (LOW_GPU || window.__potato) return;   // weak GPUs keep one fixed resolution: resizing the canvas is itself a multi-second stall there
  ft += (Math.min(raw, 0.25) * 1000 - ft) * 0.05; adaptT += raw; if (adaptT < 1.5 || !running) return; adaptT = 0;
  const target = Math.min(window.devicePixelRatio, { low: 0.75, medium: 1, high: 1.5 }[UI.settings.quality] || 1.5); if (ratio === null) ratio = target; const floor = LOW_GPU ? 0.4 : 0.5;
  if (ft > 30 && ratio > floor) ratio = Math.max(floor, ratio - 0.15); else if (ft < 19 && ratio < target) ratio = Math.min(target, ratio + 0.1); else return;
  renderer.setPixelRatio(capRatio(ratio)); resize();
}
const errCount = {};
function logErr(name, msg, stack) { try { const L = JSON.parse(localStorage.getItem('neon_errors') || '[]'); L.push({ t: new Date().toISOString(), name, msg: String(msg).slice(0, 300), stack: String(stack || '').split('\n').slice(0, 4).join(' | ') + ' sys=' + window.__sys }); localStorage.setItem('neon_errors', JSON.stringify(L.slice(-40))); } catch (x) {} }
window.addEventListener('error', e => logErr('uncaught', e.message, e.error && e.error.stack));
window.addEventListener('unhandledrejection', e => logErr('promise', e.reason && e.reason.message || e.reason, e.reason && e.reason.stack));
let frameOkAt = performance.now(), lastFrameSeen = 0, deadT = 0, rafId = 0;
// the frame loop must never stay dead: if no frame completed for 3 s while the window is visible, restart it and record why
setInterval(() => {
  if (document.hidden || !world) { deadT = 0; return; }
  if (frameN === lastFrameSeen) { if (++deadT >= 8) { logErr('loop', 'frame loop was dead for 8 s; restarted', 'running=' + running + ' ui=' + UI.visible() + ' sys=' + window.__sys); deadT = 0; last = performance.now(); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); } } else deadT = 0;
  lastFrameSeen = frameN;
  if (running && !UI.visible() && performance.now() - frameOkAt > 4000 && frameN > 10) { logErr('stall', 'no frame finished rendering for ' + Math.round(performance.now() - frameOkAt) + ' ms', 'running=' + running); frameOkAt = performance.now(); }
}, 1000);
function safe(name, fn) {
  window.__sys = name; try { fn(); } catch (e) {
    errCount[name] = (errCount[name] || 0) + 1; if (errCount[name] <= 3) console.error('[frame:' + name + ']', e); if (errCount[name] === 1 && players[0]) players[0].say('Recovered from a ' + name + ' error · press F9 to see details', 4);
    try { const L = JSON.parse(localStorage.getItem('neon_errors') || '[]'); L.push({ t: new Date().toISOString(), name, msg: String(e && e.message), stack: String(e && e.stack).split('\n').slice(0, 4).join(' | ') }); localStorage.setItem('neon_errors', JSON.stringify(L.slice(-40))); } catch (x) {}
  }
}
let stuckT = 0, ctxLostAt = 0, bigStalls = [];
// performance mode: strips the scene down to what a very weak GPU can draw. Automatic after repeated stalls; F10 toggles it by hand.
function potato(on) {
  if (!!window.__potato === on) return; window.__potato = on; if (!world) return; world.potato = on;
  scene.traverse(o => { if (o.isPointLight || o.isSpotLight) { if (on) { o.userData.pv = o.visible; o.visible = false; } else o.visible = o.userData.pv !== false; } });
  renderer.setPixelRatio(capRatio(on ? 0.5 : 0.75)); resize();
  world.cfg.traffic = on ? 4 : (LOW_GPU ? 11 : 20); world.cfg.peds = on ? 2 : (LOW_GPU ? 7 : 16);
  for (const k in world.fx.layers) world.fx.layers[k].pts.visible = !on;
  if (world.sea) world.sea.group.visible = !on;
  logErr('mode', on ? 'performance mode ON' : 'performance mode off', 'auto after stalls or F10');
  if (players[0]) players[0].say(on ? 'Performance mode ON  (F10 turns it off)' : 'Performance mode off', 5);
}
window.addEventListener('keydown', e => { if (e.code === 'F10') potato(!window.__potato); });
{
  const cv = renderer.domElement, banner = document.createElement('div'); banner.style.cssText = 'position:fixed;left:50%;top:40%;transform:translateX(-50%);z-index:98;background:#000c;color:#fff;font:700 22px Arial;padding:18px 28px;border-radius:10px;display:none;text-align:center'; banner.textContent = 'Graphics driver reset. Recovering…'; document.body.appendChild(banner);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); ctxLostAt = performance.now(); banner.style.display = 'block'; console.warn('[gpu] WebGL context lost'); try { const L = JSON.parse(localStorage.getItem('neon_errors') || '[]'); L.push({ t: new Date().toISOString(), name: 'gpu', msg: 'webglcontextlost', stack: 'sys=' + window.__sys }); localStorage.setItem('neon_errors', JSON.stringify(L.slice(-40))); } catch (x) {} }, false);
  cv.addEventListener('webglcontextrestored', () => { ctxLostAt = 0; banner.style.display = 'none'; UI.settings.quality = 'low'; ratio = 0.6; renderer.setPixelRatio(0.6); resize(); console.warn('[gpu] context restored; quality lowered'); }, false);
  setInterval(() => { if (ctxLostAt && performance.now() - ctxLostAt > 6000) location.reload(); }, 1000);   // never stay frozen: restart if the driver does not give the context back
  // heartbeat for a tiny watchdog worker: if the main thread ever hangs, the worker records where
  try {
    const w = new Worker(URL.createObjectURL(new Blob([`let last=Date.now(),info=null,logged=0;onmessage=e=>{last=Date.now();info=e.data;logged=0};setInterval(()=>{if(info&&!info.hidden&&Date.now()-last>5000&&!logged){logged=1;const r=indexedDB.open('neon_diag',1);r.onupgradeneeded=()=>r.result.createObjectStore('hang',{autoIncrement:true});r.onsuccess=()=>{r.result.transaction('hang','readwrite').objectStore('hang').add({t:new Date().toISOString(),stalledMs:Date.now()-last,info})}}},1000)`], { type: 'text/javascript' })));
    setInterval(() => { const p0 = players[0], c = p0 && p0.vehicle && p0.state === 'car' ? p0.vehicle.car : null; w.postMessage({ hidden: document.hidden, sys: window.__sys, state: p0 && p0.state, veh: p0 && p0.vehicle && p0.vehicle.id, kmh: c ? Math.round(c.kmh) : 0, x: p0 ? Math.round(p0.x()) : 0, z: p0 ? Math.round(p0.z()) : 0, ratio, frame: frameN, running, ui: UI.visible() }); }, 500);
    const q = indexedDB.open('neon_diag', 1); q.onupgradeneeded = () => q.result.createObjectStore('hang', { autoIncrement: true }); q.onsuccess = () => { try { const st = q.result.transaction('hang', 'readwrite').objectStore('hang'), all = st.getAll(); all.onsuccess = () => { if (all.result.length) { localStorage.setItem('neon_hangs', JSON.stringify(all.result.slice(-5))); st.clear(); } }; } catch (x) {} };
  } catch (x) {}
}
function frame(now) {
  frameN++; if ((!world || !running) && Audio.ready) { const m = UI.settings.musicMode || 'always'; Audio.radio(m !== 'off'); Audio.setMusicLevel(UI.visible() ? 0.85 : 0.5); }
  rafId = requestAnimationFrame(frame); const rawDt = (now - last) / 1000, dt = Math.min(0.1, rawDt); last = now; if (rawDt > 1.5 && running && world) logErr('stall', 'a frame took ' + Math.round(rawDt * 1000) + ' ms', 'last sys=' + window.__sys);
  if (rawDt > 2 && running && world) { bigStalls.push(now); bigStalls = bigStalls.filter(t => now - t < 90000); if (bigStalls.length >= 3 && !window.__potato) potato(true); } safe('adapt', () => adapt(rawDt));
  // watchdog: if the game is paused for a menu that is no longer on screen, resume instead of staying frozen
  if (window.__ready && !running && world && !UI.visible() && !window.__pause) { stuckT += rawDt; if (stuckT > 1.2) { running = true; stuckT = 0; console.warn('[watchdog] resumed a stuck pause'); } } else stuckT = 0;
  if (!running || !world || window.__pause) return;
  const NEUTRAL = { mx: 0, my: 0, throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0, run: false, orbit: 0, interact: false, cam: false, punch: false, shoot: false, horn: false, reset: false, weapon: false, phone: false, radio: false };
  let inputs = []; safe('input', () => { inputs = players.map(p => p.locked ? NEUTRAL : readDevice(p.device)); lastInputs = inputs; for (const p of players) if (p.state === 'football') p.fbInput = readFootball(p.device); });
  players.forEach((p, i) => safe('player', () => p.update(dt, inputs[i] || NEUTRAL)));
  safe('world', () => world.update(dt)); safe('gameplay', () => gp && gp.update(dt, inputs)); safe('race', () => world.race && world.race.update(dt)); safe('jobs', () => world.jobs && world.jobs.update(dt)); safe('interiors', () => world.interiors && world.interiors.update(dt)); safe('sea', () => world.sea && world.sea.update(dt)); safe('airport', () => world.airport && world.airport.update(dt)); safe('story', () => story && story.update(dt));
  safe('guard', () => { for (const p of players) { const q = p.pos; if (!isFinite(q.x + q.y + q.z)) { q.set(p.lastGood ? p.lastGood.x : 0, 0.1, p.lastGood ? p.lastGood.z : 0); p.vel = 0; } else p.lastGood = { x: q.x, z: q.z }; const c = p.cam.pos; if (!isFinite(c.x + c.y + c.z)) { c.set(q.x, 3, q.z - 6); p.cam.snap = true; } } });
  safe('audio', () => doAudio(dt));
  // render each viewport
  renderer.setScissorTest(true); const W = window.innerWidth, H = window.innerHeight; renderer.toneMappingExposure = world.city.exposure || 1;
  for (const p of players) {
    const v = p.viewport; renderer.setViewport(v.x * W, v.y * H, v.w * W, v.h * H); renderer.setScissor(v.x * W, v.y * H, v.w * W, v.h * H);
    p.camera.aspect = (v.w * W) / (v.h * H); p.camera.updateProjectionMatrix();
    safe('render', () => { renderer.clear(); renderer.render(scene, p.camera); });
    safe('hud', () => updateHud(p));
  }
  endFrame(); frameOkAt = performance.now();
}
function updateHud(p) {
  const h = p.hud, c = p.vehicle && p.state === 'car' ? p.vehicle.car : null;
  $(h, '.speed').style.display = c ? 'block' : 'none'; if (c) { $(h, '.speed b').textContent = Math.round(c.kmh); $(h, '.gear').textContent = c.air ? 'ALT ' + Math.round(c.y) + 'm' : c.boat ? '⚓' : c.gear === 0 ? 'N' : c.gear === -1 ? 'R' : c.gear; $(h, '.bar i').style.width = Math.round(c.nitro * 100) + '%'; }
  const pr = $(h, '.prompt'); pr.textContent = p.prompt || ''; pr.style.opacity = p.prompt ? 1 : 0;
  $(h, '.cash').textContent = '$' + p.cash.toLocaleString(); $(h, '.nm').textContent = p.person ? p.person.info.name : '';
  const m = $(h, '.msg'); m.textContent = p.msg ? p.msg.text : ''; m.style.opacity = p.msg ? 1 : 0;
  $(h, '.sbx').innerHTML = p.sbHtml || ''; $(h, '.sbx').style.display = p.sbHtml ? 'block' : 'none';
  const kh = $(h, '.keys'); const pad = p.device && p.device.type === 'pad'; kh.textContent = p.state === 'foot' && !p.cut ? (pad ? 'Left stick move · RB run · Y jump · A get in car · X punch · LB weapon · Select phone' : 'WASD move · SHIFT run (hold = sprint) · V jump · F get in a car / use · J punch · T pistol · M phone · Esc pause') : p.state === 'car' && p.vehicle.craft === 'plane' ? 'W/S throttle · A/D turn · SPACE climb · SHIFT dive · take off at ~110 km/h · C camera · F get out (on ground)' : p.state === 'car' && p.vehicle.craft === 'heli' ? 'W/S forward & back · A/D turn · SPACE up · SHIFT down · C camera · F get out (on ground)' : p.state === 'car' && p.vehicle.craft === 'boat' ? 'W/S throttle & reverse · A/D steer · SHIFT boost · C camera · F get out (at the pier)' : p.state === 'car' ? (pad ? 'RT gas · LT brake · B handbrake · RB nitro · Y camera · A get out' : 'W/S gas & brake · A/D steer · SPACE handbrake · SHIFT nitro · C camera · X radio · F get out') : ''; kh.style.opacity = kh.textContent && (p.hudKeysT = (p.hudKeysT || 0) + 1) < 3600 ? 0.75 : 0;
  const rc = $(h, '.race'); rc.textContent = p.raceText || p.jobText || ''; rc.style.opacity = (p.raceText || p.jobText) ? 1 : 0;
  const st = $(h, '.stars'), n = Math.ceil(p.heat - 0.001); st.innerHTML = p.heat > 0 ? '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span>' : ''; st.className = 'stars' + (p.bustT > 0 ? ' bust' : '');
  $(h, '.hpbar i').style.width = Math.max(0, p.hp) + '%'; $(h, '.armbar i').style.width = (p.armor || 0) + '%'; $(h, '.ammo').textContent = p.armed ? `PISTOL  ${p.ammo}` : '';
  const mm = $(h, '.mm'); if (gp && frameN % 2 === 0) gp.drawMinimap(p, mm.getContext('2d'), 170);
}
const showLoad = t => { document.getElementById('loadtxt').textContent = t; document.getElementById('load').className = ''; }, hideLoad = () => { document.getElementById('load').className = 'hidden'; };
UI.setHooks({ start: o => startGame(o), resume: () => { running = true; last = performance.now(); }, toTitle: () => { running = false; world = null; players = []; hudRoot.innerHTML = ''; scene = new THREE.Scene(); UI.title(); }, quit: () => window.close(), settingsChanged: () => {} });
window.addEventListener('keydown', e => { if (e.code === 'Escape' && running && !UI.visible()) { running = false; UI.pause(); } });
setInterval(() => { UI.pollPads(); }, 60);
requestAnimationFrame(frame);
if (params.get('autostart') === null) UI.title();
if (params.get('autostart') !== null) startGame({ story: params.get('story') !== null, players: +(params.get('players') || 1), cars: params.get('car') ? [params.get('car')] : undefined, mode: params.get('mode'), modes: params.get('modes') ? params.get('modes').split(',') : undefined });
window.startGame = startGame; window.__audio = Audio;

const prevState = new Map(), stepT = new Map(); let sirenCount = 0;
window.addEventListener('keydown', () => { Audio.init(); }, { once: false }); window.addEventListener('pointerdown', () => { Audio.init(); });
setTimeout(() => { try { Audio.init(); } catch (e) {} }, 300);
Audio.setOnTrack(t => { for (const q of players) if (q.state === 'car' || q.state === 'foot' && world && world.club && world.club.distance(q.x(), q.z()) < 60) q.say('♪ ' + t.title + ' — ' + t.artist, 4); });
function doAudio(dt) {
  if (!Audio.ready) return; let anyCar = false;
  for (const p of players) {
    const key = 'p' + p.index, share = 1 / players.length, inCar = p.state === 'car';
    if (inCar && p.vehicle.craft) { anyCar = true; Audio.engineStop(key); Audio.bikeLoop(key, false, 0); Audio.craftLoop(key, p.vehicle.craft, true, p.vehicle.car, share); Audio.horn(key, false); }
    else if (Audio.craftLoop(key, null, false), inCar && p.vehicle.id === 'cruiser') { anyCar = true; Audio.engineStop(key); Audio.bikeLoop(key, true, p.vehicle.car.speed); Audio.horn(key, false); }
    else if (inCar) { Audio.bikeLoop(key, false, 0); anyCar = true; const inp = p.vehicle.car.input; Audio.engineUpdate(key, p.vehicle.car, inp.throttle || 0, share); Audio.horn(key, !!p.hornOn, p.vehicle.id === 'atlas' ? 'truck' : 'car'); } else { Audio.engineStop(key); Audio.horn(key, false); Audio.bikeLoop(key, false, 0); }
    const was = prevState.get(p.index); if (was !== p.state) { if (p.state === 'enter') Audio.sfx.doorOpen(); if (was === 'enter' && p.state === 'car') Audio.sfx.doorClose(); if (p.state === 'exit') Audio.sfx.doorOpen(); if (was === 'exit' && p.state === 'foot') Audio.sfx.doorClose(); prevState.set(p.index, p.state); }
    if (p.state === 'foot' && p.vel > 0.6) { const t = (stepT.get(p.index) || 0) - dt * p.vel; if (t <= 0) { Audio.sfx.step(p.vel > 3.2); stepT.set(p.index, 1.15 * 0.75 / (p.vel > 3.2 ? 1.7 : 1)); } else stepT.set(p.index, t); }
  }
  for (const e of world.events) if (e.type === 'crash') Audio.sfx.crash(e.hit); world.events.length = 0;
  let clubVol = 0; if (world.club) for (const p of players) clubVol = Math.max(clubVol, Math.max(0, 1 - world.club.distance(p.x(), p.z()) / 100));
  Audio.partyLevel(Math.max(0, clubVol - 0.35) * 1.5);
  const mode = UI.settings.musicMode || 'always', carMusic = mode !== 'off' && anyCar, foot = mode === 'always', cut = players.some(p => p.cut);
  Audio.radio(mode !== 'off' || clubVol > 0.04); Audio.setMusicLevel(cut ? 0.3 : carMusic ? Math.max(1, clubVol) : foot ? Math.max(0.42, Math.min(1, clubVol * 1.4)) : Math.min(1, clubVol * 1.4));
  players.forEach((p, i) => { if (p.state === 'car' && lastInputs[i] && lastInputs[i].radio) Audio.radioNext(); });
}

// F9: show the last logged game errors (for bug reports)
window.addEventListener('keydown', e => { if (e.code !== 'F9') return; let d = document.getElementById('errlog'); if (d) { d.remove(); return; } d = document.createElement('pre'); d.id = 'errlog'; d.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;max-height:80vh;overflow:auto;z-index:99;background:#000d;color:#9fe;padding:12px;font:12px monospace;white-space:pre-wrap;user-select:text'; let t = 'NEON OVERDRIVE error log (F9 closes)\n\n'; try { const hg = JSON.parse(localStorage.getItem('neon_hangs') || '[]'); if (hg.length) t += 'PREVIOUS HANGS:\n' + hg.map(h => h.t + ' stalled ' + h.stalledMs + ' ms: ' + JSON.stringify(h.info)).join('\n') + '\n\n'; t += JSON.parse(localStorage.getItem('neon_errors') || '[]').map(x => x.t + '  [' + x.name + '] ' + x.msg + '\n   ' + x.stack).join('\n\n') || 'No errors logged.'; } catch (x) { t += 'unreadable'; } d.textContent = t; document.body.appendChild(d); });
