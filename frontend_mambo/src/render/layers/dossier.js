// Agent Mambo v2 layer DOSSIER CUTSCENE + COSTUME SCREEN + ENTRANCE TRANSITION (WP6), SYNTHESIS 5 #13 (J17).
//   missionAssigned (or, in a book without one, the first event after freeSpinTrigger: v1 / `bonus` books play The Briefing):
//   1. a door book (ctx.cost > 1): the door of the mission (Stage Door / Coat Check / Service Stairs) fills the board, its keyhole
//      irises open (<= 1.0 s, cue doorCreak; Rule P: <= 1.2 s)
//   2. the dossier: folder arcs in (417 ms), TOP SECRET stamp (125 ms + hit-stop 100 ms), the cover opens on the mission sheet:
//      MISSION: <name>, one line of rules, the spins; held to about 3.0 s in all (2.6-3.4 s); tap / click / Enter / Space / Escape
//      skips, but only after 1.2 s (Rule P)
//   3. while the cover is open the heroine changes costume behind a folding screen: the rig's own outfitChange clip (screen + poof)
//      through react('outfit'); when the rig is not there, this layer draws the screen over #heroine-slot and swaps the outfit under it
//   back to the base outfit (inspectrice) at the end of the feature: the heroine's `end` reaction does it; this layer checks it again
//   at finalWin. Still: every element is shown in its end state (no travel), the round keeps its length.
import { missionKey, OUTFIT_OF, BASE_OUTFIT, DOOR_OF } from './logic.js';
import { dossierSvg, missionIcon, stampSvg, doorSvg, keyholePath, P } from './art.js';
import { t } from '../../i18n/index.js';
import { h, anim, wait, isStill, isCalm, play, tx, esc, heroine, rectIn, Tm, skipping } from './util.js';

export const SKIP_AFTER_MS = 1200;
export const DOSSIER_MS = 3000;

export function createDossier() {
  let pending = false, shown = false, cut = null, screen = null, token = 0, offKeys = null;
  const L = { id: 'dossier', log: [] };

  function clear() {
    token++;
    if (offKeys) { offKeys(); offKeys = null; }
    if (cut) { cut.remove(); cut = null; }
    if (screen) { screen.remove(); screen = null; }
  }

  function overlay(ctx) {
    const host = ctx.app || (ctx.wrap && ctx.wrap.parentNode);
    if (!host) return null;
    const el = h('div', 'l-cut');
    const r = ctx.wrap ? rectIn(ctx.wrap, host) : null;
    if (r && r.w > 0) { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; }
    else { el.style.inset = '0'; }
    host.appendChild(el);
    return el;
  }

  // ---- 1. the door and the keyhole iris ----
  async function door(ctx, m, alive) {
    if (!cut) return;
    const label = tx(t, 'layers.door.' + DOOR_OF[m], { stage: 'STAGE DOOR', coat: 'COAT CHECK', stairs: 'SERVICE STAIRS' }[DOOR_OF[m]]);
    const col = { briefing: P.aubergine, orders: P.tealDk, blackout: P.indigo }[m] || P.aubergine;
    const d = h('div', 'l-door', doorSvg(label, col) + `<svg class="l-iris" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path class="l-iris-mask" fill-rule="evenodd" d="M-500 -500H500V500H-500Z ${scaledKeyhole(8)}"/></svg>`);
    d.dataset.door = DOOR_OF[m];
    cut.appendChild(d);
    const dur = 900;
    play(ctx, 'doorCreak', { dur: Math.min(1.1, Math.max(0.3, Tm(ctx, dur) / 1000)) });
    L.log.push({ t: 'door', m });
    if (isStill(ctx)) { await wait(ctx, 400, alive); d.remove(); return; }
    await anim(ctx, d, [{ opacity: 0 }, { opacity: 1 }], { duration: 167, easing: 'steps(2,end)' });
    if (!alive()) return;
    // the keyhole iris: the door panel goes, an ink sheet with a growing keyhole hole is left, then that goes too
    const svg = d.querySelector('.l-door-svg'); if (svg) svg.style.visibility = 'hidden';
    const iris = d.querySelector('.l-iris'); if (iris) iris.style.visibility = 'visible';
    const mask = d.querySelector('.l-iris-mask');
    const steps = isCalm(ctx) ? 3 : 8, per = Tm(ctx, 600) / steps;
    for (let i = 1; i <= steps && alive(); i++) {
      mask.setAttribute('d', `M-500 -500H500V500H-500Z ${scaledKeyhole(8 + (i / steps) ** 2 * 140)}`);
      await new Promise((r) => setTimeout(r, per));
    }
    d.remove();
  }
  const scaledKeyhole = (s) => keyholePath(Math.max(0.01, s));

  // ---- 3. the costume change ----
  function costume(ctx, m) {
    const outfit = OUTFIT_OF[m] || OUTFIT_OF.briefing;
    const hero = heroine(ctx);
    let ok = false;
    try { ok = !!(hero && typeof hero.react === 'function' && hero.react('outfit', { outfit, mission: m })); } catch (e) { ok = false; }
    L.log.push({ t: 'costume', outfit, rig: ok });
    if (ok) return;
    // the rig is not there (static picture / v1 character / still loading): our own folding screen over the heroine box
    const slot = typeof document !== 'undefined' ? document.getElementById('heroine-slot') : null;
    const host = ctx.app;
    if (!slot || slot.hidden || !host) return;
    const r = rectIn(slot, host);
    if (!r || r.w < 20 || r.h < 20) return;
    if (screen) screen.remove();
    screen = h('div', 'l-screen', screenSvg());
    Object.assign(screen.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    host.appendChild(screen);
    const my = token;
    const el = screen;
    (async () => {
      await anim(ctx, el, [{ transform: 'translateX(-60%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 333, easing: 'steps(4,end)' });
      try { if (hero && typeof hero.setOutfit === 'function') hero.setOutfit(outfit, { animated: false }); } catch (e) { /* ignore */ }
      el.classList.add('poof');
      await wait(ctx, 600, () => my === token);
      await anim(ctx, el, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(60%)', opacity: 0 }], { duration: 333, easing: 'steps(4,end)' });
      el.remove(); if (screen === el) screen = null;
    })();
  }

  // ---- 2. the dossier ----
  async function cutscene(ev, ctx) {
    const m = missionKey(ev && ev.mission);
    clear();
    shown = true;
    const my = token;
    const alive = () => my === token;
    const t0 = Date.now();
    setMission(m);
    cut = overlay(ctx);
    if (!cut) { costume(ctx, m); return; }
    cut.dataset.mission = m;
    L.log.push({ t: 'cut', m, cost: ctx.cost });
    if (Number(ctx.cost) > 1) await door(ctx, m, alive);
    if (!alive()) return;
    const name = tx(t, 'layers.mission.' + m, { briefing: 'MISSION: THE BRIEFING', orders: 'MISSION: SEALED ORDERS', blackout: 'MISSION: BALLROOM BLACKOUT' }[m]);
    const brief = tx(t, 'layers.brief.' + m, '');
    const n = Number(ev && ev.totalFs) || 0;
    const fol = h('div', 'l-dos ' + m, dossierSvg(missionIcon(m))
      + `<div class="l-dos-text"><b class="l-dos-name">${esc(name)}</b><span class="l-dos-brief">${esc(brief)}</span>${n ? `<i class="l-dos-n">${esc(tx(t, 'layers.spins', `${n} FREE SPINS`, { n }))}</i>` : ''}</div>`
      + `<div class="l-dos-stamp">${stampSvg(tx(t, 'layers.topSecret', 'TOP SECRET'), 'coral', { rot: -9, tall: true })}</div>`
      + `<div class="l-dos-skip">${esc(tx(t, 'layers.continue', 'TAP TO CONTINUE'))}</div>`);
    cut.appendChild(fol);
    const tDos = Date.now(); // Rule P: the 1.2 s count starts when the dossier is on screen (the door before it is never skippable)
    const still = isStill(ctx);
    // skip: only after 1.2 s of real time (Rule P), never by a key the shell needs for something else while the cutscene is up
    let skipped = false;
    const onSkip = (e) => {
      if (Date.now() - tDos < SKIP_AFTER_MS) return;
      if (e && e.type === 'keydown' && !['Enter', ' ', 'Spacebar', 'Escape'].includes(e.key)) return;
      skipped = true; L.log.push({ t: 'skip', at: Date.now() - tDos });
      try { if (e && e.type === 'keydown') { e.preventDefault(); e.stopPropagation(); } } catch (x) { /* ignore */ }
    };
    cut.addEventListener('pointerdown', onSkip);
    window.addEventListener('keydown', onSkip, true);
    offKeys = () => { try { cut && cut.removeEventListener('pointerdown', onSkip); window.removeEventListener('keydown', onSkip, true); } catch (e) { /* ignore */ } };
    const live = () => alive() && !skipped;
    const skipAt = setTimeout(() => { if (alive()) fol.classList.add('can-skip'); }, SKIP_AFTER_MS);
    if (still) {
      fol.classList.add('open', 'stamped');
      costume(ctx, m);
    } else {
      // arc in: from below left, 5 held drawings over 417 ms
      await anim(ctx, fol, [
        { transform: 'translate(-60%,70%) rotate(-24deg) scale(.6)', opacity: 0 },
        { transform: 'translate(-20%,-12%) rotate(-8deg) scale(.95)', opacity: 1, offset: 0.6 },
        { transform: 'translate(0,0) rotate(-3deg) scale(1)', opacity: 1 },
      ], { duration: 417, easing: 'steps(5,end)' });
      if (!live()) return finish();
      // the TOP SECRET stamp + hit-stop
      fol.classList.add('stamped');
      const st = fol.querySelector('.l-dos-stamp');
      play(ctx, 'stamp', { vol: 0.9, pitch: 0.9 });
      await anim(ctx, st, [{ transform: 'scale(2.4) rotate(-14deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], { duration: 125, easing: 'steps(2,end)' });
      try { if (ctx.camera && ctx.motion && ctx.motion.hitStop && !skipping(ctx)) await ctx.camera.freeze(Tm(ctx, 100)); else await wait(ctx, 100, live); } catch (e) { /* ignore */ }
      if (!live()) return finish();
      await wait(ctx, 280, live);
      if (!live()) return finish();
      // the cover opens (hinge on the left: scaleX 1 -> -1 in 3 held drawings), the costume change starts
      const cover = fol.querySelector('.l-dos-cover');
      costume(ctx, m);
      play(ctx, 'stamp', { vol: 0.35, pitch: 1.2 });
      fol.classList.add('opening');
      await anim(ctx, cover, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(.1)', offset: 0.5 }, { transform: 'scaleX(-.04)' }], { duration: 250, easing: 'steps(3,end)' });
      fol.classList.add('open');
    }
    // hold until about DOSSIER_MS in all (the door, when there is one, is on top of that)
    const rest = Math.max(0, Tm(ctx, DOSSIER_MS) - (Date.now() - tDos) - Tm(ctx, 200));
    await waitOrSkip(rest, live);
    clearTimeout(skipAt);
    return finish();

    async function finish() {
      if (!alive()) return;
      if (offKeys) { offKeys(); offKeys = null; }
      if (!isStill(ctx) && cut) await anim(ctx, fol, [{ transform: 'translate(0,0) rotate(-3deg)', opacity: 1 }, { transform: 'translate(40%,-90%) rotate(12deg)', opacity: 0 }], { duration: 200, easing: 'steps(3,end)' });
      if (!alive()) return;
      if (cut) { cut.remove(); cut = null; }
      L.log.push({ t: 'cutEnd', ms: Date.now() - t0, skipped });
    }
  }

  function waitOrSkip(ms, live) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((r) => {
      const t1 = Date.now();
      const tick = () => { if (!live() || Date.now() - t1 >= ms) r(); else setTimeout(tick, 40); };
      setTimeout(tick, Math.min(40, ms));
    });
  }

  function backToBase(ctx) {
    const hero = heroine(ctx);
    try {
      const impl = hero && hero.impl;
      const rig = impl && typeof impl.rig === 'function' ? impl.rig() : null;
      const cur = rig ? rig.outfit : null;
      if (cur && cur !== BASE_OUTFIT && typeof hero.setOutfit === 'function') { hero.setOutfit(BASE_OUTFIT); L.log.push({ t: 'base', from: cur }); }
    } catch (e) { /* ignore */ }
  }

  // <html data-mission="briefing|orders|blackout"> while a feature plays: the per-mission palette tokens of the scene (WP5 scene.js,
  // request WP6_to_WP5) key on it, like the motion tokens key on data-motion. Removed at the end of the feature and on reset.
  function setMission(m) {
    try {
      const de = typeof document !== 'undefined' ? document.documentElement : null;
      if (!de) return;
      if (m) de.dataset.mission = m; else delete de.dataset.mission;
    } catch (e) { /* ignore */ }
  }

  L.onEvent = (ev, ctx) => {
    if (!ev || !ctx) return null;
    if (ev.type === 'freeSpinEnd') { setMission(null); return null; }
    if (ev.type === 'freeSpinTrigger') { if (!shown) pending = true; return null; }
    if (ev.type === 'missionAssigned') { pending = false; return cutscene(ev, ctx); }
    if (pending) { pending = false; return cutscene({ mission: 'briefing', totalFs: null }, ctx); }
    if (ev.type === 'finalWin') { if (shown) { const my = token; setTimeout(() => { if (my === token || !shown) backToBase(ctx); }, Tm(ctx, 3200)); } return null; }
    return null;
  };
  L.reset = () => { pending = false; shown = false; clear(); setMission(null); };
  return L;
}

/** the folding screen for the fallback costume change (three hinged panels, plum and lilac, brass trim, poof cloud) */
function screenSvg() {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const x = i * 40, top = i % 2 ? 14 : 6;
    s += `<path d="M${x} ${top}L${x + 40} ${top + (i % 2 ? -6 : 6)}V196H${x}Z" fill="${i % 2 ? P.lilac : P.aubergine}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`
      + `<path d="M${x + 6} ${top + 14}H${x + 34}" stroke="${P.brass}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="-4 -4 128 206" preserveAspectRatio="xMidYMax meet" width="100%" height="100%" aria-hidden="true">${s}</svg>
    <svg class="l-poof" viewBox="-30 -30 60 60" aria-hidden="true"><path d="M-18 6a10 10 0 0 1 4-18a12 12 0 0 1 20-4a10 10 0 0 1 14 10a9 9 0 0 1-6 16H-12a8 8 0 0 1-6-4Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="3"/></svg>`;
}
