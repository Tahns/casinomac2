// Agent Mambo v2 layer SEALED ORDERS ENVELOPE (WP6). Mission `orders` (payTiming spinEnd, WP8_to_FRONT 3):
//   - a manila envelope is parked under the board, on the frame's lower-left lip, for the whole feature: never on a cell, never on the
//     Clearance Dial (K4: the place is measured from the cell area and the viewport, logic.js parkEnvelope)
//   - every banked winInfo (meta.banked) slides a slip into it: neutral steel / lilac paper, never gold, never the word WIN; the plate
//     beside the envelope reads FILED <bank> in the HUD money format (K3, ctx.fmt: USD / JPY / social coins); a small steel paper tag
//     +<amount> drops into the envelope with each slip (I5, no WIN word); the SEALED stamp lands with the first slip (cue caseSeal)
//   - caseOpen: the envelope comes forward, the flap opens, OPENED replaces SEALED and the plate shows bank x dial = result
//     (cue caseOpen, neutral; the win sound and the WIN counter are the player's, on the setWin that follows). The layer holds the
//     book for that beat (about 1 s, ctx.T) so the reveal is seen BEFORE the WIN counter moves.
//   - this layer never writes the WIN counter and never calls a celebration.
import { createBank, fmtAmt, parkEnvelope } from './logic.js';
import { envelopeSvg, slipSvg, stampSvg } from './art.js';
import { t } from '../../i18n/index.js';
import { h, anim, wait, isStill, isCalm, play, tx, esc, heroine, SVGNS } from './util.js';

export function createOrders() {
  const bank = createBank();
  let active = false, env = null, sealEl = null, plate = null, revealEl = null, token = 0, offResize = null, lastCtx = null;
  const L = { id: 'orders', log: [] };
  const alive = (my) => () => my === token;

  const money = (ctx, x100) => fmtAmt(ctx && ctx.fmt, x100);
  // the plate text; on a short screen (side parking) only its tail (the amount) shows, the head (FILED / bank x dial) is dropped by CSS
  function setPlate(full, tail) {
    if (!plate) return;
    const cut = tail && full.endsWith(tail) ? full.length - tail.length : 0;
    plate.innerHTML = cut ? `<i class="l-env-pre">${esc(full.slice(0, cut))}</i>${esc(tail)}` : esc(full);
  }

  // K4: park the envelope outside the cell area (under the board, lower-left lip), sized to the room the viewport leaves there
  function park(ctx) {
    if (!env || !ctx || !ctx.wrap || env.classList.contains('forward')) return null;
    try {
      const W = ctx.wrap.getBoundingClientRect();
      const B = (ctx.board || ctx.wrap).getBoundingClientRect();
      const cell = B.width / 6;
      const vh = (typeof window !== 'undefined' && window.innerHeight) || (B.bottom + cell);
      const sx = W.width && ctx.wrap.offsetWidth ? W.width / ctx.wrap.offsetWidth : 1; // the wrap may be scaled by a transform
      const k = sx > 0 ? 1 / sx : 1;
      const vw = (typeof window !== 'undefined' && window.innerWidth) || (B.right + cell);
      const p = parkEnvelope({ left: (B.left - W.left) * k, top: (B.top - W.top) * k, width: B.width * k, height: B.height * k }, (vh - B.bottom) * k, cell * k, (vw - B.right) * k);
      env.classList.toggle('side', p.mode === 'side');
      Object.assign(env.style, { left: p.left + 'px', top: p.top + 'px', width: p.width + 'px', height: p.height + 'px' });
      env.style.setProperty('--ecell', (cell * k).toFixed(1) + 'px');
      return p;
    } catch (e) { return null; }
  }

  function remove() {
    token++;
    if (offResize) { offResize(); offResize = null; }
    if (env) { env.remove(); env = null; }
    sealEl = null; plate = null; revealEl = null;
  }

  function ensure(ctx) {
    if (env || !ctx.wrap) return env;
    env = h('div', 'l-env');
    env.innerHTML = envelopeSvg() + `<div class="l-env-plate"><b>${esc(tx(t, 'layers.envelope', 'ORDERS'))}</b><span></span></div>`;
    plate = env.querySelector('.l-env-plate span');
    ctx.wrap.appendChild(env);
    lastCtx = ctx;
    park(ctx);
    if (typeof window !== 'undefined') {
      const onR = () => park(lastCtx);
      window.addEventListener('resize', onR);
      offResize = () => window.removeEventListener('resize', onR);
    }
    // slides up from under the frame lip (never across the cells)
    anim(ctx, env, [{ transform: 'translate(0,70%) rotate(-14deg)', opacity: 0 }, { transform: 'translate(0,0) rotate(-6deg)', opacity: 1 }], { duration: 333, easing: 'steps(4,end)' });
    return env;
  }

  function newSpin(ctx) {
    bank.reset();
    if (!env) ensure(ctx);
    if (!env) return;
    lastCtx = ctx;
    env.classList.remove('open', 'forward');
    env.style.transform = '';
    park(ctx);
    const slips = env.querySelector('.l-env-slips'); if (slips) slips.innerHTML = '';
    if (sealEl) { sealEl.remove(); sealEl = null; }
    if (revealEl) { revealEl.remove(); revealEl = null; }
    if (plate) plate.textContent = '';
  }

  function stampOn(ctx, text, kind) {
    if (!env) return null;
    if (sealEl) sealEl.remove();
    sealEl = h('div', 'l-env-stamp ' + kind, stampSvg(text, kind === 'opened' ? 'teal' : 'coral', { rot: kind === 'opened' ? 8 : -10 }));
    env.appendChild(sealEl);
    play(ctx, 'stamp', { vol: 0.7, pitch: kind === 'opened' ? 1.05 : 0.95 });
    anim(ctx, sealEl, [{ transform: 'scale(2.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 125, easing: 'steps(2,end)' });
    return sealEl;
  }

  function fileSlip(ev, ctx) {
    const amt = bank.file(ev);
    if (!amt) return null;
    ensure(ctx);
    if (!env) return null;
    L.log.push({ t: 'file', amt, bank: bank.bank });
    const g = env.querySelector('.l-env-slips');
    if (g) {
      const tmp = document.createElementNS(SVGNS, 'g');
      tmp.innerHTML = slipSvg(bank.slips - 1);
      const slip = tmp.firstElementChild;
      if (slip) {
        g.appendChild(slip);
        if (g.childNodes.length > 5) g.removeChild(g.firstChild);
        if (!isStill(ctx)) anim(ctx, slip, [{ transform: 'translateY(-46px)', opacity: 0 }, { transform: 'translateY(-18px)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, easing: 'steps(4,end)' });
      }
    }
    park(ctx);
    setPlate(tx(t, 'layers.bank', `FILED ${money(ctx, bank.bank)}`, { x: money(ctx, bank.bank) }), money(ctx, bank.bank));
    slipTag(ctx, amt);
    if (bank.slips === 1) { play(ctx, 'caseSeal'); stampOn(ctx, tx(t, 'layers.sealed', 'SEALED'), 'sealed'); }
    else if (!isCalm(ctx) && env) anim(ctx, env, [{ transform: 'rotate(-6deg) translateY(-3px)' }, { transform: 'rotate(-6deg)' }], { duration: 167, easing: 'steps(2,end)' });
    return null;
  }

  // I5: a small steel paper tag "+<amount>" drops into the envelope with each banked slip (neutral, never the word WIN, never gold)
  function slipTag(ctx, amt) {
    if (!env || isStill(ctx)) return;
    const tag = h('div', 'l-env-tag');
    tag.textContent = tx(t, 'layers.slip', `+${money(ctx, amt)}`, { x: money(ctx, amt) });
    env.appendChild(tag);
    const frames = isCalm(ctx)
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }]
      : [{ transform: 'translate(-50%,-150%) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%,-110%) rotate(4deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%,-60%) rotate(-3deg)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,10%) scale(.5)', opacity: 0 }];
    anim(ctx, tag, frames, { duration: 500, easing: 'steps(6,end)' }).then(() => tag.remove());
  }

  async function open(ev, ctx) {
    ensure(ctx);
    if (!env) return;
    const my = token;
    const ok = alive(my);
    const b = Number(ev.bank) || bank.bank, m = Number(ev.mult) || 1, x = Number(ev.win) || b * m;
    // the spin result against its share of the round cost (C / totalFs, 1/100 x of the play amount as in the book): the cue is win-like
    // only above that share, the heroine points at the board and gives a small win only when ratio > 1 (WP123_to_WP6 items 1, 2)
    const share = (Number(ctx.cost) || 1) * 100 / Math.max(1, (ctx.mission && Number(ctx.mission.totalFs)) || 1);
    const win = Number(ev.win) || 0;
    L.log.push({ t: 'open', bank: b, mult: m, win: x, capped: !!ev.capped, filed: bank.bank, costShare: share, ratio: win / share });
    play(ctx, 'caseOpen', { win, costShare: share });
    const hero = heroine(ctx);
    if (hero && typeof hero.react === 'function') { try { hero.react('caseOpen', { ratio: win / share }); } catch (e) { /* ignore */ } }
    // come forward to the middle of the board (Calm / Still: no travel, the envelope opens in place)
    if (!isCalm(ctx) && ctx.wrap) {
      try {
        const W = ctx.wrap.getBoundingClientRect(), E = env.getBoundingClientRect();
        const dx = W.left + W.width / 2 - (E.left + E.width / 2), dy = W.top + W.height * 0.42 - (E.top + E.height / 2);
        // about 1.9 cells wide in the middle of the board, whatever size the parked envelope has
        const sc = Math.max(1.2, Math.min(4, (W.width / 6.3) * 1.9 / Math.max(1, E.width)));
        env.style.setProperty('--es', sc.toFixed(3));
        env.classList.add('forward');
        await anim(ctx, env, [{ transform: 'translate(0,0) rotate(-6deg) scale(1)' }, { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(${sc})` }], { duration: 250, easing: 'steps(3,end)' });
      } catch (e) { /* ignore */ }
    }
    if (!ok()) return;
    env.classList.add('open');
    const flap = env.querySelector('.l-env-flap');
    if (flap) await anim(ctx, flap, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.05)', offset: 0.5 }, { transform: 'scaleY(-1)' }], { duration: 250, easing: 'steps(3,end)' });
    if (!ok()) return;
    stampOn(ctx, tx(t, 'layers.opened', 'OPENED'), 'opened');
    revealEl = h('div', 'l-env-reveal');
    const line = tx(t, 'layers.reveal', `${money(ctx, b)} x${m} = ${money(ctx, x)}`, { bank: money(ctx, b), dial: m, x: money(ctx, x) });
    revealEl.textContent = line;
    env.appendChild(revealEl);
    await anim(ctx, revealEl, [{ transform: 'translate(-50%,30%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 167, easing: 'steps(2,end)' });
    await wait(ctx, 600, ok);
    if (!ok()) return;
    // back to its place under the board, still open, until the next spin; the plate beside it keeps the line (bank x dial = result)
    if (revealEl) { revealEl.remove(); revealEl = null; }
    setPlate(line, '= ' + money(ctx, x));
    if (env.classList.contains('forward')) {
      env.classList.remove('forward');
      env.style.transform = '';
    }
    park(ctx);
  }

  L.onEvent = (ev, ctx) => {
    if (!ev || !ctx) return null;
    switch (ev.type) {
      case 'missionAssigned': active = ev.mission === 'orders' || ev.payTiming === 'spinEnd'; if (!active) remove(); return null;
      case 'reveal': if (active && ev.gameType === 'freegame') newSpin(ctx); return null;
      case 'winInfo': return active ? fileSlip(ev, ctx) : null;
      case 'caseOpen': active = true; return open(ev, ctx);
      case 'freeSpinEnd': case 'finalWin': active = false; remove(); return null;
      default: return null;
    }
  };
  L.reset = () => { active = false; bank.reset(); remove(); };
  L.state = () => ({ active, bank: bank.bank, slips: bank.slips, shown: !!env });
  return L;
}
