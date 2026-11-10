// Small shared helpers for pay-and-pick menus (hotel, marina, aviation desk, ...).
import * as UI from './ui.js';
import { Audio } from './audio.js';
export function spend(p, amt) { if ((p.cash || 0) < amt) { p.say('Not enough cash', 1.8); Audio.sfx.deny && Audio.sfx.deny(); return false; } p.cash -= amt; Audio.sfx.cash && Audio.sfx.cash(); return true; }
export function menuPanel(gp, p, title, rows, pick) {
  UI.panel(`<div class="screen small" style="width:560px"><div class="logo"><b style="font-size:36px">${title}</b></div><div class="bal"><div>CASH <b>$${Math.round(p.cash || 0)}</b></div><div>HP <b>${Math.round(p.hp)}</b></div><div>ARMOR <b>${Math.round(p.armor || 0)}</b></div></div><div class="menu">${rows.map(r => `<div class="it row" data-i="${r[0]}"><span>${r[1]}</span><b>${r[2] || ''}</b></div>`).join('')}<div class="it" data-i="close">CLOSE</div></div></div>`,
    id => { if (id === 'close') { UI.closePanel(); gp.onPanelClose && gp.onPanelClose(); return; } pick(id); menuPanel(gp, p, title, rows, pick); }, () => { UI.closePanel(); gp.onPanelClose && gp.onPanelClose(); });
  gp.onPanelOpen && gp.onPanelOpen();
}
