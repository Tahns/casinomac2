// Agent Mambo v2 layer SEALED ORDERS ENVELOPE (WP6). Mission `orders` (payTiming spinEnd, WP8_to_FRONT 3):
//   - a manila envelope sits on the top-left corner of the board frame, next to the Clearance Dial badge, for the whole feature
//   - every banked winInfo (meta.banked) slides a slip into it: neutral steel / lilac paper, never gold, never the word WIN; the plate
//     on the envelope reads FILED <bank>; the SEALED stamp lands with the first slip of a spin (cue caseSeal)
//   - caseOpen: the envelope comes forward, the flap opens, OPENED replaces SEALED and the plate shows bank x dial = result
//     (cue caseOpen, neutral; the win sound and the WIN counter are the player's, on the setWin that follows). The layer holds the
//     book for that beat (about 1 s, ctx.T) so the reveal is seen BEFORE the WIN counter moves.
//   - this layer never writes the WIN counter and never calls a celebration.
import { createBank, fmtX } from './logic.js';
import { envelopeSvg, slipSvg, stampSvg } from './art.js';
import { t } from '../../i18n/index.js';
import { h, anim, wait, isStill, isCalm, play, tx, esc, SVGNS } from './util.js';

export function createOrders() {
  const bank = createBank();
  let active = false, env = null, sealEl = null, plate = null, revealEl = null, token = 0;
  const L = { id: 'orders', log: [] };
  const alive = (my) => () => my === token;

  function remove() {
    token++;
    if (env) { env.remove(); env = null; }
    sealEl = null; plate = null; revealEl = null;
  }

  function ensure(ctx) {
    if (env || !ctx.wrap) return env;
    env = h('div', 'l-env');
    env.innerHTML = envelopeSvg() + `<div class="l-env-plate"><b>${esc(tx(t, 'layers.envelope', 'ORDERS'))}</b><span></span></div>`;
    plate = env.querySelector('.l-env-plate span');
    ctx.wrap.appendChild(env);
    anim(ctx, env, [{ transform: 'translate(-30%,-40%) rotate(-20deg)', opacity: 0 }, { transform: 'translate(0,0) rotate(-6deg)', opacity: 1 }], { duration: 333, easing: 'steps(4,end)' });
    return env;
  }

  function newSpin(ctx) {
    bank.reset();
    if (!env) ensure(ctx);
    if (!env) return;
    env.classList.remove('open', 'forward');
    env.style.transform = '';
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
    if (plate) plate.textContent = tx(t, 'layers.bank', `FILED ${fmtX(bank.bank)}`, { x: fmtX(bank.bank) });
    if (bank.slips === 1) { play(ctx, 'caseSeal'); stampOn(ctx, tx(t, 'layers.sealed', 'SEALED'), 'sealed'); }
    else if (!isCalm(ctx) && env) anim(ctx, env, [{ transform: 'rotate(-6deg) translateY(-3px)' }, { transform: 'rotate(-6deg)' }], { duration: 167, easing: 'steps(2,end)' });
    return null;
  }

  async function open(ev, ctx) {
    ensure(ctx);
    if (!env) return;
    const my = token;
    const ok = alive(my);
    const b = Number(ev.bank) || bank.bank, m = Number(ev.mult) || 1, x = Number(ev.win) || b * m;
    L.log.push({ t: 'open', bank: b, mult: m, win: x, capped: !!ev.capped, filed: bank.bank });
    play(ctx, 'caseOpen');
    // come forward to the middle of the board (Calm / Still: no travel, the envelope opens in place)
    if (!isCalm(ctx) && ctx.wrap) {
      try {
        const W = ctx.wrap.getBoundingClientRect(), E = env.getBoundingClientRect();
        const dx = W.left + W.width / 2 - (E.left + E.width / 2), dy = W.top + W.height * 0.42 - (E.top + E.height / 2);
        env.classList.add('forward');
        await anim(ctx, env, [{ transform: 'translate(0,0) rotate(-6deg) scale(1)' }, { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(1.9)` }], { duration: 250, easing: 'steps(3,end)' });
      } catch (e) { /* ignore */ }
    }
    if (!ok()) return;
    env.classList.add('open');
    const flap = env.querySelector('.l-env-flap');
    if (flap) await anim(ctx, flap, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.05)', offset: 0.5 }, { transform: 'scaleY(-1)' }], { duration: 250, easing: 'steps(3,end)' });
    if (!ok()) return;
    stampOn(ctx, tx(t, 'layers.opened', 'OPENED'), 'opened');
    revealEl = h('div', 'l-env-reveal');
    revealEl.textContent = tx(t, 'layers.reveal', `${fmtX(b)} x${m} = ${fmtX(x)}`, { bank: fmtX(b), dial: m, x: fmtX(x) });
    env.appendChild(revealEl);
    await anim(ctx, revealEl, [{ transform: 'translate(-50%,30%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 167, easing: 'steps(2,end)' });
    await wait(ctx, 600, ok);
    if (!ok()) return;
    // back to its corner, still open, until the next spin
    if (env.classList.contains('forward')) {
      env.classList.remove('forward');
      await anim(ctx, env, [{ opacity: 1 }, { opacity: 1 }], { duration: 0 });
      env.style.transform = '';
    }
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
