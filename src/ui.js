// Menus: title, lobby, settings, controls, credits, pause. Keyboard / mouse / gamepad.
import { CAST } from './people.js';
import { CARS } from './car.js';
export const SETTINGS_KEY = 'neon_settings_v1';
export const settings = Object.assign({ time: 'night', weather: 'clear', traffic: 20, peds: 16, quality: 'high', music: 0.6, sfx: 0.8, voice: 0.9, radio: true, musicMode: 'always' }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } })());
export const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} };
const root = document.getElementById('ui'); let cur = null, sel = 0, items = [], padPrev = {}, hooks = {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function setHooks(h) { hooks = h; }
export function hide() { root.className = 'hidden'; root.innerHTML = ''; cur = null; }
export const visible = () => !!cur;
function show(name, html, opts = {}) { cur = { name, ...opts }; root.className = ''; root.innerHTML = html; items = [...root.querySelectorAll('[data-i]')]; sel = Math.min(sel, items.length - 1); if (opts.keepSel === false) sel = 0; paint(); items.forEach((el, k) => { el.onmouseenter = () => { sel = k; paint(); }; el.onclick = e => { sel = k; paint(); activate(0); e.stopPropagation(); }; }); }
function paint() { items.forEach((el, k) => el.classList.toggle('sel', k === sel)); }
function activate(dx) { const el = items[sel]; if (!el) return; const f = cur && cur.act; f && f(el.dataset.i, dx, el); }
function nav(key) {
  if (!cur) return false;
  if (key === 'up') { sel = (sel + items.length - 1) % items.length; paint(); } else if (key === 'down') { sel = (sel + 1) % items.length; paint(); } else if (key === 'left') activate(-1); else if (key === 'right') activate(1); else if (key === 'ok') activate(0); else if (key === 'back') { cur.back && cur.back(); }
  return true;
}
window.addEventListener('keydown', e => { if (!cur) return; const m = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'ok', Space: 'ok', Escape: 'back', Backspace: 'back' }[e.code]; if (m) { e.preventDefault(); e.stopImmediatePropagation(); nav(m); } }, true);
export function pollPads() { // call every frame while a menu is up
  if (!cur) return; const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(g => g && g.connected) : [];
  for (const g of pads) { const p = padPrev[g.index] ||= {}, ax = g.axes[0] || 0, ay = g.axes[1] || 0, now = { up: g.buttons[12]?.pressed || ay < -0.6, down: g.buttons[13]?.pressed || ay > 0.6, left: g.buttons[14]?.pressed || ax < -0.6, right: g.buttons[15]?.pressed || ax > 0.6, ok: g.buttons[0]?.pressed || g.buttons[9]?.pressed, back: g.buttons[1]?.pressed };
    for (const k in now) if (now[k] && !p[k]) nav(k); Object.assign(p, now); }
}
const cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
const logo = `<div class="logo"><span>NEON</span><b>OVERDRIVE</b></div>`;

export function title() {
  show('title', `<div class="screen">${logo}<div class="tag">drive · fight · rob · live</div><div class="menu">
    <div class="it" data-i="story">SUPERSTAR STORY<small>Act 1 · a celebrity's life, the mansion, the tour</small></div>
    <div class="it" data-i="roam">FREE ROAM<small>explore the city · 1-4 players</small></div>
    <div class="it" data-i="race">STREET RACE<small>checkpoint races against rivals</small></div>
    <div class="it" data-i="settings">SETTINGS</div><div class="it" data-i="controls">CONTROLS</div><div class="it" data-i="credits">CREDITS</div><div class="it" data-i="quit">QUIT</div></div>
    <div class="hint">↑↓ choose · Enter select · Esc back</div></div>`, { act: i => { if (i === 'story') { hide(); hooks.start && hooks.start({ story: true, players: 1, persons: ['f1'], cars: ['kestrel'], ...settings }); } else if (i === 'roam') lobby('roam'); else if (i === 'race') lobby('race'); else if (i === 'settings') settingsScreen(title); else if (i === 'controls') controls(title); else if (i === 'credits') credits(); else if (i === 'quit') hooks.quit && hooks.quit(); }, back: () => {} });
}
const lob = { n: 1, mode: 'roam', persons: ['m1', 'f1', 'm3', 'f3'], cars: ['kestrel', 'vanta', 'bulldog', 'orion'], modes: ['roam', 'roam', 'roam', 'roam'] };
export function lobby(mode) {
  lob.mode = mode || lob.mode; const rows = [];
  for (let k = 0; k < lob.n; k++) rows.push(`<div class="slot"><div class="pn">P${k + 1}</div>
    <div class="pick" data-i="p${k}"><img src="../assets/ui/person_${lob.persons[k]}.jpg"><div>◀ ${esc(CAST.find(c => c.id === lob.persons[k]).name)} ▶</div></div>
    ${lob.mode === 'roam' ? `<div class="pick" data-i="m${k}" style="min-width:210px"><div>◀ ${lob.modes[k] === 'football' ? '⚽ FOOTBALL' : lob.modes[k] === 'race' ? '🏁 STREET RACE' : '🏙 OPEN WORLD'} ▶<small>${lob.modes[k] === 'football' ? 'play in the live stadium match' : lob.modes[k] === 'race' ? 'race rivals while friends play on' : 'drive · fly · sail · fight'}</small></div></div>` : ''}
    <div class="pick wide" data-i="c${k}"><img src="../assets/ui/car_${lob.cars[k]}.jpg"><div>◀ ${esc(CARS.find(c => c.id === lob.cars[k]).name)} ▶<small>${esc(CARS.find(c => c.id === lob.cars[k]).cls)}</small></div></div></div>`);
  show('lobby', `<div class="screen">${logo}<h2>${lob.mode === 'race' ? 'STREET RACE' : 'MULTIPLAYER HUB'} · LOBBY</h2>
    <div class="it center" data-i="n">PLAYERS: ◀ ${lob.n} ▶<small>${lob.n === 1 ? 'WASD or arrows + mouse-free keyboard' : lob.n === 2 ? 'P1 WASD · P2 arrow keys · or controllers' : 'keyboards then controllers'}</small></div>
    <div class="slots">${rows.join('')}</div><div class="it go" data-i="go">START</div><div class="it" data-i="back">BACK</div><div class="hint">◀ ▶ change · Enter select</div></div>`,
  { act: (i, dx) => {
    if (i === 'n') { lob.n = Math.max(1, Math.min(4, lob.n + (dx || 1))); lobby(); sel = 0; paint(); } else if (i === 'go') { hide(); hooks.start && hooks.start({ mode: lob.mode, players: lob.n, persons: lob.persons.slice(0, lob.n), cars: lob.cars.slice(0, lob.n), modes: lob.mode === 'race' ? undefined : lob.modes.slice(0, lob.n), ...settings }); } else if (i === 'back') title();
    else if (i[0] === 'p') { const k = +i[1]; lob.persons[k] = cyc(CAST.map(c => c.id), lob.persons[k], dx || 1); lobby(); sel = items.findIndex(e => e.dataset.i === i); paint(); }
    else if (i[0] === 'm') { const k = +i[1]; lob.modes[k] = cyc(['roam', 'football', 'race'], lob.modes[k], dx || 1); lobby(); sel = items.findIndex(e => e.dataset.i === i); paint(); }
    else if (i[0] === 'c') { const k = +i[1]; lob.cars[k] = cyc(CARS.map(c => c.id), lob.cars[k], dx || 1); lobby(); sel = items.findIndex(e => e.dataset.i === i); paint(); }
  }, back: title, keepSel: true });
}
export function settingsScreen(back) {
  const row = (k, label, val) => `<div class="it row" data-i="${k}"><span>${label}</span><b>◀ ${val} ▶</b></div>`;
  const draw = () => show('settings', `<div class="screen">${logo}<h2>SETTINGS</h2><div class="menu">${row('time', 'Time of day', settings.time)}${row('weather', 'Weather', settings.weather)}${row('traffic', 'Traffic', ['none', 'light', 'normal', 'heavy'][[0, 8, 20, 34].indexOf(settings.traffic)] || 'normal')}${row('peds', 'Pedestrians', ['none', 'few', 'normal', 'crowded'][[0, 6, 16, 30].indexOf(settings.peds)] || 'normal')}${row('quality', 'Graphics', settings.quality)}${row('music', 'Music volume', Math.round(settings.music * 100) + '%')}${row('sfx', 'Effects volume', Math.round(settings.sfx * 100) + '%')}${row('voice', 'Voice volume', Math.round(settings.voice * 100) + '%')}${row('musicMode', 'Music', { always: 'always on', cars: 'only in cars', off: 'off' }[settings.musicMode] || 'always on')}<div class="it" data-i="back">BACK</div></div></div>`, {
    act: (i, dx) => { dx = dx || 1; if (i === 'time') settings.time = cyc(['night', 'dusk', 'day'], settings.time, dx); else if (i === 'weather') settings.weather = cyc(['clear', 'rain'], settings.weather, dx); else if (i === 'traffic') settings.traffic = cyc([0, 8, 20, 34], settings.traffic, dx); else if (i === 'peds') settings.peds = cyc([0, 6, 16, 30], settings.peds, dx); else if (i === 'quality') settings.quality = cyc(['low', 'medium', 'high'], settings.quality, dx);
      else if (['music', 'sfx', 'voice'].includes(i)) settings[i] = Math.max(0, Math.min(1, +(settings[i] + dx * 0.1).toFixed(1))); else if (i === 'musicMode') { settings.musicMode = cyc(['always', 'cars', 'off'], settings.musicMode, dx); settings.radio = settings.musicMode !== 'off'; } else if (i === 'back') { saveSettings(); back(); return; } saveSettings(); const s = sel; draw(); sel = s; paint(); hooks.settingsChanged && hooks.settingsChanged(); }, back: () => { saveSettings(); back(); } });
  draw();
}
export function controls(back) {
  show('controls', `<div class="screen">${logo}<h2>CONTROLS</h2><div class="ctl"><table>
  <tr><th></th><th>Keyboard (P1 / single player)</th><th>Keyboard (P2)</th><th>Controller</th></tr>
  <tr><td>Move / steer</td><td>W A S D</td><td>Arrow keys</td><td>Left stick</td></tr>
  <tr><td>Run (hold = sprint) / nitro</td><td>Shift</td><td>Right Shift</td><td>RB</td></tr>
  <tr><td>Jump (hop onto cars)</td><td>V</td><td>N</td><td>Y</td></tr>
  <tr><td>Get in / out · open doors</td><td>F</td><td>Enter</td><td>A</td></tr>
  <tr><td>Handbrake</td><td>Space</td><td>Num 0 / R-Ctrl</td><td>B</td></tr>
  <tr><td>Gas / brake</td><td>W / S</td><td>↑ / ↓</td><td>RT / LT</td></tr>
  <tr><td>Camera view</td><td>C</td><td>.</td><td>Y</td></tr>
  <tr><td>Orbit camera (on foot)</td><td>Q / E</td><td>Num 7 / 9</td><td>Right stick</td></tr>
  <tr><td>Punch / kick · shoot</td><td>J · K</td><td>, · /</td><td>X · RT</td></tr>
  <tr><td>Draw / holster weapon</td><td>T</td><td>;</td><td>LB</td></tr>
  <tr><td>Horn</td><td>H</td><td>'</td><td>L-stick click</td></tr>
  <tr><td>Next radio track</td><td>X</td><td>Num 8 / Z</td><td>D-pad →</td></tr>
  <tr><td>Phone / wallet · ATM</td><td>M</td><td>Num 5</td><td>Select</td></tr>
  <tr><td>Pause</td><td>Esc</td><td>—</td><td>Start</td></tr></table></div><div class="it" data-i="back">BACK</div></div>`, { act: () => back(), back });
}
export function credits() {
  show('credits', `<div class="screen">${logo}<h2>CREDITS</h2><div class="ctl cr"><p><b>Neon Overdrive</b> — an original game. All cars, characters, brands and places are fictional.</p>
  <p>Cars, characters and city modelled with Blender and MakeHuman/MPFB2 (CC0 base assets). Animations from Mixamo.</p>
  <p>Textures, props and skies: <b>Assets from Poly Haven</b> (polyhaven.com, CC0) and <b>ambientCG</b> (ambientcg.com, CC0).</p>
  <p>Voices: Kokoro text-to-speech. Generated music tracks: original.</p>
  <p><b>Radio music (Jamendo, CC BY 3.0):</b></p><div id="trk" style="font-size:12px;opacity:.85;line-height:1.5">loading…</div></div><div class="it" data-i="back">BACK</div></div>`, { act: () => title(), back: title });
  fetch('../assets/music/tracks.json').then(r => r.json()).then(t => { const el = document.getElementById('trk'); if (el) el.innerHTML = t.map(x => `“${esc(x.title)}” by ${esc(x.artist)} — <span style="opacity:.6">${esc(x.url)}</span>`).join('<br>'); }).catch(() => { const el = document.getElementById('trk'); if (el) el.textContent = ''; });
}
export function pause() {
  show('pause', `<div class="screen small"><h2>PAUSED</h2><div class="menu"><div class="it" data-i="resume">RESUME</div><div class="it" data-i="settings">SETTINGS</div><div class="it" data-i="controls">CONTROLS</div><div class="it" data-i="title">QUIT TO TITLE</div></div></div>`, { act: i => { if (i === 'resume') { hide(); hooks.resume && hooks.resume(); } else if (i === 'settings') settingsScreen(pause); else if (i === 'controls') controls(pause); else if (i === 'title') { hooks.toTitle && hooks.toTitle(); } }, back: () => { hide(); hooks.resume && hooks.resume(); } });
}
// generic one-shot overlay (bank, phone, results)
export function panel(html, act, back) { show('panel', html, { act, back: back || (() => hide()) }); }
export function closePanel() { hide(); }
export const current = () => cur && cur.name;
