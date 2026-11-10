// Audio: synthesised engines, tyres, doors, horns, sirens, impacts, ambience + Kokoro voices + generated radio.
export const Audio = (() => {
  const samples = {}; let ctx = null, master, sfxBus, musicBus, voiceBus, noiseBuf, manifest = null, voiceBufs = {}, vol = { music: 0.6, sfx: 0.8, voice: 0.9 };
  const engines = new Map(); let sirenNode = null, hornNodes = new Map(), ambNode = null, radioOn = false, lastVoice = 0, stepT = {}, voicePlaying = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); musicBus = ctx.createGain(); voiceBus = ctx.createGain(); [sfxBus, musicBus, voiceBus].forEach(b => b.connect(master)); setVolumes(vol);
    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    fetch('../assets/voice/manifest.json').then(r => r.json()).then(m => { manifest = m; }).catch(() => {});
    if (window.Music) { try { Music.attach(ctx, musicBus); Music.onTrackChange = () => { if (Math.random() < 0.5) voice('dj', { pri: 1 }); }; } catch (e) {} }
    for (const n of ['engine_a', 'engine_b', 'horn_1', 'horn_2', 'horn_3', 'horn_truck', 'siren', 'party', 'explosion', 'bike', 'shot_pistol', 'shot_gun', 'shot_smg']) fetch(`../assets/audio/${n}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { samples[n] = buf; }).catch(() => {});
    loadTracks();
    startAmbience();
  }
  function setVolumes(v) { Object.assign(vol, v); if (!ctx) return; sfxBus.gain.value = vol.sfx; musicBus.gain.value = vol.music * 0.9; voiceBus.gain.value = vol.voice; }
  const noise = (loop = true) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; return s; };
  function env(g, t, a, hold, r, peak) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r); }
  // ---- engines
  function engineFor(key) {
    let e = engines.get(key); if (e) return e; if (!ctx) return null;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), out = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sine'; f.type = 'lowpass'; f.Q.value = 3; g.gain.value = 0; out.gain.value = 0;
    const sub = ctx.createGain(); sub.gain.value = 0.6; o2.connect(sub); sub.connect(f); o1.connect(f); f.connect(g); const turbo = ctx.createGain(); turbo.gain.value = 0; o3.connect(turbo); turbo.connect(out); g.connect(out);
    const tn = noise(), tf = ctx.createBiquadFilter(), tg = ctx.createGain(); tf.type = 'bandpass'; tf.frequency.value = 1400; tf.Q.value = 2.5; tg.gain.value = 0; tn.connect(tf); tf.connect(tg); tg.connect(out);
    const wn = noise(), wf = ctx.createBiquadFilter(), wg = ctx.createGain(); wf.type = 'highpass'; wf.frequency.value = 600; wg.gain.value = 0; wn.connect(wf); wf.connect(wg); wg.connect(out);
    (pan ? (out.connect(pan), pan.connect(sfxBus)) : out.connect(sfxBus)); [o1, o2, o3, tn, wn].forEach(x => x.start()); e = { o1, o2, o3, f, g, out, turbo, tg, wg, smp: [] };
    for (const [n, gain] of [['engine_b', 0.9], ['engine_a', 0.5]]) if (samples[n]) { const s = ctx.createBufferSource(), sg = ctx.createGain(); s.buffer = samples[n]; s.loop = true; s.loopStart = 0.15; s.loopEnd = samples[n].duration - 0.15; sg.gain.value = 0; s.connect(sg); sg.connect(out); s.start(0, Math.random() * 1); e.smp.push({ s, g: sg, base: gain, n }); } engines.set(key, e); return e;
  }
  function engineUpdate(key, car, load, share = 1) {
    const e = engineFor(key); if (!e) return; const t = ctx.currentTime, rpm = car.rpm, base = 38 + rpm * 150 * (car.spec.id === 'bulldog' ? 0.8 : 1);
    e.o1.frequency.setTargetAtTime(base, t, 0.04); e.o2.frequency.setTargetAtTime(base * 0.5, t, 0.04); e.o3.frequency.setTargetAtTime(500 + rpm * 1800, t, 0.05);
    e.f.frequency.setTargetAtTime(280 + rpm * 1900 + load * 900, t, 0.06); e.g.gain.setTargetAtTime(0.16 + load * 0.2, t, 0.05); e.turbo.gain.setTargetAtTime(car.nitroOn ? 0.1 : load * 0.012 * rpm, t, 0.1);
    e.tg.gain.setTargetAtTime(Math.min(0.22, Math.max(0, (car.slip - 3) / 20)) * (car.speed > 6 ? 1 : 0), t, 0.05); e.wg.gain.setTargetAtTime(Math.min(0.12, car.speed / 700), t, 0.2);
    e.out.gain.setTargetAtTime(0.5 * share, t, 0.1);
    if (e.smp.length) { e.g.gain.setTargetAtTime(0.05 + load * 0.05, t, 0.05); for (const m of e.smp) { if (m.n === 'engine_b') { m.s.playbackRate.setTargetAtTime(0.55 + rpm * 1.25, t, 0.05); m.g.gain.setTargetAtTime(m.base * (0.55 + load * 0.45), t, 0.06); } else { m.s.playbackRate.setTargetAtTime(0.7 + rpm * 0.9, t, 0.08); m.g.gain.setTargetAtTime(m.base * (0.25 + load * 0.5) * (rpm > 0.35 ? 1 : 0.4), t, 0.1); } } }
  }
  function engineStop(key) { const e = engines.get(key); if (!e) return; const t = ctx.currentTime; e.out.gain.setTargetAtTime(0, t, 0.1); setTimeout(() => { try { [e.o1, e.o2, e.o3, ...e.smp.map(m => m.s)].forEach(o => o.stop()); } catch (x) {} }, 600); engines.delete(key); }
  // ---- one-shots
  function burst(freq, q, dur, peak, type = 'bandpass', bus = sfxBus) { if (!ctx) return; const t = ctx.currentTime, n = noise(false), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q; n.connect(f); f.connect(g); g.connect(bus); env(g, t, 0.003, dur * 0.2, dur, peak); n.start(t, Math.random()); n.stop(t + dur + 0.3); }
  function tone(freq, dur, peak, type = 'sine', slide = 0) { if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur); o.connect(g); g.connect(sfxBus); env(g, t, 0.005, dur * 0.3, dur, peak); o.start(t); o.stop(t + dur + 0.2); }
  const sfx = {
    doorOpen() { burst(900, 1.2, 0.18, 0.25); tone(140, 0.12, 0.12, 'square', -40); }, doorClose() { burst(500, 0.8, 0.22, 0.45); tone(90, 0.16, 0.3, 'sine', -30); },
    crash(k) { const p = Math.min(1, k / 18); burst(300, 0.6, 0.5, 0.5 * p + 0.15, 'lowpass'); burst(2200, 1.5, 0.25, 0.3 * p); tone(70, 0.3, 0.3 * p, 'sine', -30); },
    step(run) { burst(run ? 380 : 300, 1.2, 0.08, run ? 0.1 : 0.06, 'lowpass'); }, punch() { burst(180, 0.7, 0.14, 0.4, 'lowpass'); tone(110, 0.1, 0.3, 'sine', -50); }, whoosh() { burst(1200, 0.7, 0.12, 0.12); },
    explosion() { if (samples.explosion && ctx) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = samples.explosion; g.gain.value = 1.0; s.connect(g); g.connect(sfxBus); s.start(); } else { burst(120, 0.5, 1.1, 0.9, 'lowpass'); } },
    shot(pistol = true) { if (samples.shot_pistol && ctx) { const b = pistol ? samples.shot_pistol : samples.shot_gun, s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = 0.9; s.connect(g); g.connect(sfxBus); s.start(); return; } burst(pistol ? 2400 : 1500, 0.6, 0.18, 0.55, 'bandpass'); burst(180, 0.5, 0.35, 0.55, 'lowpass'); tone(pistol ? 220 : 110, 0.2, 0.3, 'sawtooth', -150); }, empty() { burst(3000, 3, 0.04, 0.2); },
    cash() { tone(1568, 0.09, 0.2, 'sine'); setTimeout(() => tone(2093, 0.18, 0.2, 'sine'), 90); }, beep() { tone(880, 0.1, 0.15, 'square'); }, deny() { tone(180, 0.25, 0.2, 'square'); }, checkpoint() { tone(660, 0.1, 0.2, 'triangle'); setTimeout(() => tone(990, 0.2, 0.2, 'triangle'), 90); }, countBeep(go) { tone(go ? 1320 : 660, go ? 0.5 : 0.15, 0.25, 'square'); }, wanted() { tone(520, 0.12, 0.2, 'sawtooth'); setTimeout(() => tone(390, 0.25, 0.2, 'sawtooth'), 120); },
    skid() { burst(1800, 2.5, 0.3, 0.12); }, whistle() { tone(2900, 0.5, 0.18, 'sine', 80); },
  };
  function horn(key, on, kind = 'car') {
    if (!ctx) return; const had = hornNodes.get(key);
    if (on && !had) { const pool = ['horn_1', 'horn_2', 'horn_3'], name = kind === 'truck' ? 'horn_truck' : pool[(key.charCodeAt(key.length - 1) + 1) % 3], buf = samples[name] || samples.horn_1; if (buf) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.loop = true; s.loopStart = 0.2; s.loopEnd = Math.max(0.5, buf.duration - 0.2); g.gain.value = 0.5; s.connect(g); g.connect(sfxBus); s.start(); hornNodes.set(key, { s, g }); } }
    else if (!on && had) { had.g.gain.setTargetAtTime(0, ctx.currentTime, 0.04); setTimeout(() => { try { had.s.stop(); } catch (x) {} }, 250); hornNodes.delete(key); }
  }
  function siren(on, gain = 0.12) { if (!ctx) return; if (samples.siren) { if (on && !sirenNode) { const sx = ctx.createBufferSource(), g = ctx.createGain(); sx.buffer = samples.siren; sx.loop = true; g.gain.value = 0; sx.connect(g); g.connect(sfxBus); sx.start(); sirenNode = { sx, g, smp: true }; } if (sirenNode && sirenNode.smp) { if (on) sirenNode.g.gain.setTargetAtTime(gain * 4, ctx.currentTime, 0.2); else { sirenNode.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2); const sn = sirenNode; setTimeout(() => { try { sn.sx.stop(); } catch (e) {} }, 900); sirenNode = null; } return; } } if (on && !sirenNode) { const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 900; l.frequency.value = 1.6; lg.gain.value = 320; l.connect(lg); lg.connect(o.frequency); g.gain.value = gain; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; o.connect(f); f.connect(g); g.connect(sfxBus); o.start(); l.start(); sirenNode = { o, l, g }; } else if (!on && sirenNode) { sirenNode.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); const s = sirenNode; setTimeout(() => { try { s.o.stop(); s.l.stop(); } catch (x) {} }, 400); sirenNode = null; } else if (on && sirenNode) sirenNode.g.gain.setTargetAtTime(gain, ctx.currentTime, 0.1); }
  function startAmbience() { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.05; n.connect(f); f.connect(g); g.connect(sfxBus); n.start(); ambNode = { g, f }; }
  let partyNode = null; function partyLevel(l) { if (!ctx || !samples.party) return; if (l > 0.03 && !partyNode) { const sx = ctx.createBufferSource(), g = ctx.createGain(); sx.buffer = samples.party; sx.loop = true; g.gain.value = 0; sx.connect(g); g.connect(sfxBus); sx.start(); partyNode = { sx, g }; } if (partyNode) partyNode.g.gain.setTargetAtTime(Math.min(1, l) * 0.9, ctx.currentTime, 0.3); }
  function bikeLoop(key, on, speed) { if (!ctx || !samples.bike) return; let b = engines.get('b' + key); if (on) { if (!b) { const sx = ctx.createBufferSource(), g = ctx.createGain(); sx.buffer = samples.bike; sx.loop = true; g.gain.value = 0; sx.connect(g); g.connect(sfxBus); sx.start(0, Math.random() * 5); b = { sx, g, bike: true, smp: [] }; engines.set('b' + key, b); } b.g.gain.setTargetAtTime(Math.min(0.9, speed / 9), ctx.currentTime, 0.1); b.sx.playbackRate.setTargetAtTime(0.7 + Math.min(1, speed / 10) * 0.7, ctx.currentTime, 0.1); } else if (b) { b.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); const bb = b; setTimeout(() => { try { bb.sx.stop(); } catch (e) {} }, 400); engines.delete('b' + key); } }
  // ---- aircraft / boat engines: synthesised propeller drone, rotor chop and outboard burble
  const craftN = new Map();
  function craftLoop(key, type, on, c, share = 1) {
    if (!ctx) return; let e = craftN.get(key);
    if (!on || !type) { if (e) { e.out.gain.setTargetAtTime(0, ctx.currentTime, 0.15); const old = e; craftN.delete(key); setTimeout(() => { for (const n of old.nodes) { try { n.stop(); } catch (x) {} } try { old.out.disconnect(); } catch (x) {} }, 900); } return; }
    if (e && e.type !== type) { craftLoop(key, null, false); e = null; }
    if (!e) {
      const out = ctx.createGain(); out.gain.value = 0; out.connect(sfxBus); const nodes = []; e = { type, out, nodes };
      const osc = (t, f) => { const o = ctx.createOscillator(); o.type = t; o.frequency.value = f; o.start(); nodes.push(o); return o; }, nz = () => { const n = noise(); n.start(); nodes.push(n); return n; };
      const lp = (f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q; return b; }, bp = (f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; }, gn = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
      e.wind = gn(0); const wn = nz(), wf = bp(700, 0.6); wn.connect(wf); wf.connect(e.wind); e.wind.connect(out);
      if (type === 'plane') {
        e.o1 = osc('sawtooth', 60); e.o2 = osc('square', 30); e.f = lp(1100); e.g1 = gn(0.5); e.o1.connect(e.f); e.o2.connect(e.f); e.f.connect(e.g1); e.g1.connect(out);
        e.lfo = osc('sine', 40); e.lfoG = gn(0.22); e.lfo.connect(e.lfoG); e.lfoG.connect(e.g1.gain);
        const cn = nz(), cf = lp(420); e.cg = gn(0.18); cn.connect(cf); cf.connect(e.cg); e.cg.connect(out);
      } else if (type === 'heli') {
        const rn = nz(), rf = lp(520, 1.4); e.rg = gn(0.4); rn.connect(rf); rf.connect(e.rg); e.rg.connect(out); e.rf = rf;
        e.lfo = osc('sawtooth', 12); e.lfoG = gn(0.45); e.lfo.connect(e.lfoG); e.lfoG.connect(e.rg.gain);
        e.o1 = osc('sawtooth', 70); e.f = lp(380); e.g1 = gn(0.22); e.o1.connect(e.f); e.f.connect(e.g1); e.g1.connect(out);
        e.w1 = osc('sine', 1100); e.wg = gn(0.02); e.w1.connect(e.wg); e.wg.connect(out);
      } else {
        e.o1 = osc('sawtooth', 55); e.o2 = osc('triangle', 27); e.f = lp(650); e.g1 = gn(0.45); e.o1.connect(e.f); e.o2.connect(e.f); e.f.connect(e.g1); e.g1.connect(out);
        e.lfo = osc('sine', 9); e.lfoG = gn(0.18); e.lfo.connect(e.lfoG); e.lfoG.connect(e.g1.gain);
        const sn = nz(), sf = bp(1400, 0.8); e.sg = gn(0); sn.connect(sf); sf.connect(e.sg); e.sg.connect(out);
      }
      craftN.set(key, e);
    }
    const T = ctx.currentTime, set = (p, v, tc = 0.08) => p.setTargetAtTime(v, T, tc), sp = Math.min(1, Math.abs(c.speed || 0) / ((c.spec && c.spec.top) / 3.6 || 70));
    set(e.out.gain, 0.5 * share, 0.2); set(e.wind.gain, type === 'boat' ? 0.03 + sp * 0.06 : 0.02 + sp * sp * 0.38);
    if (type === 'plane') { const r = c.rpm || 0.3; set(e.o1.frequency, 52 + r * 95); set(e.o2.frequency, 26 + r * 48); set(e.lfo.frequency, 14 + r * 60); set(e.f.frequency, 700 + r * 1700); set(e.g1.gain, 0.34 + r * 0.4); }
    else if (type === 'heli') { const l = (c.rotorSpeed || 0) / 38; set(e.lfo.frequency, 4 + l * 9); set(e.rg.gain, 0.12 + l * 0.7); set(e.rf.frequency, 260 + l * 480); set(e.o1.frequency, 40 + l * 44); set(e.g1.gain, 0.04 + l * 0.22); set(e.w1.frequency, 500 + l * 1500); set(e.wg.gain, l * l * 0.045); }
    else { const r = c.rpm || 0.3; set(e.o1.frequency, 40 + r * 150); set(e.o2.frequency, 20 + r * 74); set(e.lfo.frequency, 6 + r * 22); set(e.f.frequency, 380 + r * 1400); set(e.g1.gain, 0.28 + r * 0.45); set(e.sg.gain, sp * 0.38); }
  }
  function setRain(on) { if (!ctx) return; if (on && !ambNode.rain) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = 0.07; n.connect(f); f.connect(g); g.connect(sfxBus); n.start(); ambNode.rain = { n, g }; } else if (!on && ambNode.rain) { try { ambNode.rain.n.stop(); } catch (e) {} ambNode.rain = null; } }
  // ---- radio
  let musicLevel = 1; function setMusicLevel(l) { musicLevel = l; if (ctx) musicBus.gain.setTargetAtTime(vol.music * 0.9 * l, ctx.currentTime, 0.2); }
  // ---- radio: licensed Jamendo tracks (CC-BY, see assets/music/tracks.json) with the generated music as fallback
  let tracks = [], radioIdx = -1, radioSrc = null, radioGain = null, radioPlaying = false, radioToken = 0, onTrack = null, curTrack = null;
  const trackBufs = new Map();
  let tracksP = null; function loadTracks() { return tracksP = fetch('../assets/music/tracks.json').then(r => r.json()).then(t => { tracks = t.sort(() => Math.random() - 0.5); }).catch(() => { tracks = []; }); }
  async function playTrack(i) {
    const my = ++radioToken; if (!tracks.length) return false; radioIdx = ((i % tracks.length) + tracks.length) % tracks.length; const tr = tracks[radioIdx];
    let buf = trackBufs.get(tr.file); if (!buf) { try { buf = await ctx.decodeAudioData(await (await fetch('../assets/music/' + tr.file)).arrayBuffer()); trackBufs.set(tr.file, buf); if (trackBufs.size > 3) trackBufs.delete(trackBufs.keys().next().value); } catch (e) { return false; } }
    if (my !== radioToken || !radioPlaying) return true; if (radioSrc) { try { radioGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15); const o = radioSrc; setTimeout(() => { try { o.stop(); } catch (e) {} }, 600); } catch (e) {} }
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = 0; s.connect(g); g.connect(musicBus); s.start(); g.gain.setTargetAtTime(1, ctx.currentTime, 0.4); radioSrc = s; radioGain = g; curTrack = tr;
    s.onended = () => { if (radioSrc === s && radioPlaying) playTrack(radioIdx + 1); }; onTrack && onTrack(tr); return true;
  }
  function radio(on) {
    if (!ctx) return; if (on && !radioPlaying) { radioPlaying = true; (tracksP || Promise.resolve()).then(() => { if (!radioPlaying) return; if (tracks.length) playTrack(radioIdx < 0 ? 0 : radioIdx); else if (window.Music) { try { Music.start(); } catch (e) {} } }); }
    else if (!on && radioPlaying) { radioPlaying = false; radioToken++; if (radioSrc) { try { radioGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4); const o = radioSrc; setTimeout(() => { try { o.stop(); } catch (e) {} }, 1500); } catch (e) {} radioSrc = null; } try { window.Music && Music.stop(1.5); } catch (e) {} }
  }
  function radioNext() { if (!ctx || !radioPlaying) return; if (tracks.length) playTrack(radioIdx + 1); else try { Music.next(); } catch (e) {} }
  const radioInfo = () => curTrack;
  const setOnTrack = f => { onTrack = f; };

  // ---- stadium: ambience loops, crowd reactions and Pitch Clash commentary
  const fb = {}; let fbMan = null, bed = null, chant = null;
  const fbLoad = n => fb[n] ? Promise.resolve(fb[n]) : fetch(`../assets/football/audio/${n}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => (fb[n] = buf)).catch(() => null);
  function fbPlay(n, gain = 1, bus) { fbLoad(n).then(buf => { if (!buf || !ctx) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = gain; s.connect(g); g.connect(bus || sfxBus); s.start(); }); }
  function stadiumBed(on) { if (!ctx) return; if (on && !bed) { Promise.all([fbLoad('stadium_ambience'), fbLoad('crowd_live'), fbLoad('chant_stomps')]).then(([a, c, ch]) => { if (bed || !a) return; const mk = (buf, g0) => { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(sfxBus); s.start(0, Math.random() * 3); return { s, g, g0 }; }; bed = { amb: mk(a), live: c ? mk(c) : null, chant: ch ? mk(ch) : null }; }); } }
  function stadiumLevel(l, excite) { if (!ctx || !bed) return; const t = ctx.currentTime; bed.amb.g.gain.setTargetAtTime(0.55 * l, t, 0.4); if (bed.live) bed.live.g.gain.setTargetAtTime(0.5 * l * (0.35 + Math.min(1, excite)), t, 0.3); if (bed.chant) bed.chant.g.gain.setTargetAtTime(0.35 * l * (excite < 0.4 ? 1 : 0.2), t, 0.5); }
  function crowdGoal(v = 1) { fbPlay('crowd_goal', 0.9 * v); fbPlay(Math.random() < 0.5 ? 'goal_stadium' : 'goal_cheer2', 0.7 * v); fbPlay('goal_horn', 0.45 * v); }
  function crowdNear(v = 1) { fbPlay('crowd_nearmiss', 0.8 * v); }
  async function comment(cat, o = {}) {
    if (!ctx) return; if (!fbMan) { try { fbMan = await (await fetch('../assets/football/commentary/manifest.json')).json(); } catch (e) { return; } }
    const list = fbMan.lines[cat]; if (!list || !list.length) return; const file = list[(Math.random() * list.length) | 0]; const key = 'fc_' + file; let buf = voiceBufs[key];
    if (buf === undefined) { try { buf = await ctx.decodeAudioData(await (await fetch('../assets/football/commentary/' + file)).arrayBuffer()); } catch (e) { buf = null; } voiceBufs[key] = buf; } if (!buf) return;
    if (voicePlaying && voicePlaying.end > ctx.currentTime && (o.pri || 0) < (voicePlaying.pri || 0)) return; if (voicePlaying && voicePlaying.src) try { voicePlaying.src.stop(); } catch (e) {}
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = o.gain || 1; s.connect(g); g.connect(voiceBus); s.start(); voicePlaying = { end: ctx.currentTime + buf.duration, pri: o.pri || 0, src: s };
  }
  const storyBufs = {};
  async function story(name, gain = 1) { if (!ctx) return 0; let b = storyBufs[name]; if (b === undefined) { try { b = await ctx.decodeAudioData(await (await fetch(`../assets/story/${name}.mp3`)).arrayBuffer()); } catch (e) { b = null; } storyBufs[name] = b; } if (!b) return 0; if (voicePlaying && voicePlaying.src) try { voicePlaying.src.stop(); } catch (e) {} const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = gain; s.connect(g); g.connect(voiceBus); s.start(); voicePlaying = { end: ctx.currentTime + b.duration, pri: 5, src: s }; return b.duration; }
  // ---- voices
  async function loadVoice(file) { if (voiceBufs[file]) return voiceBufs[file]; try { const r = await fetch('../assets/voice/' + file); voiceBufs[file] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { voiceBufs[file] = null; } return voiceBufs[file]; }
  async function voice(cat, { gain = 1, pri = 0 } = {}) {
    if (!ctx || !manifest || !manifest[cat]) return; const now = ctx.currentTime; if (voicePlaying && voicePlaying.end > now && voicePlaying.pri > pri) return;
    const item = manifest[cat][(Math.random() * manifest[cat].length) | 0], buf = await loadVoice(item.file); if (!buf) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = gain; s.connect(g); g.connect(voiceBus); if (voicePlaying && voicePlaying.src) try { voicePlaying.src.stop(); } catch (e) {}
    s.start(); voicePlaying = { end: ctx.currentTime + buf.duration, pri, src: s }; return item.text;
  }
  return { init, setVolumes, radio, story, stadiumBed, stadiumLevel, crowdGoal, crowdNear, comment, radioNext, radioInfo, setOnTrack, setMusicLevel, partyLevel, bikeLoop, craftLoop, engineUpdate, engineStop, sfx, horn, siren, radio, voice, setRain, burst, get ready() { return !!ctx; }, get ctx() { return ctx; } };
})();
