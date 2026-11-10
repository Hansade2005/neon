// Input: two keyboard layouts (merged when one player), gamepads. Produces one state object per player each frame.
const keys = new Set(), tapped = new Set(); let inited = false;
export function initInput() {
  if (inited) return; inited = true;
  window.addEventListener('keydown', e => { if (!e.repeat) tapped.add(e.code); keys.add(e.code); if (/^(Arrow|Space|Tab|Numpad)/.test(e.code)) e.preventDefault(); });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
}
export const endFrame = () => tapped.clear();
const KB = {
  a: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', run: ['ShiftLeft'], hand: ['Space'], nitro: ['ShiftLeft'], interact: ['KeyF'], cam: ['KeyC'], punch: ['KeyJ'], shoot: ['KeyK'], horn: ['KeyH'], orbL: 'KeyQ', orbR: 'KeyE', reset: ['KeyR'], weapon: ['KeyT'], jump: ['KeyV'], phone: ['KeyM'], radio: ['KeyX'] },
  b: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', run: ['ShiftRight'], hand: ['Numpad0', 'ControlRight'], nitro: ['ShiftRight'], interact: ['Enter', 'NumpadEnter'], cam: ['Period'], punch: ['Comma'], shoot: ['Slash'], horn: ['Quote'], orbL: 'Numpad7', orbR: 'Numpad9', reset: ['Backslash'], weapon: ['Semicolon'], jump: ['KeyN'], phone: ['Numpad5', 'KeyB'], radio: ['Numpad8', 'KeyZ'] },
};
const held = (l, set = keys) => l.some(c => set.has(c)), any = (arr, set = keys) => arr.some(c => set.has(c));
export function pads() { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(g => g && g.connected); }
export function deviceList() { return [{ type: 'kb', layout: 'merged' }, ...pads().map(g => ({ type: 'pad', index: g.index }))]; }
const dz = v => Math.abs(v) < 0.18 ? 0 : v;
const padPrev = {};
export function readDevice(dev) {
  const o = { mx: 0, my: 0, throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0, run: false, orbit: 0, camX: 0, interact: false, cam: false, punch: false, shoot: false, horn: false, reset: false, weapon: false, jump: false, phone: false, radio: false, pause: false, any: false };
  if (dev.type === 'kb') {
    const layouts = dev.layout === 'merged' ? [KB.a, KB.b] : [KB[dev.layout]];
    for (const L of layouts) {
      o.my += (keys.has(L.up) ? 1 : 0) - (keys.has(L.down) ? 1 : 0); o.mx += (keys.has(L.right) ? 1 : 0) - (keys.has(L.left) ? 1 : 0);
      o.run = o.run || any(L.run); o.hand = Math.max(o.hand, any(L.hand) ? 1 : 0); o.nitro = Math.max(o.nitro, any(L.nitro) ? 1 : 0);
      o.interact = o.interact || any(L.interact, tapped); o.cam = o.cam || any(L.cam, tapped); o.punch = o.punch || any(L.punch, tapped); o.shoot = o.shoot || any(L.shoot); o.horn = o.horn || any(L.horn); o.reset = o.reset || any(L.reset, tapped); o.weapon = o.weapon || any(L.weapon, tapped); o.phone = o.phone || any(L.phone, tapped); o.radio = o.radio || any(L.radio, tapped); o.jump = o.jump || any(L.jump, tapped);
      o.orbit += (keys.has(L.orbR) ? 1 : 0) - (keys.has(L.orbL) ? 1 : 0);
    }
    o.pause = tapped.has('Escape') || tapped.has('KeyP'); o.any = tapped.size > 0;
    o.mx = Math.max(-1, Math.min(1, o.mx)); o.my = Math.max(-1, Math.min(1, o.my));
  } else {
    const g = navigator.getGamepads()[dev.index]; if (!g) return o; const b = i => !!(g.buttons[i] && g.buttons[i].pressed), v = i => (g.buttons[i] ? g.buttons[i].value : 0), prev = (padPrev[dev.index] ||= []);
    const edge = i => { const n = b(i), p = !!prev[i]; return n && !p; };
    o.mx = dz(g.axes[0] || 0); o.my = -dz(g.axes[1] || 0); o.camX = dz(g.axes[2] || 0); o.run = b(5) || Math.hypot(o.mx, o.my) > 0.85; o.hand = b(1) ? 1 : 0; o.nitro = b(5) ? 1 : 0;
    o.interact = edge(0); o.cam = edge(3); o.punch = edge(2); o.shoot = b(7); o.horn = b(10); o.reset = edge(11); o.phone = edge(8); o.radio = edge(15); o.weapon = edge(4); o.jump = edge(3); o.pause = edge(9); o.any = g.buttons.some(x => x.pressed);
    o.padThrottle = v(7); o.padBrake = v(6); o.orbit = o.camX;
    for (let i = 0; i < g.buttons.length; i++) prev[i] = b(i);
  }
  // driving mapping
  o.steer = -o.mx; o.throttle = dev.type === 'pad' ? Math.max(o.padThrottle || 0, o.my > 0.5 ? 1 : 0) : (o.my > 0 ? 1 : 0); o.brake = dev.type === 'pad' ? Math.max(o.padBrake || 0, o.my < -0.5 ? 1 : 0) : (o.my < 0 ? 1 : 0);
  return o;
}
export function anyPress() { if (tapped.size) return true; return pads().some(g => g.buttons.some(b => b.pressed)); }
export const justPressed = c => tapped.has(c);

// ---- football controls (Pitch Clash engine). Stick: right = +x, up = +z in the arena TV camera. Edges are tracked per player.
const FKB = {
  a: { pass: ['KeyJ'], shoot: ['KeyK'], through: ['KeyL'], lob: ['KeyI'], sprint: ['ShiftLeft'], switch: ['KeyQ'], skill: ['KeyE'] },
  b: { pass: ['KeyZ', 'Comma'], shoot: ['KeyX', 'Period'], through: ['KeyC', 'Slash'], lob: ['KeyB'], sprint: ['ShiftRight'], switch: ['KeyN'], skill: ['KeyG'] },
};
const FPAD = { pass: [0], shoot: [1], through: [3], lob: [2], sprint: [5, 7], switch: [4], skill: [6] };
const fPrev = new Map();
export function readFootball(dev) {
  const o = { mx: 0, my: 0, sprint: false }, acts = ['pass', 'shoot', 'through', 'lob', 'skill', 'switch'], id = dev.type + (dev.index ?? dev.layout);
  const cur = {};
  if (dev.type === 'kb') {
    const Ls = dev.layout === 'merged' ? [KB.a, KB.b] : [KB[dev.layout]], Fs = dev.layout === 'merged' ? [FKB.a, FKB.b] : [FKB[dev.layout]];
    for (const L of Ls) { o.my += (keys.has(L.up) ? 1 : 0) - (keys.has(L.down) ? 1 : 0); o.mx += (keys.has(L.right) ? 1 : 0) - (keys.has(L.left) ? 1 : 0); }
    for (const F of Fs) { o.sprint = o.sprint || F.sprint.some(c => keys.has(c)); for (const a of acts) cur[a] = cur[a] || F[a].some(c => keys.has(c) || tapped.has(c)); }
  } else {
    const g = navigator.getGamepads()[dev.index]; if (g) { const b = i => !!(g.buttons[i] && g.buttons[i].pressed); o.mx = dz(g.axes[0] || 0); o.my = -dz(g.axes[1] || 0); if (b(12)) o.my = 1; if (b(13)) o.my = -1; if (b(14)) o.mx = -1; if (b(15)) o.mx = 1; o.sprint = FPAD.sprint.some(b); for (const a of acts) cur[a] = FPAD[a].some(b); }
  }
  const m = Math.hypot(o.mx, o.my); if (m > 1) { o.mx /= m; o.my /= m; }
  const prev = fPrev.get(id) || {}; for (const a of acts) { o[a] = !!cur[a]; o[a + 'Pressed'] = !!cur[a] && !prev[a]; } fPrev.set(id, cur); return o;
}
