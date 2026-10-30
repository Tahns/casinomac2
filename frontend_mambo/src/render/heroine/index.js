// Heroine (WP3): integration of the hand-drawn vector rig behind the v1 createMascot API (src/render/mascot.js is the public face).
//
//   const m = await createHeroineMascot(hostEl, opts)  ->  { el, mode(), setPose, getPose, say, hideSay, react, setCrop, setOutfit, destroy, ... }
//
// Layers, from the inside out: the rig (mambo_rig.js, synced from docs/research2/art by tools/sync_heroine.mjs) -> the director
// (reactions, whitelist, motion levels) -> this file (DOM: stage, speech bubble, layout event, settings, visibility). If the rig
// cannot load or throws, a static picture of the same heroine (fallback_art.js) is drawn instead; if even that fails, createHeroineMascot
// rejects and mascot.js falls back to the v1 character. No module of the animated path is imported statically here, so a failure of
// any of them is caught here.
import { createGaze } from './gaze.js';
import { bubbleWidth, placeBubble } from './bubble.js';

export const SLOT_ID = 'heroine-slot';
// crop windows; identical to CROPS in mambo_rig.js (a test compares them) so the static fallback can crop without the rig
export const CROP_VB = Object.freeze({ full: [60, 30, 280, 556], bust: [86, 24, 226, 322], head: [96, 60, 160, 176] });

const MOTIONS = ['full', 'calm', 'still'];
// how fast a jump may start per crop (rig units/s, peak = v^2 / 4800 art units): the full figure has 18% headroom above its box, the crops have none
const JUMP_MAX_BY_CROP = Object.freeze({ full: 700, bust: 250, head: 0 });

export async function createHeroineMascot(host, opts = {}) {
  const doc = host.ownerDocument || document;
  const win = doc.defaultView || window;
  const slotMode = host.id === SLOT_ID;
  const app = doc.getElementById('app') || doc.body;

  // ---- modules of the animated path (any failure -> static picture)
  let rigMod = null, dirMod = null, clipsMod = null, loadErr = null;
  try { rigMod = await (opts.loadRig ? opts.loadRig() : import('./mambo_rig.js')); dirMod = await import('./director.js'); clipsMod = await import('./clips.js'); } catch (e) { loadErr = e; }
  let settings = opts.settings;
  if (settings === undefined) { try { settings = (await import('../../settings.js')).settings; } catch (e) { settings = null; } }

  const osReduced = () => { try { return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  // Motion level of the heroine. The settings store resolves Auto + an OS "reduce motion" request to Calm; for the figure that is still too much
  // (springs, breathing, saccades), so Auto + OS reduced = Still (static poses). An explicit Calm / Full / Still choice is taken as it is.
  const qualityCalm = () => { try { return !!(doc.documentElement && doc.documentElement.getAttribute('data-quality') === 'calm'); } catch (e) { return false; } };
  const getMotion = () => {
    try {
      const m = settings && settings.get('motionLevel');
      if (MOTIONS.includes(m)) {
        if (m === 'calm' && settings.get('motion') === 'auto') return 'still';
        // the quality governor (render/quality.js, html[data-quality=calm] when the frame EMA is over 40 ms) turns Full into Calm (WP5_to_WP3)
        if (m === 'full' && qualityCalm()) return 'calm';
        return m;
      }
    } catch (e) { /* ignore */ }
    return opts.reduced || osReduced() ? 'still' : 'full';
  };

  // ---- DOM: slot mode (CSS sized by the shell) or a free-standing figure (loading screen, dev pages)
  let currentCrop = CROP_VB[opts.crop] ? opts.crop : (slotMode && CROP_VB[host.dataset.crop] ? host.dataset.crop : 'full');
  const stage = doc.createElement('div');
  stage.className = 'heroine-stage';
  if (opts.rim) stage.dataset.rim = '';       // cream die-cut rim (4 hard drop-shadows), off by default
  let wrap = stage;
  const fit = () => {
    if (slotMode) return;
    const vb = CROP_VB[currentCrop], h = Math.max(40, opts.size || 240);
    wrap.style.height = h + 'px'; wrap.style.aspectRatio = `${vb[2]} / ${vb[3]}`;
  };
  if (!slotMode) { wrap = doc.createElement('div'); wrap.className = 'heroine-wrap'; wrap.appendChild(stage); fit(); }

  let rig = null, director = null, mode = 'rig', destroyed = false, failing = false, layoutPaused = false;
  const gaze = createGaze({
    doc, mirrored: () => false,
    getBox: () => { const s = stage.firstElementChild; return s && s.getBoundingClientRect ? s.getBoundingClientRect() : null; },
    getViewBox: () => CROP_VB[currentCrop],
  });

  // ---- static picture (the fallback)
  async function drawStatic() {
    let art = null;
    try { const m = await (opts.loadFallback ? opts.loadFallback() : import('./fallback_art.js')); art = m && (m.FALLBACK_SVG || m.default); } catch (e) { art = null; }
    if (!art || destroyed) return !!(art && destroyed);
    try { if (rig) rig.destroy(); } catch (e) { /* ignore */ }
    stage.innerHTML = art;
    const svg = stage.firstElementChild;
    if (svg && svg.setAttribute) { svg.setAttribute('viewBox', CROP_VB[currentCrop].join(' ')); svg.setAttribute('preserveAspectRatio', 'xMidYMax meet'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Agent Mambo heroine'); svg.style.display = 'block'; svg.style.overflow = currentCrop === 'full' ? 'visible' : 'hidden'; }
    stage.dataset.heroine = 'static';
    return true;
  }
  function fail(err) {
    if (failing || destroyed) return;
    failing = true; mode = 'static';
    try { console.error('heroine: the rig failed, drawing the static picture', err); } catch (e) { /* ignore */ }
    if (director) { try { director.destroy(); } catch (e) { /* ignore */ } }
    drawStatic().then((ok) => { if (!ok && !destroyed) { mode = 'gone'; stage.remove(); if (opts.onGiveUp) opts.onGiveUp(); } });
  }

  // ---- rig
  const halftone = (() => {
    if (opts.halftone !== undefined) return !!opts.halftone;
    const nav = win.navigator || {};
    let contrast = false; try { contrast = !!(settings && settings.get('contrastOn')); } catch (e) { /* ignore */ }
    return !(contrast || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) || (nav.deviceMemory && nav.deviceMemory <= 2));
  })();
  host.appendChild(wrap);
  if (rigMod && dirMod && clipsMod) {
    try {
      // the rig's own idle director picks gags from its clip table: hairFlip is replaced by a harmless weight shift
      const alias = clipsMod.buildClip('shiftWeight', { windUp: false });
      rig = rigMod.createHeroine(stage, {
        outfit: opts.outfit || clipsMod.BASE_OUTFIT, crop: currentCrop, mirror: false, seed: opts.seed ?? 7, reduced: getMotion() === 'still', followOs: false,
        halftone, lookTargets: gaze.targets, onCue: opts.onCue || null, clips: { hairFlip: alias }, onError: (e) => fail(e),
      });
      stage.dataset.heroine = 'rig';
      director = dirMod.createDirector({
        rig, getMotion, onFail: (e) => fail(e), onInfo: (info) => { if (info && info.at) gaze.setCluster(info.at); },
        getJumpMax: () => JUMP_MAX_BY_CROP[currentCrop],
      });
      director.setMotion(getMotion());
      try { rig.setLook('grid'); } catch (e) { fail(e); }
    } catch (e) { loadErr = e; rig = null; director = null; stage.innerHTML = ''; }
  }
  if (!rig) {
    mode = 'static'; failing = true;
    try { console.error('heroine: the rig is not available, drawing the static picture', loadErr); } catch (e) { /* ignore */ }
    if (!(await drawStatic())) { wrap.remove(); throw loadErr || new Error('heroine: no rig and no static picture'); }
  }

  // ---- speech bubble (outside the slot: the slot clips it) ----
  const bubHost = slotMode ? app : doc.body;
  const bub = doc.createElement('div');
  bub.className = 'hero-bubble' + (slotMode ? '' : ' hero-bubble-fixed');
  bub.setAttribute('aria-hidden', 'true'); bub.hidden = true;
  bubHost.appendChild(bub);
  let bubTimer = 0;
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
  function hideSay() { clearTimeout(bubTimer); bub.hidden = true; }
  function say(text, ms = 2200) {
    if (destroyed) return;
    clearTimeout(bubTimer);
    bub.textContent = String(text == null ? '' : text);
    if (!bub.textContent) { bub.hidden = true; return; }
    try {
      const slot = rectOf(slotMode ? host : wrap);
      const frame = slotMode ? rectOf(app) : { left: 0, top: 0, width: win.innerWidth, height: win.innerHeight };
      bub.hidden = false; bub.style.width = bubbleWidth(slot) + 'px';
      const pos = placeBubble(slot, frame, { h: bub.offsetHeight });
      if (!pos) { bub.hidden = true; return; }
      bub.style.left = pos.left + 'px'; bub.style.top = pos.top + 'px'; bub.style.setProperty('--tail-x', pos.tailX + 'px');
      bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
      if (ms > 0) bubTimer = setTimeout(hideSay, ms);
    } catch (e) { bub.hidden = true; }
  }

  // ---- crop (the shell publishes the crop of the box; free-standing figures take opts.crop) ----
  function setCrop(name) {
    if (!CROP_VB[name] || name === currentCrop) return;
    currentCrop = name; fit();
    if (rig && mode === 'rig') { try { rig.setCrop(name); } catch (e) { fail(e); } }
    else { const svg = stage.firstElementChild; if (svg && svg.setAttribute) { svg.setAttribute('viewBox', CROP_VB[name].join(' ')); svg.style.overflow = name === 'full' ? 'visible' : 'hidden'; } }
  }
  const applyPause = () => { if (rig && mode === 'rig') { try { if (layoutPaused) rig.pause(); else if (!doc.hidden) rig.resume(); } catch (e) { fail(e); } } };
  const onLayout = (e) => { const d = (e && e.detail) || {}; if (d.crop) setCrop(d.crop); layoutPaused = d.mode === 'none'; applyPause(); };
  const onVisible = () => { if (layoutPaused) applyPause(); };
  const offs = [];
  if (slotMode) {
    host.addEventListener('am:heroine-layout', onLayout); offs.push(() => host.removeEventListener('am:heroine-layout', onLayout));
    if (CROP_VB[host.dataset.crop]) setCrop(host.dataset.crop);
  }
  doc.addEventListener('visibilitychange', onVisible); offs.push(() => doc.removeEventListener('visibilitychange', onVisible));
  // follow html[data-quality] live (Calm while the page struggles, back to the stored level after)
  try {
    const MO = win.MutationObserver;
    if (MO && doc.documentElement) { const mo = new MO(() => { if (director) director.setMotion(getMotion()); }); mo.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-quality'] }); offs.push(() => mo.disconnect()); }
  } catch (e) { /* ignore */ }
  if (settings && typeof settings.on === 'function') {
    for (const key of ['motionLevel', 'motion']) {
      try { const off = settings.on(key, () => { if (director) director.setMotion(getMotion()); }); if (typeof off === 'function') offs.push(off); } catch (e) { /* ignore */ }
    }
  }

  const impl = {
    el: wrap, mode: () => mode, rig: () => rig, director: () => director, gaze,
    setPose: (name) => (director ? director.setPose(name) : (name || 'idle')),
    getPose: () => (director ? director.getPose() : 'idle'),
    say, hideSay, setCrop,
    react: (kind, info) => (director && mode === 'rig' ? director.react(kind, info) : false),
    // setOutfit(key, { hidden: true }) (= { animated: false }): an instant swap, for a caller that draws its own screen over the slot (WP6 costume
    // layer); without it the heroine plays her own folding-screen change. Returns true when the swap happened or started.
    setOutfit(key, o = {}) {
      if (!director || mode !== 'rig') return false;
      if (o.hidden || o.animated === false) {
        if (!rig || !(rig.outfits ? rig.outfits() : []).includes(key)) return false;
        if (rig.outfit === key) return true;
      }
      if (!o.hidden && o.animated !== false) return director.react('outfit', { outfit: key });
      try { rig.setOutfit(key, { animated: false }); return true; } catch (e) { fail(e); return false; }
    },
    get crop() { return currentCrop; },
    get outfit() { try { return rig ? rig.outfit : null; } catch (e) { return null; } },
    destroy() {
      if (destroyed) return;
      destroyed = true; clearTimeout(bubTimer);
      for (const f of offs.splice(0)) { try { f(); } catch (e) { /* ignore */ } }
      try { if (director) director.destroy(); } catch (e) { /* ignore */ }
      try { if (rig) rig.destroy(); } catch (e) { /* ignore */ }
      bub.remove(); wrap.remove();
    },
  };
  return impl;
}
export default createHeroineMascot;
