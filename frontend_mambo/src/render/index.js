// Renderer: createRenderer(rootEl) -> { showBoard, playBook, setTurbo, setSkip, setCost, setFormat, resize, mascot, destroy }
// Board = 6 reels x 5 rows (events carry 7 rows per reel: padding row on top and bottom). All art is drawn in code.
//
// v2 (WP4 RENDER-CORE, milestone 1): the event player stages every result through the celebration gate (celebrate.js):
//   R = running return of the round (per cascade step), C = play amount x mode cost, level 0..3.
//   L0 R <= C   quiet result: lemon outline, neutral number, ONE ledgerTick, no sparks / shake / win sound / happy pose
//   L1 / L2 / L3 wink, ripple, staircase; the first crossing of C plays one "in the black" beat per round.
//   setWin (L3), wincap and the end of a feature play the tier staircase (15/30/50/100x cost, hit-stop on mega / super / epic);
//   the end of a feature is the neutral Debrief (FILED) when R <= C and DECLASSIFIED + staircase above.
// Motion (Full / Calm / Still, flashes on / off) is read from motion.js, a read-only subscriber of src/settings.js.
// Rule P: no pre-result sequence advertises a result; turbo never shortens anything where the jurisdiction disables turbo or sets a
// minimum round duration; Calm and Still replace motion, they never change a duration.
import { ensureSprite, symbolMarkup, SYM_COLOR, SYMBOLS } from './symbols.js';
import { createScene } from './scene.js';
import { createFx, FX_COLORS } from './fx.js';
import { createWire } from './wire.js';
import { createMeter } from './meter.js';
import { buildLogo } from './logo.js';
import { audio } from '../audio.js';
import { applyI18n, t, EN } from '../i18n/index.js';
import * as geo from './geo.js';
import { dispatch as dispatchLayers, resetLayers } from './layers/index.js';
import { settings } from '../settings.js';
import { motion } from './motion.js';
import { createCamera } from './camera.js';
import { flash as flashGov } from './flash.js'; // WP10 integration: the ONE page flash budget (request WP5_to_WP4 item 2)
import * as cel from './celebrate.js';

const COLS = 6, ROWS = 5, MAXR = 6; // ROWS = the home plan (Mezzanine); MAXR = the tallest frame (Annex)
const WINCAP = cel.WINCAP;
const DECOR = [
  ['L2', 'H3', 'L4', 'L1', 'H4'], ['L3', 'L4', 'H1', 'W', 'L2'], ['H2', 'L1', 'L3', 'S', 'L4'],
  ['L4', 'H2', 'L2', 'H3', 'L1'], ['H4', 'L3', 'L1', 'L2', 'H1'], ['L1', 'L2', 'H3', 'L4', 'L3'],
];

// Styles of the v2 staging. Injected once from here because the stylesheets belong to other work packages (styles.css: WP1).
const CSS_ID = 'am-render-core-css';
const CSS = `
/* WP4 render core: quiet result (level 0), neutral Debrief, stamps, in-the-black chip */
.cell.qw{z-index:2}
.cell.qw .sym-svg{animation:none}
.cell.win.rip .sym-svg{animation:none}
/* scatter award highlight (a feature award, not a return): same look as the v1 .win squash, but a class of its own so the gate and its
   tests can tell "the feature is awarded" from "this step returns something" */
.cell.sct{z-index:2}
.cell.sct:not(.win):not(.dim):not(.fuse):not(.adim) .sym-svg{animation:squash .75s infinite}
html:not([data-motion="full"]) .cell.sct:not(.win):not(.dim):not(.fuse):not(.adim) .sym-svg{animation:none;transform:scale(1.08)}
.outlines path.q{stroke:var(--lemon)!important}
.popups .pop.q{font-size:calc(var(--cell)*.27)}
.chip.tw.q{background:var(--cream)}
.chip.tw.black{background:var(--lemon)}
.banner.debrief{--ttl:var(--ink);--amt:var(--indigo);background:var(--cream);border:max(3px,.7vmin) solid var(--ink);border-radius:1.6vmin;box-shadow:1.2vmin 1.4vmin 0 var(--ink);padding:clamp(10px,3.6vmin,36px) clamp(20px,8vmin,90px);max-width:86%}
.banner.debrief::before{display:none}
.banner.debrief .bn-title,.banner.debrief .bn-amount{-webkit-text-stroke:0;text-shadow:none;transform:none}
.banner.debrief .bn-title{font-size:clamp(13px,5.6vmin,64px);letter-spacing:.08em}
.banner.debrief .bn-amount{font-size:clamp(18px,9vmin,100px)}
.banner.debrief .bn-sub{color:var(--indigo)}
.bn-stamp{display:inline-block;margin-top:.5em;padding:.08em .5em;border:.16em solid currentColor;border-radius:.18em;font-family:var(--disp);font-weight:900;font-size:clamp(14px,5.2vmin,54px);letter-spacing:.14em;text-transform:uppercase;transform:rotate(-5deg);opacity:0}
.bn-stamp.filed{color:var(--indigo)}
.bn-stamp.declassified{color:var(--coral-dk)}
/* WP4 M2 performance (WP10_to_WP4, WP5_to_WP4 item 6): the reveal and the drop-out move ONE wrapper per reel, the gravity drop one wrapper per
   reel and fall distance (usually one per reel); the pop and the ripple animate registered custom properties on the main thread, so a
   30-cell tumble promotes a handful of layers instead of one per cell */
@property --op{syntax:"<number>";inherits:false;initial-value:1}
@property --ps{syntax:"<number>";inherits:false;initial-value:1}
@property --pr{syntax:"<angle>";inherits:false;initial-value:0deg}
@property --pf{syntax:"<number>";inherits:false;initial-value:1}
@property --rx{syntax:"<number>";inherits:false;initial-value:1}
@property --ry{syntax:"<number>";inherits:false;initial-value:1}
@property --rt{syntax:"<percentage>";inherits:false;initial-value:0%}
.cells>.col,.cells .grp{position:absolute;inset:0}
.cell.pk{scale:var(--ps);rotate:var(--pr);opacity:var(--op)}
.cell.pk.pkb{filter:brightness(var(--pf))}
.cell.rip.rp .sym-svg{transform:scale(var(--rx),var(--ry)) translateY(var(--rt))}
/* WP4 M2 floor plans (SYNTHESIS 3): a position the plan does not have is not a cell (no tile, hatched ink); the Annex frame has 6 rows and
   is sized from the container height as well as its width (the --cell rules of styles.css are the 5-row ones) */
.slot.void{padding:calc(var(--cell)*.09)}
.slot.void i{background:repeating-linear-gradient(135deg,rgba(251,241,217,.13) 0 calc(var(--cell)*.03),transparent 0 calc(var(--cell)*.13));border:calc(var(--cell)*.02) dashed rgba(251,241,217,.28);border-radius:calc(var(--cell)*.06)}
.slot.void i::after{display:none}
.board-wrap.rows6{--cell:min(calc(100cqw / 6.3),calc(100cqh / 6.5))!important;height:calc(var(--cell)*6.3)!important}
@media (max-aspect-ratio:11/10){#app .board-wrap.rows6{--cell:min(calc(100cqw / 6.5),calc((100cqh - var(--gap,0px)*.6) / 6.45))!important}}
.board-wrap.rows6 .board{height:calc(var(--cell)*6)}
.board.rows6 .slot,.board.rows6 .cell{top:calc(var(--r)*16.6667%);height:16.6667%}
.board.rows6 .popups .pop{top:calc((var(--r) + .5)*16.6667%)}
`;
function ensureCss() {
  if (typeof document === 'undefined' || !document.head || document.getElementById(CSS_ID)) return;
  const s = document.createElement('style'); s.id = CSS_ID; s.textContent = CSS; document.head.appendChild(s);
}

export function prepareStatic(app) {
  if (!app) return;
  ensureSprite();
  buildLogo(app.querySelector('#logo'));
  createScene(app);
  try { applyI18n(document); } catch (e) { /* ignore */ }
  document.body.classList.add('rendered');
}

const nameOf = (s) => (s == null ? 'L1' : typeof s === 'string' ? s : s.name || 'L1');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
// text with a built-in English fallback while the key is not in the merged table yet (the word screen applies to both)
const tx = (key, dflt, vars) => (Object.prototype.hasOwnProperty.call(EN, key) ? t(key, vars) : dflt);

export function createRenderer(rootEl) {
  const root = rootEl || document.getElementById('game') || document.body;
  const app = root.closest('#app') || document.getElementById('app') || document.body;
  prepareStatic(app.id === 'app' ? app : document.getElementById('app') || app);
  ensureCss();
  const scene = createScene(app);
  const fx = createFx(app);

  const S = {
    cost: 1, skip: false, turbo: false, destroyed: false, combo: 0, pad: 1, fsTotal: 0, fsCur: 0, inFs: false, hooks: {},
    fmt: (x) => `${(Math.round(x * 100) / 100).toFixed(2)}x`,
    grid: Array.from({ length: COLS }, () => Array(MAXR).fill(null)),
    plan: geo.FLOOR_PLANS.mezzanine, rows: ROWS, // the floor plan the board is DRAWN in (geo.js holds the plan of the events)
    pads: Array(COLS).fill('L1'), gm: 1, cap: 0, meterOn: false, lastCluster: null,
    skipK: 0.04, traceOn: false, traceLog: [], t0: 0,
  };
  // S.skip: fast-forward the rest of the current book (replay SKIP); cleared when the book ends
  // Rule P: turbo scales time only where the jurisdiction offers turbo and sets no minimum round duration (read at the point of use)
  const caps = () => settings.capabilities;
  const turboNow = () => !!(S.turbo && caps().turbo && !caps().minRound);
  const T = (ms) => ms * (S.skip ? S.skipK : turboNow() ? 0.42 : 1);
  // time factor of the current speed (1 = normal): handed to the heroine as `speed` (WP3: 0.5..2.5)
  const speedNow = () => clamp(1 / (S.skip ? S.skipK : turboNow() ? 0.42 : 1), 0.5, 2.5);
  const sleep = (ms) => new Promise((r) => setTimeout(r, T(ms)));
  const hook = (n, ...a) => { try { const f = S.hooks && S.hooks[n]; if (f) f(...a); } catch (e) { console.error('hook', n, e); } };

  // ---------- the round: running return R against the cost C (the celebration gate, celebrate.js) ----------
  const round = cel.createRound(1);
  const G = { step: 0 }; // level of the winning step that is being staged / was staged last (the tumble that follows uses it)
  const trace = (name, d) => { if (S.traceOn) S.traceLog.push({ t: Math.round(performance.now() - S.t0), name, level: round.level, ...(d || {}) }); };
  // EVERY sound of the player goes through here. While the round is at or below its cost (level 0) the call is marked quiet, so the
  // audio layer refuses any win-like cue (audio.js CUE_INFO.winLike): no win sound can ever play at R <= C, whoever asks for it.
  const cue = (id, o) => {
    const quiet = round.level < 1 || !!(o && o.quiet);
    trace('audio:' + id, { quiet });
    return audio.play(id, quiet ? { ...(o || {}), quiet: true } : o);
  };

  // ---------- motion store consumers: camera (trauma shake + hit-stop), particles, flash ----------
  let SHORT = 600;
  const measureShort = () => { SHORT = Math.min(app.clientWidth || 600, app.clientHeight || 600); };
  measureShort();
  try { new ResizeObserver(measureShort).observe(app); } catch (e) { /* no ResizeObserver: keep the first measure */ }
  const camera = createCamera({
    targets: () => [root, scene && scene.host],
    shortSide: () => SHORT, // cached (WP5_to_WP4 follow-up): reading clientWidth every camera frame forced a synchronous layout
  });
  // particle engine behind the motion store: counts scale with Full / Calm / Still (Still draws none); Full is the v1 count
  const fxm = {
    sparks: (x, y, c, s, n, sp) => { const k = motion.count(n); if (k) fx.sparks(x, y, c, s, k, sp); },
    shards: (x, y, c, s, n) => { const k = motion.count(n); if (k) fx.shards(x, y, c, s, k); },
    coins: (x, y, u, n, ...r) => { const k = motion.count(n); if (k) fx.coins(x, y, u, k, ...r); },
    coinRain: (n, u) => { const k = motion.count(n); if (k) fx.coinRain(k, u); },
    smoke: (x, y, s, n, c) => { const k = motion.count(n); if (k) fx.smoke(x, y, s, k, c); },
    confetti: (x, y, u, n, o) => { const k = motion.count(n); if (k) fx.confetti(x, y, u, k, o); },
    ring: (...a) => { if (motion.particles > 0) fx.ring(...a); },
    glow: (...a) => { if (motion.particles > 0) fx.glow(...a); },
    burstBubble: (...a) => { if (motion.particles > 0) fx.burstBubble(...a); },
  };
  // audio seen by the meter and the wire: on the quiet path (R <= C) a win-like cue is refused by audio.play({ quiet: true });
  // a dial step then ticks neutrally instead of rising in pitch
  const METER_CUES = new Set(['meter', 'meterRise', 'metermax', 'meterTick']);
  const gatedAudio = new Proxy(audio, {
    get(target, prop) {
      if (prop === 'play') {
        return (id, o) => {
          if (round.level >= 1) return target.play(id, o);
          if (METER_CUES.has(id)) return target.play('dialStep', { n: 1, ...(o || {}), quiet: true });
          return target.play(id, { ...(o || {}), quiet: true });
        };
      }
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });

  // ---------- mascot (optional: the game works unchanged when the module is missing) ----------
  const M = { intro: false, m: null, base: 'idle', timer: 0, sayAt: 0, losses: 0, hadResult: false, celebrated: false, pending: [] };
  const mPose = (name) => {
    if (motion.reduced && name === 'dance') name = round.level >= 1 ? 'happy' : 'idle';
    try { if (M.m) M.m.setPose(name); } catch (e) { /* ignore */ }
  };
  const mBase = () => { clearTimeout(M.timer); M.timer = 0; mPose(S.inFs ? 'dance' : M.base); };
  // pose(name, holdMs): show a pose, then return to the resting pose of the moment (think / dance)
  function pose(name, hold = 0) {
    if (S.destroyed) return;
    clearTimeout(M.timer); M.timer = 0;
    mPose(name);
    if (hold) M.timer = setTimeout(() => { M.timer = 0; if (!S.destroyed) mPose(S.inFs ? 'dance' : M.base); }, hold);
  }
  // the pose function handed to the wire: a happy / celebrating pose never plays while the round is at or below its cost
  const poseGuarded = (name, hold) => { const n = cel.guardPose(name, round.level); if (n) pose(n, hold); };
  // v2 reaction map (INTERFACES section 3): react(kind, info) asks the heroine rig for a clip; the v1 pose is the fallback only
  function react(kind, info, legacy) {
    if (S.destroyed) return false;
    trace('react:' + kind);
    let ok = false;
    try { ok = !!(M.m && typeof M.m.react === 'function' && M.m.react(kind, info || {})); } catch (e) { ok = false; }
    if (!ok && typeof legacy === 'function') legacy();
    return ok;
  }
  const rinfo = (extra) => ({ level: round.level, ratio: round.cost > 0 ? round.R / round.cost : 0, R: round.R, C: round.cost, combo: S.combo, speed: speedNow(), ...(extra || {}) });
  // Speech bubbles: i18n key (+ optional ".1".. ".5" variants); a missing key is skipped, never shown raw.
  const hasKey = (k) => Object.prototype.hasOwnProperty.call(EN, k);
  function say(key, ms = 2200, force = false, vars) {
    if (S.destroyed || !M.m || typeof M.m.say !== 'function') return;
    if (!hasKey(key)) return;
    const now = Date.now();
    if (!force && now - M.sayAt < 3500) return;
    M.sayAt = now;
    let k = key;
    const n = 1 + Math.floor(Math.random() * 5);
    if (hasKey(key + '.' + n)) k = key + '.' + n;
    try { M.m.say(t(k, vars), ms); } catch (e) { /* ignore */ }
  }
  (async () => {
    try {
      const slot = document.getElementById('mascot-slot');
      if (!slot) return;
      const mod = await import('./mascot.js');
      if (S.destroyed || !mod || typeof mod.createMascot !== 'function') return;
      slot.innerHTML = '';
      const h = slot.getBoundingClientRect().height || 0;
      const size = Math.round(Math.min(260, Math.max(90, h || window.innerHeight * 0.3)));
      M.m = mod.createMascot(slot, { size, reduced: motion.reduced });
      M.m.setPose('idle');
    } catch (e) { M.m = null; }
  })();

  // v2 layer dispatcher context (docs/v2/INTERFACES.md). Fields are only ever added. LAYERS is empty in step 0.
  const layerCtx = {
    app, root, geo, T, sleep, settings, motion, camera,
    // turbo is the EFFECTIVE turbo (Rule P): false where the jurisdiction disables turbo or sets a minimum round duration
    get turbo() { return turboNow(); }, get skip() { return S.skip; }, get cost() { return S.cost; }, get inFs() { return S.inFs; },
    // the celebration gate, already updated for the event being dispatched
    get R() { return round.R; }, get level() { return round.level; }, get round() { return round; },
    // M2 floor plans: the plan the board is DRAWN in (a geo.js plan: { id, name, cols, rows, cells, cellCount }), its frame height, and
    // the geometry of a cell (geometric row) in px of #app (cellCenter) or as % of the board box (cellBox) for overlays drawn on .board
    get layout() { return S.plan; }, get rows() { return S.rows; },
    cellCenter: (c, r) => cellCenter(c, r),
    cellBox: (c, r) => ({ left: c / COLS * 100, top: r / S.rows * 100, width: 100 / COLS, height: 100 / S.rows }),
    // M3 missions: the mission of the feature ({ id, payTiming, dialStart, dialStep, dialCap, lens, fuseLen } or the Briefing default)
    get mission() { return S.mission; },
    // WP6_to_WP4 item 1: the gated audio (win-like cues refused at R <= C), the live heroine, the HUD number format, the mode when known
    get mascot() { return M.m; }, fmt: (x) => S.fmt(x), get mode() { return S.mode || null; },
  };

  const anim = (el, frames, opts) => {
    try { const a = el.animate(frames, { fill: 'backwards', ...opts, duration: T(opts.duration), delay: T(opts.delay || 0) }); return a.finished.catch(() => {}); } catch (e) { return Promise.resolve(); }
  };
  // a custom-property animation (main thread, no compositor layer): `cls` switches on the CSS rule that reads the properties while it runs
  const animVar = (el, cls, frames, opts) => {
    el.classList.add(...cls);
    try {
      const a = el.animate(frames, { fill: 'backwards', ...opts, duration: T(opts.duration), delay: T(opts.delay || 0) });
      return a.finished.catch(() => {}).then(() => { if (!opts.keep) { el.classList.remove(...cls); try { a.cancel(); } catch (e) { /* ignore */ } } });
    } catch (e) { el.classList.remove(...cls); return Promise.resolve(); }
  };

  // ---------- DOM ----------
  root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'board-wrap';
  layerCtx.wrap = wrap;
  layerCtx.flash = flash; // WP10: layers share the page flash budget
  layerCtx.audio = gatedAudio; // WP6_to_WP4 item 1: layer cues go through the quiet gate too
  wrap.innerHTML = `<div class="board">
      <div class="slots"></div><div class="reelglows"></div><div class="cells"></div>
      <svg class="outlines" viewBox="0 0 ${COLS} ${ROWS}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="popups"></div>
    </div>
    <i class="lit l"></i><i class="lit r"></i><i class="rivet" style="left:2.2%;top:2.6%"></i><i class="rivet" style="right:2.2%;top:2.6%"></i><i class="rivet" style="left:2.2%;bottom:2.6%"></i><i class="rivet" style="right:2.2%;bottom:2.6%"></i>
    <div class="chip combo"></div><div class="chip fsc"></div><div class="chip tw"></div>`;
  root.appendChild(wrap);
  wrap.dataset.plan = 'mezzanine';
  const board = wrap.querySelector('.board');
  layerCtx.board = board;
  const slotsEl = wrap.querySelector('.slots'), glowsEl = wrap.querySelector('.reelglows'), cellsEl = wrap.querySelector('.cells');
  const outl = wrap.querySelector('.outlines'), popsEl = wrap.querySelector('.popups');
  // one wrapper per reel: the reveal / drop-out animate these (6 layers) instead of every cell
  const cols = [], colAnims = [];
  for (let c = 0; c < COLS; c++) { const k = document.createElement('div'); k.className = 'col'; k.style.setProperty('--c', c); cellsEl.appendChild(k); cols.push(k); colAnims.push(null); }
  const stopCol = (c) => { const a = colAnims[c]; colAnims[c] = null; if (a) { try { a.cancel(); } catch (e) { /* ignore */ } } };
  const chipCombo = wrap.querySelector('.chip.combo'), chipFs = wrap.querySelector('.chip.fsc'), chipTw = wrap.querySelector('.chip.tw');
  chipTw.classList.add('q');
  const glowEls = [];
  for (let c = 0; c < COLS; c++) {
    const g = document.createElement('div'); g.className = 'reelglow'; g.style.setProperty('--c', c); glowsEl.appendChild(g); glowEls.push(g);
  }
  // the slot tiles of the drawn plan: a position the plan does not have is a `.slot.void` (no tile, hatched board: visibly not a cell)
  function buildSlots() {
    slotsEl.textContent = '';
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < S.rows; r++) {
        const s = document.createElement('div'); s.className = 'slot' + (S.plan.cells[c].includes(r) ? '' : ' void');
        s.style.setProperty('--c', c); s.style.setProperty('--r', r); s.innerHTML = '<i></i>';
        slotsEl.appendChild(s);
      }
    }
  }
  buildSlots();
  const samePlan = (a, b) => a === b || (!!a && !!b && a.id === b.id && a.rows === b.rows && JSON.stringify(a.cells) === JSON.stringify(b.cells));
  // Draw the board in `plan` (a geo.js plan). Same frame height: the tiles change at once (the board is empty here: the cells of the last
  // spin have dropped out). 5 <-> 6 rows: the frame morphs by transform (FLIP on `scale` / `translate`, 417 ms, turbo-scaled; Calm and Still
  // keep the duration with a plain opacity dip). Returns the morph promise (or null).
  function applyPlan(plan, o = {}) {
    const morph = !!o.morph && plan.rows !== S.rows;
    let r0 = null;
    try { if (morph) r0 = wrap.getBoundingClientRect(); } catch (e) { r0 = null; }
    S.plan = plan; S.rows = plan.rows;
    const six = plan.rows === 6;
    wrap.classList.toggle('rows6', six); board.classList.toggle('rows6', six);
    wrap.dataset.plan = plan.id; board.style.setProperty('--rows', S.rows); // WP6 overlays read --rows
    outl.setAttribute('viewBox', `0 0 ${COLS} ${S.rows}`);
    buildSlots();
    // a reel whose first present row is below the frame top hides what falls in above it (the tumble refill), like the frame top does
    for (let c = 0; c < COLS; c++) { const p0 = plan.cells[c][0] || 0; cols[c].style.clipPath = p0 > 0 ? `inset(${(p0 / S.rows * 100).toFixed(3)}% -40px -40px -40px)` : ''; }
    GR = null;
    trace('plan', { id: plan.id, rows: plan.rows, morph });
    if (!morph || !r0) return null;
    let a = null;
    try {
      if (motion.reduced) {
        a = wrap.animate([{ opacity: 1 }, { opacity: .55, offset: .4 }, { opacity: 1 }], { duration: T(417), easing: 'linear' });
      } else {
        const r1 = wrap.getBoundingClientRect();
        const m = new DOMMatrixReadOnly(getComputedStyle(wrap).transform === 'none' ? undefined : getComputedStyle(wrap).transform);
        const L = r1.left - m.e, Tp = r1.top - m.f; // page position of the untransformed box
        const axis = (a0, a1, b0, b1, base) => { // scale + origin (+ offset when the size does not change) mapping [b0,b1] onto [a0,a1]
          const k = (a1 - a0) / Math.max(1, b1 - b0);
          if (Math.abs(1 - k) < 1e-3) return { k: 1, o: (b0 + b1) / 2 - base, d: a0 - b0 };
          return { k, o: (a0 - k * b0) / (1 - k) - base, d: 0 };
        };
        const X = axis(r0.left, r0.right, r1.left, r1.right, L), Y = axis(r0.top, r0.bottom, r1.top, r1.bottom, Tp);
        wrap.style.transformOrigin = `${X.o.toFixed(2)}px ${Y.o.toFixed(2)}px`;
        a = wrap.animate([{ scale: `${X.k} ${Y.k}`, translate: `${X.d}px ${Y.d}px` }, { scale: '1 1', translate: '0px 0px' }], { duration: T(417), easing: 'cubic-bezier(.3,.7,.3,1)' });
      }
    } catch (e) { a = null; }
    const done = () => { wrap.style.transformOrigin = ''; GR = null; };
    if (!a) { done(); return null; }
    return a.finished.then(done, done);
  }
  // the board follows the plan of the events (geo.js); returns the morph promise or null when it already does
  function syncPlan() {
    const want = geo.getLayout();
    if (samePlan(want, S.plan)) return null;
    return applyPlan(want, { morph: true });
  }
  // `layout` event (base spins of a multi-plan book, before the reveal): the last board leaves, then the frame takes the new plan. Layers
  // (WP6 blueprint) draw the outline concurrently from the same event; nothing here advertises a result (Rule P: <= 0.5 s draw, 417 ms morph).
  async function onLayout() {
    if (samePlan(geo.getLayout(), S.plan)) return null;
    await dropOut();
    await syncPlan();
    return null;
  }
  let bannerLayer = app.querySelector('.banner-layer');
  if (!bannerLayer) { bannerLayer = document.createElement('div'); bannerLayer.className = 'banner-layer'; app.appendChild(bannerLayer); }
  // The layer only intercepts clicks while a banner is really on screen (never leave it covering the controls).
  function syncBannerLayer() { try { bannerLayer.classList.toggle('on', !!bannerLayer.querySelector('.banner')); } catch (e) { /* ignore */ } }
  let flashEl = app.querySelector('#flash');
  if (!flashEl) { flashEl = document.createElement('div'); flashEl.id = 'flash'; app.appendChild(flashEl); }

  // ---------- geometry ----------
  // the app and board rects are read at most once per animation frame (WP5_to_WP4 follow-up: a getBoundingClientRect per cell inside the
  // tumble loops forced a synchronous layout each time); the cache is dropped on the next frame, so it is never stale for long
  let GR = null;
  const rects = () => {
    if (!GR) { GR = { a: app.getBoundingClientRect(), b: board.getBoundingClientRect() }; requestAnimationFrame(() => { GR = null; }); }
    return GR;
  };
  const appRect = () => rects().a;
  function cellCenter(c, r) {
    const { a, b } = rects();
    const cw = b.width / COLS, ch = b.height / S.rows;
    return { x: b.left - a.left + (c + 0.5) * cw, y: b.top - a.top + (r + 0.5) * ch, size: cw };
  }
  // event position (COMPACT-PADDED row) -> geometric row of the drawn board, -1 when the plan has no cell there (geo.js owns the mapping;
  // Mezzanine is the identity row - 1 of v1). Books without pads (S.pad 0, old dev books) count rows from 0.
  const posRow = (p) => (p ? geo.toGeo(p.reel, Number(p.row) - S.pad + 1) : -1);
  const has = (c, r) => c >= 0 && c < COLS && r >= 0 && S.plan.cells[c].includes(r);
  const present = (c) => S.plan.cells[c];
  const eachCell = (fn) => { for (let c = 0; c < COLS; c++) for (const r of present(c)) { const x = S.grid[c][r]; if (x) fn(x, c, r); } };

  // ---------- cells ----------
  function makeCell(c, r, name) {
    const el = document.createElement('div');
    el.className = 'cell s-' + name;
    el.style.setProperty('--c', c); el.style.setProperty('--r', r);
    el.innerHTML = symbolMarkup(name);
    cols[c].appendChild(el);
    return { name, el, c, r };
  }
  // a reveal column carries the present cells of its reel (geo.revealLength = cells + top pad + bottom pad); vis[i] is the symbol of the
  // geometric row present(c)[i]
  function colNames(col, c) {
    const arr = (col || []).map(nameOf);
    const n = present(c).length;
    if (arr.length >= n + 2) return { pad: arr[0], vis: arr.slice(1, 1 + n), padded: true };
    return { pad: SYMBOLS[(Math.random() * 8) | 0], vis: arr.slice(0, n), padded: false };
  }
  function normaliseBoard(b) {
    if (!Array.isArray(b) || !b.length) return null;
    if (b.length === COLS) return b;
    if (b.length === ROWS && Array.isArray(b[0]) && b[0].length === COLS) return Array.from({ length: COLS }, (_, c) => b.map((row) => row[c]));
    return null;
  }
  function clearCells() {
    for (let c = 0; c < COLS; c++) for (let r = 0; r < MAXR; r++) { const x = S.grid[c][r]; if (x) x.el.remove(); S.grid[c][r] = null; }
    for (let c = 0; c < COLS; c++) { stopCol(c); cols[c].textContent = ''; }
  }
  function showBoard(b) {
    const nb = normaliseBoard(b) || DECOR;
    clearWins();
    clearCells();
    if (S.plan.id !== 'mezzanine' || S.rows !== ROWS) applyPlan(geo.FLOOR_PLANS.mezzanine); // a static board is the home plan
    for (let c = 0; c < COLS; c++) {
      const col = colNames(nb[c], c);
      S.pad = col.padded ? 1 : S.pad; S.pads[c] = col.pad;
      present(c).forEach((r, i) => { S.grid[c][r] = makeCell(c, r, col.vis[i] || 'L1'); });
    }
  }

  // ---------- MISSION METER (global multiplier; free spins only; events updateGlobalMult {globalMult}) ----------
  // The host `#meter-slot` is laid out by styles.css (exactly the board frame box); the meter hangs off it.
  let meter = null;
  try {
    const host = app.querySelector('#meter-slot') || wrap;
    meter = createMeter(host, { audio: gatedAudio, reduced: motion.reduced, motion, t, cap: S.cap || undefined });
  } catch (e) { console.error('meter init', e); meter = null; }
  // optional MAX threshold from the rules data (gmCap); the meter stays usable without it
  try {
    fetch(new URL('../../data/rules_data.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((d) => { const c = d && Number(d.gmCap); if (c > 1) { S.cap = c; if (meter && typeof meter.setCap === 'function') { try { meter.setCap(c); } catch (e) { /* ignore */ } } } }).catch(() => {});
  } catch (e) { /* ignore */ }
  function meterReset() { if (meter) { try { meter.reset(); } catch (e) { /* ignore */ } } S.gm = 1; }
  function meterShow(on) { if (meter) { try { meter.show(on); } catch (e) { /* ignore */ } } }
  // free spins start: the meter appears at x1 with a MISSION START stamp
  async function meterStart(v = 1) {
    if (!meter) return null;
    S.meterOn = true; S.gm = v;
    meterShow(true); meter.reset(); meter.set(v);
    cue('stamp');
    audioMeter(v);
    try {
      if (motion.particles > 0) { const r = appRect(), p = cellCenter(1.2, 0.2); fxm.burstBubble(p.x, p.y, Math.min(r.width, r.height) * .22, t('meter.start')); }
    } catch (e) { /* ignore */ }
    return sleep(450);
  }
  function meterEnd() {
    S.meterOn = false; S.gm = 1; meterShow(false); meterReset();
    audioMeter(1);
  }
  // audio.setMeter(n) (WP2) fires the win-like riser when the level passes x10 and has no quiet option yet (request
  // docs/v2/requests/WP4_to_WP2.md). On the quiet path (R <= C) the audio meter is held at x9: the bed arpeggio stays almost the same and
  // the riser cannot start; the next meter change once the round is above its cost brings it up to the real value. The extra argument is
  // ignored today and lets WP2 take over the decision.
  function audioMeter(v) {
    if (typeof audio.setMeter !== 'function') return;
    const quiet = round.level < 1;
    try { audio.setMeter(quiet && v >= 10 ? 9 : v, { quiet }); } catch (e) { /* ignore */ }
  }
  const METER_MILESTONES = [5, 10, 20, 50];
  async function onGlobalMult(ev) {
    const v = Math.max(1, Math.round(Number(ev && ev.globalMult) || 1));
    const prev = S.gm || 1;
    S.gm = v;
    if (!S.inFs && v <= 1) return null; // base game stays at x1: nothing to show
    if (!meter) return null;
    if (!S.meterOn) return meterStart(v);
    if (v === prev) return null;
    const from = S.lastCluster ? { x: S.lastCluster.x, y: S.lastCluster.y } : undefined;
    meter.set(v, { animate: true, from });
    audioMeter(v);
    if (S.cap && v >= S.cap) { meter.max(); }
    // the dial is a readout, not a win: she points at it on the milestones (any level); the v1 happy pose is kept for rounds above the cost
    const milestone = METER_MILESTONES.some((m) => prev < m && v >= m) || (S.cap && v >= S.cap && prev < S.cap);
    if (v > prev && milestone) react('meter', rinfo({ meter: v }), round.level >= 1 ? () => pose('happy', 900) : null);
    else if (v > prev && round.level >= 1) { pose('happy', 900); }
    if (v > prev && round.level >= 1) say('mascot.meter', 1800, false, { n: v });
    return sleep(260);
  }

  // ---------- fx helpers ----------
  // Camera trauma (camera.js): MAX 1.6% of the short side, 0.8 degree; Calm x0.25 without rotation, Still none.
  function shake(amp = 1, ms = 420) { trace('shake', { amp }); camera.shake(amp, ms); }
  // Flash governor (SYNTHESIS S4): cream or lemon only, peak <= .5, at most 2 per second; flashes off = one 167 ms dissolve (<= .25); Still = none
  // WP10 integration (WP5_to_WP4 item 2): every page flash goes through the shared governor of render/flash.js (mode from the
  // settings store, <= 2 starts per sliding second, peak <= .5, dissolve when flashes are reduced, none in Still)
  flashGov.attach(flashEl);
  function flash(peak = .8, ms = 500, color = FX_COLORS.cream) {
    const ok = flashGov.fire(peak, T(ms), color);
    if (ok) trace('flash', { peak: Math.min(peak, .5) });
  }
  function chip(el, text, on, bump = true) {
    const changed = text != null && text !== '' && el.textContent !== text;
    if (text != null) el.textContent = text;
    el.classList.toggle('on', !!on);
    // restart the bump on the next frame instead of forcing a synchronous layout (void offsetWidth) in the middle of a step
    if (bump && changed && on) { el.classList.remove('bump'); requestAnimationFrame(() => { if (el.classList.contains('on')) el.classList.add('bump'); }); }
  }
  const fsText = (cur, tot) => `${t('label.freeSpins')} ${cur}/${tot}`;
  function countUp(el, to, ms, delay) {
    const t0 = performance.now() + T(delay);
    const step = (now) => {
      if (S.destroyed || !el.isConnected) return;
      const k = clamp((now - t0) / T(ms), 0, 1);
      if (el.firstChild) el.firstChild.nodeValue = (S.fmtTick || S.fmt)(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // o: { kind: 'quiet' | 'pop', countMs, overshoot } (celebrate.js STAGE); a quiet number is cream, final from the first frame, no overshoot
  function popup(r, c, html, delay = 0, val = null, o = {}) {
    const quiet = o.kind === 'quiet';
    const p = document.createElement('div'); p.className = 'pop' + (quiet ? ' q' : (val != null && val >= 5 ? ' big' : '')); p.style.setProperty('--c', c); p.style.setProperty('--r', r); p.innerHTML = html;
    popsEl.appendChild(p);
    if (val != null && !quiet && !motion.reduced) { p.firstChild.nodeValue = S.fmt(0); countUp(p, val, o.countMs || 480, delay + 80); }
    let frames, dur, easing;
    if (quiet) {
      frames = [{ opacity: 0, transform: 'translate(-50%,-42%)' }, { opacity: 1, transform: 'translate(-50%,-50%)', offset: .18 }, { opacity: 1, transform: 'translate(-50%,-56%)', offset: .7 }, { opacity: 0, transform: 'translate(-50%,-78%)' }];
      dur = 800; easing = 'linear';
    } else if (motion.reduced) { // Calm / Still: no scale pop, the number fades in and out
      frames = [{ opacity: 0, transform: 'translate(-50%,-50%)' }, { opacity: 1, transform: 'translate(-50%,-50%)', offset: .15 }, { opacity: 1, transform: 'translate(-50%,-60%)', offset: .75 }, { opacity: 0, transform: 'translate(-50%,-100%)' }];
      dur = 1500; easing = 'ease-out';
    } else {
      frames = [
        { opacity: 0, transform: 'translate(-50%,-30%) scale(.4)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1.2)', offset: .18 },
        { opacity: 1, transform: 'translate(-50%,-62%) scale(1)', offset: .75 },
        { opacity: 0, transform: 'translate(-50%,-110%) scale(.95)' }];
      dur = 1500; easing = o.overshoot ? 'cubic-bezier(.2,.9,.3,1.3)' : 'ease-out';
    }
    const a = anim(p, frames, { duration: dur, delay, easing, fill: 'both' });
    a.then(() => p.remove());
  }
  function clearWins() {
    outl.innerHTML = '';
    cellsEl.querySelectorAll('.win,.qw,.rip,.dim,.fuse,.sct').forEach((e) => e.classList.remove('win', 'qw', 'rip', 'dim', 'fuse', 'sct'));
  }
  function outlinePath(cells) {
    const set = new Set(cells.map(([c, r]) => c + ',' + r)); let d = '';
    for (const [c, r] of cells) {
      if (!set.has(c + ',' + (r - 1))) d += `M${c} ${r}H${c + 1}`;
      if (!set.has(c + ',' + (r + 1))) d += `M${c} ${r + 1}H${c + 1}`;
      if (!set.has((c - 1) + ',' + r)) d += `M${c} ${r}V${r + 1}`;
      if (!set.has((c + 1) + ',' + r)) d += `M${c + 1} ${r}V${r + 1}`;
    }
    return d;
  }
  // ripple highlight (J08): each cell squashes 45 ms x its distance from the middle of the cluster (cap 270 ms), two loops of the v1
  // squash scaled by the level (peak stretch 1.08 / 1.14 / 1.20), then the lit outline stays. Calm and Still keep the static outline.
  function ripple(cells, amp) {
    trace('ripple', { amp });
    if (motion.reduced || !cells.length) return;
    const mx = cells.reduce((a, p) => a + p[0], 0) / cells.length, my = cells.reduce((a, p) => a + p[1], 0) / cells.length;
    const k = (amp - 1) / 0.22; // 1 = the v1 squash (1.22 / .76)
    const f = (n) => n.toFixed(3);
    // custom properties --rx / --ry / --rt read by `.cell.rip.rp .sym-svg` (main thread, no compositor layer per rippling symbol)
    const kf = [
      { '--rx': 1, '--ry': 1, '--rt': '0%', easing: 'ease' },
      { '--rx': f(1 + .22 * k), '--ry': f(1 - .24 * k), '--rt': '0%', offset: .14, easing: 'ease' },
      { '--rx': f(1 - .14 * k), '--ry': f(1 + .22 * k), '--rt': `${f(-9 * k)}%`, offset: .34, easing: 'ease' },
      { '--rx': f(1 + .1 * k), '--ry': f(1 - .08 * k), '--rt': '0%', offset: .54, easing: 'ease' },
      { '--rx': f(1 - .03 * k), '--ry': f(1 + .04 * k), '--rt': '0%', offset: .74, easing: 'ease' },
      { '--rx': 1, '--ry': 1, '--rt': '0%' }];
    cells.forEach(([c, r]) => {
      const cell = S.grid[c] && S.grid[c][r]; const svg = cell && cell.el.querySelector('.sym-svg'); if (!svg) return;
      const dist = Math.round(Math.abs(c - mx) + Math.abs(r - my));
      cell.el.classList.add('rp');
      try { const a = svg.animate(kf, { duration: T(750), delay: T(Math.min(270, 45 * dist)), iterations: 2, fill: 'backwards' }); a.finished.then(() => cell.el.classList.remove('rp'), () => cell.el.classList.remove('rp')); } catch (e) { /* ignore */ }
    });
  }

  // ---------- reveal ----------
  const animCol = (c, frames, opts) => {
    stopCol(c);
    try {
      const a = cols[c].animate(frames, { fill: 'backwards', ...opts, duration: T(opts.duration), delay: T(opts.delay || 0) });
      colAnims[c] = a;
      return a.finished.then(() => { if (colAnims[c] === a && opts.fill !== 'forwards') { colAnims[c] = null; try { a.cancel(); } catch (e) { /* ignore */ } } }, () => {});
    } catch (e) { return Promise.resolve(); }
  };
  async function dropOut() {
    const items = [];
    eachCell((x) => items.push(x));
    if (!items.length) return;
    clearWins();
    cue('whoosh');
    // one wrapper per reel leaves the board (its translate is in % of the board height: 1.3 boards = out of the clip)
    const used = new Set(items.map((x) => x.c));
    await Promise.all([...used].map((c) => animCol(c, motion.reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0)' }, { transform: 'translateY(130%)' }],
      { duration: 360, delay: c * 35, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' })));
    clearCells();
  }
  async function reveal(ev) {
    const nb = normaliseBoard(ev.board);
    if (!nb) return;
    S.combo = 0; S.lastWin = 0; G.step = 0; chip(chipCombo, '', false); chip(chipTw, '', false);
    await dropOut();
    // the board follows the plan of the events: a book without a `layout` event after an Annex spin, or the first free-spin reveal
    // (always Mezzanine), morphs the frame back here, before any symbol lands
    await syncPlan();
    cue('spin');
    // honest slow-roll (lever 3): only the columns the book flags, at most two, and never when the jurisdiction switch is off
    const antic = caps().anticipation !== false && Array.isArray(ev.anticipation) ? ev.anticipation : [];
    let at = 0; const lands = [];
    const anticCols = [];
    for (let c = 0; c < COLS; c++) {
      const col = colNames(nb[c], c); if (col.padded) S.pad = 1; S.pads[c] = col.pad;
      if (antic[c] && anticCols.length < 2) { at += 520; anticCols.push([c, at]); }
      at += c === 0 ? 0 : 120;
      present(c).forEach((r, i) => { S.grid[c][r] = makeCell(c, r, col.vis[i] || 'L1'); });
      // the reel drops in as ONE wrapper (compositor layer per reel, not per cell); its % are of the board height, so the bounce is
      // 9% / 2.5% of a cell like the v1 per-cell drop
      const k = 1 / S.rows;
      animCol(c, motion.reduced ? [{ opacity: 0 }, { opacity: 0, offset: .3 }, { opacity: 1, offset: .64 }, { opacity: 1 }] : [
        { transform: 'translateY(-106%)', easing: 'cubic-bezier(.45,0,.85,.5)' },
        { transform: 'translateY(0)', offset: .64, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: `translateY(${(-9 * k).toFixed(2)}%)`, offset: .79, easing: 'ease-in' },
        { transform: 'translateY(0)', offset: .9, easing: 'ease-out' },
        { transform: `translateY(${(-2.5 * k).toFixed(2)}%)`, offset: .95, easing: 'ease-in' },
        { transform: 'translateY(0)' }], { duration: 620, delay: at });
      lands.push(at + 620 * .64);
    }
    if (anticCols.length) {
      cue('antic'); wrap.classList.add('antic'); react('anticipate', rinfo(), () => pose(S.inFs ? 'dance' : 'think'));
      const t0 = Math.max(0, anticCols[0][1] - 560), t1 = at + 620;
      for (let k = 0; t0 + k * 860 < t1; k++) setTimeout(() => { if (!S.destroyed) cue('heart', { i: k }); }, T(t0 + k * 860));
      anticCols.forEach(([c, tm]) => {
        setTimeout(() => {
          glowEls[c].classList.add('on');
          eachCell((cell, ci) => cell.el.classList.toggle('adim', ci !== c && cell.name !== 'S'));
        }, T(Math.max(0, tm - 560)));
        setTimeout(() => glowEls[c].classList.remove('on'), T(tm + 650));
      });
    }
    lands.forEach((tm, c) => setTimeout(() => { if (!S.destroyed) { cue('land', { vol: c === 0 ? 1 : .7 }); } }, T(tm)));
    await sleep(at + 620 + 60);
    wrap.classList.remove('antic'); glowEls.forEach((g) => g.classList.remove('on'));
    if (anticCols.length && !M.intro) pose(S.inFs ? 'dance' : 'think');
    cellsEl.querySelectorAll('.adim').forEach((e) => e.classList.remove('adim'));
    // scatter tease
    const sc = [];
    eachCell((x) => { if (x.name === 'S') sc.push(x); });
    if (sc.length >= (S.inFs ? 3 : 4)) {
      cue('scatter', { n: sc.length - 2 }); react('anticipate', rinfo(), () => pose('shock', 1400)); say('mascot.shock');
      sc.forEach((cell) => { cell.el.classList.add('sct'); const p = cellCenter(cell.c, cell.r); fxm.sparks(p.x, p.y, FX_COLORS.coral, p.size * .35, 10, 5); fxm.glow(p.x, p.y, p.size * 1.1, '240,71,47', .7); });
      shake(.6, 400);
      await sleep(sc.length >= 4 ? 700 : 900);
      sc.forEach((cell) => cell.el.classList.remove('sct'));
    }
  }

  // ---------- wins ----------
  // "In the black" (J11): the running return of the round passes its cost for the first time. The total chip turns from cream to lemon
  // with a 167 ms stamp, once per round. From here on celebratory cues are allowed. chime: the step has no win sound of its own.
  function blackBeat(o = {}) {
    trace('inBlack');
    chipTw.classList.remove('q'); chipTw.classList.add('black');
    chip(chipTw, S.fmt(round.spin), true, false);
    if (!motion.reduced) anim(chipTw, [{ transform: 'translateX(-50%) scale(1.4)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 167, easing: 'steps(2,end)' });
    cue('stamp', { vol: .8 });
    if (o.chime) cue('win', { combo: 1 });
  }
  function mascotWin(kind, info) {
    // L0: the quiet beat only. L1+: the clip from the rig, or the v1 happy pose when there is none.
    react(kind, info, kind === 'quiet' ? null : () => pose('happy', 1300));
    if (kind !== 'quiet' && S.combo === 1 && !S.inFs) say('mascot.win');
  }
  async function showWins(ev, tr) {
    const wins = ev.wins || [];
    if (!wins.length) return;
    S.combo += 1;
    const banked = !!(tr && tr.banked);
    const lvl = tr && !banked ? tr.level : 0;
    G.step = lvl;
    M.hadResult = true; if (lvl >= 1) M.celebrated = true;
    chip(chipCombo, `${t('label.combo')} x${S.combo}`, S.combo > 1, lvl >= 1);
    clearWins();
    const NS = 'http://www.w3.org/2000/svg';
    const groups = wins.map((w, wi) => ({ w, wi, cells: (w.positions || []).map((p) => [p.reel, posRow(p)]).filter(([c, r]) => has(c, r)) }));
    const inWin = new Set();
    let total = 0;
    groups.forEach((g) => { g.cells.forEach(([c, r]) => inWin.add(c + ',' + r)); total += (g.w.win || 0) / 100; });
    const flat = [...inWin].map((k) => k.split(',').map(Number));
    const sinks = {
      inBlack: () => blackBeat(),
      // highlight: lemon tint + double outline from L1; the quiet result has the lemon outline only
      outline: ({ color, tint }) => {
        groups.forEach((g) => {
          if (tint) g.cells.forEach(([c, r]) => { const rc = document.createElementNS(NS, 'rect'); rc.setAttribute('class', 'wt'); rc.setAttribute('x', c); rc.setAttribute('y', r); rc.setAttribute('width', 1); rc.setAttribute('height', 1); outl.appendChild(rc); });
          const d = outlinePath(g.cells);
          const hl = document.createElementNS(NS, 'path'); hl.setAttribute('class', 'halo'); hl.setAttribute('d', d); outl.appendChild(hl);
          const path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); path.style.stroke = FX_COLORS.lemon;
          if (color === 'lemon') path.setAttribute('class', 'q');
          outl.appendChild(path);
          g.cells.forEach(([c, r]) => { const cell = S.grid[c][r]; if (cell) cell.el.classList.add(lvl >= 1 ? 'win' : 'qw', ...(lvl >= 1 ? ['rip'] : [])); });
        });
      },
      popup: (po) => {
        if (banked) return; // a filed (banked) amount is never shown as a win
        groups.forEach((g) => {
          const w = g.w;
          let ov = (w.meta && w.meta.overlay) ? [w.meta.overlay.reel, posRow(w.meta.overlay)] : null;
          if (!ov || !has(ov[0], ov[1])) ov = g.cells[Math.floor(g.cells.length / 2)];
          if (!ov || !has(ov[0], ov[1])) return;
          const gmv = w.meta && Number(w.meta.globalMult) > 1 ? Number(w.meta.globalMult) : 0;
          // Ballroom Blackout: a cluster under the spotlight window (meta.lit) is paid x lensMult on top of the dial (win already includes it)
          const lens = w.meta && w.meta.lit && Number(w.meta.lensMult) > 1 ? Number(w.meta.lensMult) : 0;
          const tags = [gmv ? `x${gmv}` : '', lens ? `x${lens}` : ''].filter(Boolean).join(' ');
          const cm = tags ? `<small>${tags}</small>` : '';
          popup(ov[1], ov[0], `${S.fmt((w.win || 0) / 100)}${cm}`, g.wi * 120, (w.win || 0) / 100, po);
        });
      },
      ledgerTick: () => { if (!banked) cue('ledgerTick', { quiet: true }); }, // a filed step has the envelope's own neutral cue (WP6)
      winSound: ({ combo }) => cue('win', { combo }),
      sparks: (n) => flat.forEach(([c, r]) => {
        const cell = S.grid[c][r]; if (!cell) return;
        trace('sparks', { n });
        const p = cellCenter(c, r); fxm.sparks(p.x, p.y, SYM_COLOR[cell.name] || FX_COLORS.lemon, p.size * .3, n, 4);
      }),
      trauma: (a) => { trace('trauma', { a }); camera.add(a); },
      ripple: (amp) => ripple(flat, amp),
      mascot: (kind, info) => mascotWin(kind, { ...rinfo(), ...info, level: lvl, at: S.lastCluster ? { x: Math.round(S.lastCluster.x), y: Math.round(S.lastCluster.y) } : undefined }),
    };
    // the middle of the winning cluster in client px: the +1 chip of the Mission Meter flies from it and the heroine looks at it
    try {
      if (flat.length) {
        const mx = flat.reduce((a, p) => a + p[0], 0) / flat.length, my = flat.reduce((a, p) => a + p[1], 0) / flat.length;
        const p = cellCenter(mx, my), ar = appRect();
        S.lastCluster = { x: ar.left + p.x, y: ar.top + p.y };
      }
    } catch (e) { /* ignore */ }
    const staged = cel.stageWin(sinks, { level: lvl, crossed: !!(tr && tr.crossed), combo: S.combo, total, R: tr ? tr.next : round.R, C: round.cost });
    cellsEl.querySelectorAll('.cell:not(.win):not(.qw)').forEach((e) => e.classList.add('dim'));
    S.lastWin = total;
    await sleep(staged.holdMs);
  }

  // ---------- tumble ----------
  async function tumble(ev) {
    const exploding = new Set();
    (ev.explodingSymbols || []).forEach((p) => { const r = posRow(p); if (has(p.reel, r)) exploding.add(p.reel + ',' + r); });
    outl.innerHTML = '';
    // the pop of a quiet step (level 0) is just the cells leaving: no shards, sparks, ring, brightness, shake or pop sound
    const rc = cel.tumbleRecipe(G.step);
    // cells already emptied by the wire blast (emptyCell) are holes: nothing left to pop, they only get refilled below
    const cells = [...exploding].map((k) => k.split(',').map(Number)).filter(([c, r]) => S.grid[c][r]);
    cells.forEach(([c, r], i) => {
      const cell = S.grid[c][r]; if (!cell) return;
      const p = cellCenter(c, r); const col = SYM_COLOR[cell.name] || FX_COLORS.lemon;
      if (rc.shards) fxm.shards(p.x, p.y, col, p.size * .35, 6 + Math.min(6, Math.round((S.lastWin || 0) / 8)));
      if (rc.sparks) fxm.sparks(p.x, p.y, FX_COLORS.cream, p.size * .3, 5, 6);
      if (rc.ring) fxm.ring(p.x, p.y, p.size * .6, '251,241,217', .35, 3);
      cell.el.classList.remove('win', 'qw', 'rip', 'dim');
      // custom properties (scale / rotate / opacity / brightness) on the main thread: no compositor layer per popped cell
      let frames;
      if (!rc.brightness) frames = motion.reduced ? [{ '--op': 1 }, { '--op': 0 }] : [{ '--ps': 1, '--pr': '0deg', '--op': 1 }, { '--ps': .2, '--pr': '25deg', '--op': 0 }];
      else frames = [{ '--ps': 1, '--pr': '0deg', '--op': 1, '--pf': 1 }, { '--ps': 1.35, '--pr': '0deg', '--op': 1, '--pf': 2.4, offset: .35 }, { '--ps': .2, '--pr': '25deg', '--op': 0, '--pf': 2 }];
      animVar(cell.el, rc.brightness ? ['pk', 'pkb'] : ['pk'], frames, { duration: 330, delay: Math.min(i, 8) * 22, easing: 'ease-in', fill: 'forwards', keep: true });
      if (rc.popSound && i < 9) setTimeout(() => cue('pop', { combo: S.combo + Math.floor(i / 3) }), T(i * 40));
    });
    if (cells.length) {
      if (rc.trauma) shake(.3 + Math.min(S.combo, 6) * .07 + Math.min((S.lastWin || 0) / 50, 1), 280);
      await sleep(380);
    }
    cells.forEach(([c, r]) => { const cell = S.grid[c][r]; if (cell) { cell.el.remove(); S.grid[c][r] = null; } });
    cellsEl.querySelectorAll('.dim').forEach((e) => e.classList.remove('dim'));
    const falls = [];
    const newSyms = ev.newSymbols || [];
    for (let c = 0; c < COLS; c++) {
      // gravity inside the reel's present cells (geometric rows P, contiguous: holes only at the reel ends): survivors keep their order
      // and settle at the bottom, the new symbols fill the top
      const P = present(c);
      const surv = []; for (const r of P) if (S.grid[c][r]) surv.push(S.grid[c][r]);
      const n = P.length - surv.length;
      if (!n) continue;
      const ns = (newSyms[c] || []).map(nameOf);
      let padNew, fresh;
      if (ns.length >= n) { padNew = ns[0]; fresh = ns.slice(1, n); } else { padNew = SYMBOLS[(Math.random() * 8) | 0]; fresh = ns.slice(); }
      while (fresh.length < n - 1) fresh.unshift(SYMBOLS[(Math.random() * 8) | 0]);
      const incoming = [...fresh, S.pads[c]];
      S.pads[c] = padNew;
      // cells that fall the same number of rows move together in ONE wrapper (a compositor layer per group, not per cell): the new
      // symbols fall as a block of n rows from above the reel, and so does every survivor above the hole when the hole is in one piece
      // (the common case: one wrapper per reel)
      const groups = new Map();
      const addTo = (d, cell) => { if (!groups.has(d)) groups.set(d, []); groups.get(d).push(cell); };
      const col = {};
      incoming.slice(0, n).forEach((nm, i) => { const cell = makeCell(c, P[i], nm); col[P[i]] = cell; addTo(n, cell); });
      surv.forEach((cell, j) => {
        const to = P[n + j]; const from = cell.r;
        col[to] = cell; cell.r = to; cell.el.style.setProperty('--r', to);
        if (to !== from) addTo(to - from, cell);
      });
      for (const r of P) { S.grid[c][r] = col[r] || null; if (col[r]) { col[r].c = c; col[r].r = r; } }
      let gi = 0;
      for (const [d, list] of groups) falls.push(dropGroup(c, list, d, gi++));
    }
    await Promise.all(falls);
    cue('land', { vol: .5 });
    await sleep(120);
  }
  // one falling group: its cells are moved (already at their final rows) into a wrapper that slides `rows` cells down, then put back
  function dropGroup(c, list, rows, k) {
    const g = document.createElement('div'); g.className = 'grp';
    cols[c].appendChild(g);
    list.forEach((cell) => g.appendChild(cell.el));
    const dur = 360 + rows * 70;
    const pct = (rows / S.rows) * 100, b = (5 / S.rows); // % of the board height (the wrapper is the board box); bounce 5% of a cell
    let a = null;
    try {
      a = g.animate(motion.reduced ? [{ opacity: .15 }, { opacity: 1 }] : [
        { transform: `translateY(${(-pct).toFixed(3)}%)`, easing: 'cubic-bezier(.4,0,.9,.55)' },
        { transform: 'translateY(0)', offset: .72, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: `translateY(${(-b).toFixed(3)}%)`, offset: .86, easing: 'ease-in' },
        { transform: 'translateY(0)' }], { duration: T(dur), delay: T(c * 24 + k * 40), fill: 'backwards' });
    } catch (e) { a = null; }
    const settle = () => { list.forEach((cell) => { if (cell.el.parentNode === g) cols[c].appendChild(cell.el); }); g.remove(); };
    if (!a) { settle(); return Promise.resolve(); }
    return a.finished.then(settle, settle);
  }

  // ---------- banners ----------
  // x is a multiple of the base bet; tiers use the multiple of what the round cost (UNLEASH: 100x the bet).
  const tierFor = (x) => cel.tierOf(x, S.cost || 1);
  // Banner without an amount (mission briefing, incoming telegram). With an amount it is the count banner below.
  function banner(o) {
    if (o.amount != null) return countBanner({ ...o, kind: o.kind || 'win', plan: o.plan || cel.tierPlan(o.amount, S.cost || 1), amount: o.amount });
    return new Promise((resolve) => {
      const el = document.createElement('div'); el.className = 'banner ' + (o.kind || '');
      const title = document.createElement('div'); title.className = 'bn-title';
      const sub = document.createElement('div'); sub.className = 'bn-sub'; sub.style.display = o.sub ? '' : 'none'; sub.textContent = o.sub || '';
      el.append(title, sub);
      const dim = document.createElement('div'); dim.className = 'banner-dim';
      const rays = document.createElement('div'); rays.className = 'rays';
      if (o.hi) rays.classList.add('hi');
      bannerLayer.append(dim, rays, el); bannerLayer.classList.add('on');
      let skip = false;
      const onSkip = () => { skip = true; };
      bannerLayer.addEventListener('pointerdown', onSkip);
      title.textContent = o.title || '';
      anim(dim, [{ opacity: 0 }, { opacity: o.dimAmt != null ? o.dimAmt : 1 }], { duration: 300, fill: 'forwards' });
      if (o.rays !== false) anim(rays, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'forwards' });
      anim(el, motion.reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'scale(.2) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.12) rotate(1deg)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: motion.reduced ? 250 : 520, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
      const run = async () => {
        try {
          await sleep(450);
          const t1 = performance.now(); const hold = T(o.hold != null ? o.hold : 1400);
          await new Promise((res) => { const w = (now) => { if (S.destroyed || skip && now - t1 > T(220) || now - t1 > hold) res(); else requestAnimationFrame(w); }; requestAnimationFrame(w); });
          await Promise.all([anim(el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.1)' }], { duration: 320, fill: 'forwards' }), anim(dim, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' }), anim(rays, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' })]);
        } finally {
          bannerLayer.removeEventListener('pointerdown', onSkip); bannerLayer.classList.remove('shk');
          el.remove(); dim.remove(); rays.remove();
          syncBannerLayer(); requestAnimationFrame(syncBannerLayer);
          resolve();
        }
      };
      run();
    });
  }
  // The count banner: the tier staircase (J18), the neutral Debrief (J22) and the DECLASSIFIED report.
  //   o.plan   celebrate.tierPlan(): count segments of 0.85 s (first 0.9 s) and 0.55 s beats; scaled by T(), so turbo / skip compress it
  //   o.kind   'win' (starburst, rays) | 'debrief' (cream card, no rays, no coins, no cheer)
  //   o.titleMode  'title' = the tier name replaces the title at each beat | 'sub' = the title stays, the tier name goes to the sub line
  //   o.stamp  'filed' | 'declassified' lands after the count
  // Tap jumps to the final value and title; with capabilities.slamstop off the tap only counts once the count-up has ended.
  function countBanner(o) {
    return new Promise((resolve) => {
      const debrief = o.kind === 'debrief';
      const plan = o.plan || cel.tierPlan(o.amount, S.cost || 1);
      const target = Number(plan.target) || Number(o.amount) || 0;
      const subMode = o.titleMode === 'sub';
      const el = document.createElement('div'); el.className = 'banner ' + (debrief ? 'debrief' : (o.kind || 'win'));
      const title = document.createElement('div'); title.className = 'bn-title';
      const amt = document.createElement('div'); amt.className = 'bn-amount';
      const sub = document.createElement('div'); sub.className = 'bn-sub';
      title.textContent = o.title || t('win.big');
      if (!o.title && plan.tiers) title.style.visibility = 'hidden'; // the tier name appears with its first beat; the box is kept so nothing shifts
      else if (!o.title) title.textContent = tx('win.total', 'TOTAL WIN');
      amt.textContent = (S.fmtTick || S.fmt)(0);
      const subBase = o.sub || '';
      sub.textContent = subBase; sub.style.display = subBase ? '' : 'none';
      el.append(title, amt, sub);
      const dim = document.createElement('div'); dim.className = 'banner-dim';
      const rays = document.createElement('div'); rays.className = 'rays';
      if (o.hi) rays.classList.add('hi');
      // the neutral Debrief and a banner asked without rays never put the rays element in the DOM (its CSS would show it)
      bannerLayer.append(...(debrief || o.rays === false ? [dim, el] : [dim, rays, el])); bannerLayer.classList.add('on');
      trace('banner', { kind: debrief ? 'debrief' : 'win', target, steps: plan.steps.length });
      let tapped = false, countDone = false, tierIdx = -1;
      const onSkip = () => { if (!caps().slamstop && !countDone) return; tapped = true; };
      bannerLayer.addEventListener('pointerdown', onSkip);
      const tierWord = (key) => (key ? t(key) : '');
      const setTier = (key, stamp = true) => {
        if (!key) return;
        el.dataset.tier = key;
        if (subMode) { const w = tierWord(key); sub.textContent = [w, subBase].filter(Boolean).join(' - '); sub.style.display = ''; if (stamp && !motion.reduced) anim(sub, [{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 167, easing: 'steps(3,end)' }); return; }
        title.textContent = tierWord(key); title.style.visibility = '';
        if (stamp && !motion.reduced) anim(title, [{ transform: 'scale(1.25) rotate(-3deg)' }, { transform: 'scale(1) rotate(-3deg)' }], { duration: 167, easing: 'steps(3,end)' });
      };
      if (debrief) {
        anim(dim, [{ opacity: 0 }, { opacity: o.dimAmt != null ? o.dimAmt : .55 }], { duration: 250, fill: 'forwards' });
        anim(el, motion.reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateY(28px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 250, easing: 'ease-out', fill: 'forwards' });
      } else {
        anim(dim, [{ opacity: 0 }, { opacity: o.dimAmt != null ? o.dimAmt : 1 }], { duration: 300, fill: 'forwards' });
        if (o.rays !== false) anim(rays, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'forwards' });
        anim(el, motion.reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'scale(.2) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.12) rotate(1deg)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: motion.reduced ? 250 : 520, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
      }
      const tick = (v) => { amt.textContent = (S.fmtTick || S.fmt)(v); };
      // wait until performance.now() reaches `until` (already T-scaled), the book is destroyed or the player taps
      const waitUntil = (until) => new Promise((res) => { const w = (now) => { if (S.destroyed || tapped || now >= until) res(); else requestAnimationFrame(w); }; requestAnimationFrame(w); });
      let lastTick = 0, lastCoin = 0;
      // the staircase runs on an absolute schedule: step k ends at tAcc + T(ms of steps 0..k), so the frame quantisation of each rAF start
      // never adds up over the 9 steps of a 5000x count (the 7.5 s acceptance limit)
      let tAcc = 0;
      const segment = (st) => new Promise((res) => {
        const dur = T(st.ms), t0 = tAcc || performance.now();
        const step = (now) => {
          if (S.destroyed || tapped) { res(); return; }
          const p = clamp((now - t0) / dur, 0, 1);
          tick(st.from + (st.to - st.from) * (1 - (1 - p) * (1 - p))); // easeOutQuad per segment
          if (now - lastTick > 60 && p < 1) { lastTick = now; cue('count', { p }); }
          if (o.coins && now - lastCoin > 150 && p < 1) {
            lastCoin = now;
            // coin fountain from both lower corners, stronger with the tier
            const r = appRect(), u = Math.min(r.width, r.height), n = 2 + Math.max(0, tierIdx + 1);
            fxm.coins(r.width * .12, r.height * 1.02, u, n, .28, -Math.PI / 2 + .42, 1.25 + Math.max(0, tierIdx) * .1);
            fxm.coins(r.width * .88, r.height * 1.02, u, n, .28, -Math.PI / 2 - .42, 1.25 + Math.max(0, tierIdx) * .1);
          }
          if (p >= 1) res(); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      const beat = async (st) => {
        const tb = tAcc || performance.now();
        tierIdx = st.tier;
        trace('beat', { tier: st.key, hitStop: st.hitStop });
        // the beat is 0.55 s of wall time: the hit-stop (83 / 100 / 125 ms) is its first moment, then the stamp, stinger and ring
        if (st.hitStop && !S.skip && motion.hitStop) { trace('hitStop', { ms: st.hitStop }); await camera.freeze(T(st.hitStop)); }
        setTier(st.key);
        cue('stinger', { level: st.tier + 1 }); cue('coin');
        flash(.3 + st.tier * .08, 420, FX_COLORS.cream); camera.add(st.trauma, { tier: true });
        { const r = appRect(); fxm.ring(r.width / 2, r.height / 2, Math.min(r.width, r.height) * (.5 + st.tier * .12), '255,210,63', .7, 10); }
        if (st.tier >= 2) rays.classList.add('hi');
        if (st.tier >= 3 && !motion.reduced) bannerLayer.classList.add('shk');
        await waitUntil(tb + T(st.ms));
      };
      const run = async () => {
        try {
          await sleep(debrief ? 250 : 450);
          tAcc = performance.now();
          for (const st of plan.steps) {
            if (S.destroyed || tapped) break;
            if (st.type === 'count') { trace('segment', { from: st.from, to: st.to, ms: st.ms }); await segment(st); } else await beat(st);
            tAcc += T(st.ms);
          }
          // the final value and title (a tap lands here too, straight from wherever the staircase was)
          tick(target); trace('final', { target, tapped });
          const finalKey = plan.finalKey;
          if (finalKey && el.dataset.tier !== finalKey) { setTier(finalKey, !tapped); if (tapped && plan.tiers >= 3) rays.classList.add('hi'); }
          countDone = true;
          if (!debrief) { // the neutral Debrief number just lands: no pop
            if (!motion.reduced) anim(amt, [{ transform: 'scale(1.18) rotate(1.5deg)' }, { transform: 'scale(1) rotate(1.5deg)' }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)' });
          }
          if (o.stamp) {
            const stampEl = document.createElement('div'); stampEl.className = 'bn-stamp ' + o.stamp; stampEl.textContent = tx('win.' + o.stamp, o.stamp === 'filed' ? 'FILED' : 'DECLASSIFIED');
            el.appendChild(stampEl);
            cue('stamp');
            await anim(stampEl, motion.reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'rotate(-5deg) scale(2)' }, { opacity: 1, transform: 'rotate(-5deg) scale(1)' }], { duration: 167, easing: 'steps(3,end)', fill: 'forwards' });
            stampEl.style.opacity = '1';
          }
          if (o.coins && !S.destroyed) { const r = appRect(); fxm.coins(r.width / 2, r.height * .62, Math.min(r.width, r.height), 36, 1.2); if (target >= 30) fxm.coinRain(target >= 100 ? 60 : 36, Math.min(r.width, r.height)); cue('shower', { n: target >= 50 ? 32 : 16 }); }
          const t1 = performance.now(); const hold = T(o.hold != null ? o.hold : 1400);
          await new Promise((res) => { const w = (now) => { if (S.destroyed || tapped && now - t1 > T(220) || now - t1 > hold) res(); else requestAnimationFrame(w); }; requestAnimationFrame(w); });
          await Promise.all([anim(el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: debrief ? 'scale(1)' : 'scale(1.1)' }], { duration: debrief ? 250 : 320, fill: 'forwards' }), anim(dim, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' }), anim(rays, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' })]);
        } catch (e) { console.error('banner', e); } finally {
          bannerLayer.removeEventListener('pointerdown', onSkip); bannerLayer.classList.remove('shk');
          el.remove(); dim.remove(); rays.remove();
          syncBannerLayer(); requestAnimationFrame(syncBannerLayer);
          resolve();
        }
      };
      run();
    });
  }
  // setWin at L3 and wincap: the tier staircase. o.plan = celebrate.tierPlan(), o.max = the MAX WIN title at the end.
  async function winBanner(x, opts = {}) {
    const plan = opts.plan || cel.tierPlan(x, S.cost || 1);
    cue('bigwin', { level: x >= 100 ? 3 : x >= 50 ? 2 : 1 });
    M.celebrated = true; M.hadResult = true;
    react('epic', rinfo({ level: 3 }), () => pose(opts.max || x >= WINCAP ? 'celebrate' : 'bigwin')); say('mascot.big', 2600, true);
    await countBanner({ kind: 'win', plan, amount: x, coins: true, hi: x >= 50, hold: 1300, sub: opts.sub });
  }

  // ---------- free spins ----------
  function scatterCells(ev) {
    const res = [];
    (ev.positions || []).forEach((p) => { const r = posRow(p); if (has(p.reel, r) && S.grid[p.reel][r]) res.push(S.grid[p.reel][r]); });
    if (!res.length) eachCell((x) => { if (x.name === 'S') res.push(x); });
    return res;
  }
  function setBonusMode(on) {
    S.inFs = on;
    document.body.classList.toggle('fs-mode', on); app.classList.toggle('fs-mode', on);
    audio.setBonus(on);
    try { if (typeof audio.setMood === 'function') audio.setMood(on ? 'freespins' : 'base'); } catch (e) { /* ignore */ }
    if (!on) mBase(); else if (!M.intro) pose('dance');
  }
  async function fsTrigger(ev) {
    const total = Number(ev.totalFs) || 0;
    const sc = scatterCells(ev);
    clearWins();
    cue('scatter', { n: 4 }); cue('stamp'); cue('rumble');
    react('trigger', rinfo({ mission: ev.mission }), () => pose('shock')); say('mascot.shock', 2000, true);
    sc.forEach((cell) => { cell.el.classList.add('fuse'); const p = cellCenter(cell.c, cell.r); fxm.glow(p.x, p.y, p.size * 1.3, '240,71,47', 1.0); fxm.sparks(p.x, p.y, FX_COLORS.lemon, p.size * .35, 14, 6); });
    cellsEl.querySelectorAll('.cell:not(.fuse)').forEach((e) => e.classList.add('dim'));
    shake(.8, 700);
    await sleep(1100);
    // detonate
    cue('stamp'); flash(.95, 900, FX_COLORS.cream); shake(2.6, 1100);
    M.intro = true; pose('plunger');
    setBonusMode(true); // palette swap hides under the flash
    { const r0 = appRect(); fxm.ring(r0.width / 2, r0.height / 2, Math.max(r0.width, r0.height) * .7, '255,210,63', 1.0, 18); fxm.smoke(r0.width / 2, r0.height / 2, Math.min(r0.width, r0.height) * .3, 3, '251,241,217'); }
    const rect = appRect();
    sc.forEach((cell) => {
      const p = cellCenter(cell.c, cell.r);
      fxm.ring(p.x, p.y, p.size * 3.5, '251,241,217', .8, 10); fxm.ring(p.x, p.y, p.size * 2.2, '240,71,47', .6, 6);
      fxm.smoke(p.x, p.y, p.size * .6, 2, '251,241,217'); fxm.sparks(p.x, p.y, FX_COLORS.lemon, p.size * .5, 26, 9); fxm.sparks(p.x, p.y, FX_COLORS.coral, p.size * .5, 20, 8);
      fxm.shards(p.x, p.y, FX_COLORS.coral, p.size * .5, 8);
    });
    // all cells get blown away from the centre of the blast
    const cx = sc.length ? sc.reduce((a, c) => a + c.c, 0) / sc.length : COLS / 2, cy = sc.length ? sc.reduce((a, c) => a + c.r, 0) / sc.length : S.rows / 2;
    const all = []; eachCell((x) => all.push(x));
    all.forEach((cell) => {
      cell.el.classList.remove('dim', 'fuse');
      const dx = cell.c - cx, dy = cell.r - cy, d = Math.hypot(dx, dy) || 1;
      anim(cell.el, motion.reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 }, { transform: `translate(${(dx / d) * 260}%,${(dy / d) * 260 + 40}%) rotate(${dx * 70 + 30}deg) scale(.5)`, opacity: 0 }],
        { duration: 750, delay: motion.reduced ? 0 : d * 40, easing: 'cubic-bezier(.2,.7,.5,1)', fill: 'forwards' });
    });
    try { if (round.level >= 1) fxm.confetti(rect.width / 2, rect.height * .55, Math.min(rect.width, rect.height), 30, { spread: 6.28 }); } catch (e) { /* ignore */ }
    await sleep(1100);
    clearCells(); meterEnd();
    S.fsTotal = total; S.fsCur = 0;
    hook('onFreeSpinCounter', 0, total);
    chip(chipFs, fsText(0, total), true);
    cue('fsStart'); say('mascot.fs', 2400, true);
    // neutral title when the shell has one (WP6_to_WP4 item 2): the mission is only known at missionAssigned, the dossier names it
    await banner({ title: hasKey('fs.incoming') ? t('fs.incoming') : t('fs.trigger'), sub: t('fs.start', { n: total }), kind: 'fs', hold: 2300, dimAmt: .92 });
    M.intro = false; pose('dance');
  }
  async function fsRetrigger(ev) {
    const sc = scatterCells(ev);
    const tot = Number(ev.totalFs) || 0;
    const add = tot > S.fsTotal && S.fsTotal ? tot - S.fsTotal : tot;
    cue('scatter', { n: 3 });
    sc.forEach((cell) => { cell.el.classList.add('sct'); const p = cellCenter(cell.c, cell.r); fxm.sparks(p.x, p.y, FX_COLORS.lemon, p.size * .4, 12, 6); fxm.glow(p.x, p.y, p.size * 1.2, '255,210,63', .8); });
    shake(.7, 500);
    await sleep(900);
    clearWins();
    if (tot > S.fsTotal) S.fsTotal = tot;
    cue('retrigger'); cue('stinger', { level: 2 }); react('retrigger', rinfo(), () => poseGuarded('happy', 1400)); flash(.5, 600, FX_COLORS.cream);
    if (round.level >= 1) { const r = appRect(); fxm.coins(r.width / 2, r.height * .6, Math.min(r.width, r.height), 24, 1.1); }
    await banner({ title: t('fs.retrigger', { n: add }), kind: 'fs', hold: 1300, dimAmt: .6, rays: true, hi: true });
  }
  // End of the feature. R = the total of the round: at or below its cost the neutral Debrief (card, count, FILED stamp, no rays, coins or
  // cheer); above it DECLASSIFIED with the staircase (a single count below 15x the cost).
  async function fsEnd(ev, tr) {
    const R = tr ? tr.next : (Number(ev.amount) || 0) / 100;
    clearWins();
    const e = cel.endPlan('freeSpinEnd', { R, C: round.cost });
    // subtitle: the Mission Meter level reached
    const meterSub = (S.gm || 1) > 1 ? `${t('label.meter')} x${S.gm}` : '';
    if (e.kind === 'filed') {
      react('end', rinfo({ level: 0 }));
      await countBanner({ kind: 'debrief', plan: e.plan, amount: R, title: tx('fs.report', 'MISSION REPORT'), stamp: e.stamp, hold: 300, dimAmt: .55, sub: meterSub, rays: false });
    } else {
      M.celebrated = true; M.hadResult = true;
      cue('fsEnd'); react('end', rinfo({ level: e.level }), () => pose('celebrate')); say(hasKey('mascot.fsEnd') ? 'mascot.fsEnd' : 'mascot.big', 2400, true);
      await countBanner({ kind: 'win', plan: e.plan, amount: R, title: t('fs.end'), titleMode: 'sub', stamp: e.stamp, coins: e.level >= 2, rays: e.level >= 2, hi: e.level >= 3, hold: 2200, sub: meterSub, dimAmt: .94 });
    }
    setBonusMode(false);
    chip(chipFs, '', false);
    hook('onFreeSpinCounter', 0, 0);
    meterEnd();
  }

  // ---------- bomb-timer WIRE (events fusePath / fuseBurn / fuseBlast / fuseFizzle; drawing lives in wire.js) ----------
  // Wire events use VISIBLE rows 0..4 (tumbleBoard / winInfo use padded rows 1..5). The blast empties its cells here
  // (holes in S.grid); the tumbleBoard that follows refills them and drops the survivors.
  let wire = null;
  function emptyCell(c, r) {
    const cell = S.grid[c] && S.grid[c][r];
    if (!cell) return;
    try { cell.el.remove(); } catch (e) { /* ignore */ }
    S.grid[c][r] = null;
  }
  // the wire draws its own POW!/BAM!/BOOM! stars: keep fx.breakCell's paper pieces but drop its speech bubble
  // Annex adapter (until wire.js reads the frame height itself, request WP4_to_WP5): wire.js draws 5 rows over the element it is given and
  // reads a row >= 5 as a padded row. On a 6-row frame it gets a host that covers 5 of the 6 rows: rows 0-4 (WO = 0) or rows 1-5 (WO = 1,
  // chosen per wire from its path), and every row it sees or asks about is shifted by WO. On 5-row frames the host is the whole board.
  const wireHost = document.createElement('div'); wireHost.className = 'wire-host';
  wireHost.style.cssText = 'position:absolute;left:0;right:0;top:0;height:100%;pointer-events:none';
  board.appendChild(wireHost);
  let WO = 0;
  const wireNative = () => !!(wire && wire.rowsAware); // wire.js sets this once it handles any frame height: the adapter steps aside
  function wireFrame(ev) {
    if (wireNative() || S.rows <= 5) { WO = 0; wireHost.style.top = '0'; wireHost.style.height = '100%'; return; }
    const rows = (ev && Array.isArray(ev.cells) ? ev.cells : []).map((p) => Number(p.row)).filter(Number.isFinite);
    WO = rows.length && Math.max(...rows) >= S.rows - 1 && Math.min(...rows) >= 1 ? 1 : 0;
    wireHost.style.top = (WO / S.rows * 100).toFixed(4) + '%'; wireHost.style.height = ((S.rows - 1) / S.rows * 100).toFixed(4) + '%';
  }
  const shiftRows = (ev) => {
    if (!WO || !ev || wireNative()) return ev;
    const o = { ...ev };
    for (const k of Object.keys(o)) if (Array.isArray(o[k]) && o[k].some((p) => p && typeof p === 'object' && 'row' in p)) o[k] = o[k].map((p) => (p && typeof p === 'object' && 'row' in p ? { ...p, row: Number(p.row) - WO } : p));
    return o;
  };
  const wr = (r) => r + (wireNative() ? 0 : WO);
  const wireFx = Object.create(fxm);
  wireFx.breakCell = (x, y, size, color, o) => (typeof fx.breakCell === 'function' && motion.particles > 0 ? fx.breakCell(x, y, size, color, { ...(o || {}), bubble: false }) : null);
  try {
    wire = createWire({
      board: wireHost, fx: wireFx, audio: gatedAudio, t, reduced: motion.reduced, motion,
      cellCenter: (c, r) => cellCenter(c, wr(r)), pose: poseGuarded, shake, flash, sleep,
      rows: () => S.rows, geo, // frame height of the drawn plan (Annex 6): request WP4_to_WP5 (wire.js still assumes 5 rows)
      turbo: () => turboNow() || S.skip, destroyed: () => S.destroyed,
      cellEl: (c, r) => { r = wr(r); return S.grid[c] && S.grid[c][r] ? S.grid[c][r].el : null; },
      emptyCell: (c, r) => emptyCell(c, wr(r)),
      symColor: (c, r) => { r = wr(r); const cell = S.grid[c] && S.grid[c][r]; return cell ? (SYM_COLOR[cell.name] || FX_COLORS.coral) : FX_COLORS.coral; },
    });
  } catch (e) { console.error('wire init', e); wire = null; }
  // safety net: a book that ends with holes (blast without refill) never leaves an empty cell behind
  function fillHoles() {
    for (let c = 0; c < COLS; c++) for (const r of present(c)) if (!S.grid[c][r]) S.grid[c][r] = makeCell(c, r, SYMBOLS[(Math.random() * 8) | 0]);
  }
  // ---------- end WIRE ----------

  // ---------- missions (SYNTHESIS 2 and 8.4-8.7, WP8_to_FRONT) ----------
  // missionAssigned: the mission state of the feature (Briefing / Sealed Orders / Ballroom Blackout; an unknown id plays the Briefing look),
  // the Clearance Dial start / step / cap (the "+N" chip reads dialStep), the costume asked to the heroine and the palette asked to the scene.
  // The dossier, the envelope and the spotlight are WP6 layers fed by the same events.
  const MISSION_KEYS = ['briefing', 'orders', 'blackout'];
  const OUTFIT = { briefing: 'lab', orders: 'trench', blackout: 'casino' };
  const DEFAULT_MISSION = Object.freeze({ id: 'briefing', payTiming: 'step', dialStart: 1, dialStep: 8, dialCap: 100, lens: null, fuseLen: 8, totalFs: 0 });
  S.mission = DEFAULT_MISSION;
  function onMission(ev) {
    const id = MISSION_KEYS.includes(ev && ev.mission) ? ev.mission : 'briefing';
    const num = (v, d) => (Number(v) > 0 ? Number(v) : d);
    S.mission = Object.freeze({
      id, raw: ev && ev.mission, payTiming: ev && ev.payTiming === 'spinEnd' ? 'spinEnd' : 'step',
      dialStart: num(ev && ev.dialStart, 1), dialStep: num(ev && ev.dialStep, 8), dialCap: num(ev && ev.dialCap, S.cap || 100),
      lens: (ev && ev.lens) || null, fuseLen: num(ev && ev.fuseLen, 8), totalFs: num(ev && ev.totalFs, S.fsTotal || 0),
    });
    trace('mission', { id, raw: ev && ev.mission, step: S.mission.dialStep });
    if (meter) { try { meter.mission({ ...ev, mission: id, dialStep: S.mission.dialStep, dialCap: S.mission.dialCap, dialStart: S.mission.dialStart }); } catch (e) { /* ignore */ } }
    if (S.mission.dialCap > 1) S.cap = S.mission.dialCap;
    // the costume change (the rig plays its screen and poof; the same costume again is ignored, so the dossier's own ask is harmless)
    react('outfit', rinfo({ outfit: OUTFIT[id], mission: id }));
    // per-mission palette (lair / hat-check / ballroom): scene.js reads it when it offers the hook; <html data-mission> is set by WP6
    try { if (scene && typeof scene.setMission === 'function') scene.setMission(id); } catch (e) { /* ignore */ }
    return null;
  }
  // caseOpen (Sealed Orders): the spin pays bank x dial in ONE beat, after the envelope has come forward and opened (WP6 layer, same event).
  // Until here the filed steps never touched the WIN counter (round.banked). The beat goes through the gate like any result: at or below the
  // cost it is the quiet one (ledgerTick, cream number, no win sound), above it the win sound, the heroine and the first "in the black".
  async function caseOpen(ev, tr) {
    const x = (Number(ev.win) || 0) / 100;
    await sleep(420); // the envelope comes forward (250 ms) and the flap opens: the amount lands with the OPENED plate
    if (S.destroyed) return null;
    const lvl = tr ? tr.level : round.level;
    trace('caseOpen', { bank: ev.bank, mult: ev.mult, win: ev.win, x, level: lvl });
    hook('onWin', x);
    M.hadResult = true;
    if (tr && tr.crossed) { M.celebrated = true; blackBeat(); }
    chip(chipTw, S.fmt(x), x > 0, lvl >= 1);
    if (lvl >= 1) {
      M.celebrated = true;
      cue('win', { combo: 1 });
      mascotWin(lvl >= 3 ? 'epic' : lvl >= 2 ? 'bigwin' : 'win', { ...rinfo(), level: lvl });
    } else {
      cue('ledgerTick', { quiet: true });
      react('quiet', rinfo({ level: 0 }));
    }
    return sleep(300);
  }

  // ---------- main loop ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // tr = the celebration gate's view of the event (R before / after, level, crossed, banked), computed by playBook before the layers run
  async function handle(ev, tr) {
    switch (ev.type) {
      case 'layout': return onLayout(ev);
      case 'reveal': if (wire) wire.clear(); syncBannerLayer(); return reveal(ev);
      case 'fusePath': wireFrame(ev); return wire ? wire.path(shiftRows(ev)) : null;
      case 'fuseBurn': return wire ? wire.burn(shiftRows(ev)) : null;
      case 'fuseBlast': react('blast', rinfo()); say('mascot.wire', 2000, true); return wire ? wire.blast(shiftRows(ev)) : null;
      case 'fuseFizzle': react('fizzle', rinfo()); return wire ? wire.fizzle(shiftRows(ev)) : null;
      case 'updateGlobalMult': return onGlobalMult(ev);
      case 'missionAssigned': return onMission(ev);
      case 'caseOpen': return caseOpen(ev, tr);
      case 'lightRoute': return null; // the spotlight route (geometric rows) is drawn by the WP6 Blackout layer before any outcome
      case 'winInfo': return showWins(ev, tr);
      case 'setTumbleWin': case 'updateTumbleWin': {
        if (round.banked) return null; // a filed (banked) amount is not the WIN of the round
        const x = (Number(ev.amount) || 0) / 100; hook('onWin', x); chip(chipTw, S.fmt(x), x > 0, round.level >= 1); return null;
      }
      case 'updateGrid': return null; // legacy per-cell grid event: the Mission Meter replaces it, ignored
      case 'tumbleBoard': return tumble(ev);
      case 'freeSpinTrigger': return fsTrigger(ev);
      case 'freeSpinRetrigger': return fsRetrigger(ev);
      case 'updateFreeSpin': {
        S.fsCur = Number(ev.amount) || 0; if (ev.total) S.fsTotal = Number(ev.total);
        hook('onFreeSpinCounter', S.fsCur, S.fsTotal); chip(chipFs, fsText(S.fsCur, S.fsTotal), true);
        if (!S.inFs) setBonusMode(true);
        if (meter) { if (!S.meterOn) await meterStart(S.gm || 1); else if (S.fsCur > 1) { try { meter.pulse(); } catch (e) { /* ignore */ } } }
        return sleep(S.fsCur > 1 ? 120 : 300);
      }
      case 'freeSpinEnd': return fsEnd(ev, tr);
      case 'setWin': {
        const x = (Number(ev.amount) || 0) / 100; hook('onWin', x);
        chip(chipCombo, '', false);
        if (x > 0) M.hadResult = true;
        if (tr && tr.crossed) { M.hadResult = true; M.celebrated = true; blackBeat({ chime: true }); } // a result that never went through winInfo
        const e = cel.endPlan('setWin', { R: tr ? tr.next : x, C: round.cost, spinX: x, inFs: S.inFs });
        if (e.kind === 'staircase') { chip(chipTw, '', false); await winBanner(x, { plan: e.plan }); }
        return null;
      }
      case 'setTotalWin': hook('onTotal', (Number(ev.amount) || 0) / 100); return null;
      case 'wincap': {
        hook('onTotal', (Number(ev.amount) || WINCAP * 100) / 100);
        if (tr && tr.crossed) { M.hadResult = true; blackBeat({ chime: true }); }
        const x = Math.max(WINCAP, (Number(ev.amount) || 0) / 100);
        await winBanner(x, { plan: cel.endPlan('wincap', { R: x, C: round.cost }).plan, max: true });
        return null;
      }
      case 'finalWin': hook('onTotal', (Number(ev.amount) || 0) / 100); chip(chipTw, '', false); chip(chipCombo, '', false); return null;
      default: return null;
    }
  }
  // The floor plan of the book (geo.js): a book without a `layout` event is Mezzanine; free spins are always Mezzanine (WP7_to_FRONT
  // item 1: reset on the first freegame reveal, not earlier, because the trigger positions still refer to the base plan).
  // The board is drawn in that plan (S.plan, applyPlan) from the `layout` event or, without one, at the reveal (syncPlan).
  function geoSync(ev) {
    if (!ev) return;
    if (ev.type === 'layout') geo.setLayout(ev);
    else if (ev.type === 'reveal' && ev.gameType === 'freegame') geo.setLayout(null);
  }
  let queue = Promise.resolve();
  function playBook(events, hooks) {
    const run = async () => {
      S.hooks = hooks || {};
      S.t0 = performance.now(); S.traceLog.length = 0;
      resetLayers();
      geo.setLayout(null);
      round.reset(S.cost); G.step = 0;
      S.mission = DEFAULT_MISSION; // old books (no missionAssigned) play the Briefing: dial 1 / +8 / cap 100, pay per step
      chipTw.classList.add('q'); chipTw.classList.remove('black');
      M.hadResult = false; M.celebrated = false; M.intro = false; M.base = 'think';
      react('spin', rinfo(), () => pose(S.inFs ? 'dance' : 'think'));
      let capped = false; // after the win cap the book still lists the remaining free spins (not evaluated): go straight to the end
      for (const ev of events || []) {
        if (S.destroyed) break;
        if (capped && ev && ev.type !== 'freeSpinEnd' && ev.type !== 'finalWin') continue;
        try {
          const tr = round.apply(ev);
          geoSync(ev);
          const lw = dispatchLayers(ev, layerCtx); // v2: null while LAYERS is empty
          await handle(ev, tr);
          if (lw) await lw;
        } catch (e) { console.error('render event', ev && ev.type, e); }
        if (ev && ev.type === 'wincap') capped = true;
      }
      S.skip = false; S.skipK = 0.04;
      resetLayers();
      geo.setLayout(null);
      camera.reset();
      if (wire && wire.active) wire.clear();
      fillHoles();
      if (S.meterOn && !S.inFs) meterEnd();
      M.intro = false; M.base = 'idle';
      if (S.inFs) pose('dance');
      else if (M.hadResult) { M.losses = 0; mBase(); } // a result, quiet or celebrated: neutral rest, never the dead-spin shrug
      else {
        // dead round: Mambo shrugs; every third one she also says something
        react('dead', rinfo(), () => pose('shrug', 1800));
        if (++M.losses >= 3) { M.losses = 0; say('mascot.lose', 2400, true); }
      }
      clearWins();
      chip(chipCombo, '', false); chip(chipTw, '', false);
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  // ---------- idle life: one random symbol gets a specular sweep every so often (cheaper than 30 permanent animations) ----------
  let sweepTimer = 0;
  sweepTimer = setInterval(() => {
    if (S.destroyed || document.hidden || motion.reduced) return;
    const cells = cellsEl.querySelectorAll('.cell:not(.win):not(.qw):not(.sct):not(.dim):not(.fuse):not(.adim)');
    if (!cells.length) return;
    for (let k = 0; k < 2; k++) {
      const el = cells[(Math.random() * cells.length) | 0];
      el.classList.add('sweep'); setTimeout(() => el.classList.remove('sweep'), 1200);
    }
  }, 650);

  // ---------- public ----------
  showBoard(DECOR);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fx.resize()) : null;
  if (ro) ro.observe(app);
  const api = {
    showBoard,
    playBook,
    setMultipliers() { /* legacy no-op: the Mission Meter is driven by updateGlobalMult events */ },
    setTurbo(b) { S.turbo = !!b; },
    // true = the replay fast-forward (x0.04); a number 0.04..1 = a gentler time factor (WP1_to_WP4 item 4)
    setSkip(b) { S.skip = !!b; S.skipK = typeof b === 'number' && b > 0 ? clamp(b, 0.04, 1) : 0.04; },
    setCost(c) { S.cost = Number(c) > 0 ? Number(c) : 1; round.setCost(S.cost); },
    // optional: the mode of the next books ('base' | 'bonus' | 'entrance_orders' | 'entrance_blackout'), read by the layers as ctx.mode
    setMode(m) { S.mode = typeof m === 'string' && m ? m : null; },
    setFormat(fn, tick) { if (typeof fn === 'function') { S.fmt = fn; S.fmtTick = typeof tick === 'function' ? tick : fn; } },
    resize() { fx.resize(); },
    // mascot hook for the UI layer (UNLEASH confirm)
    mascot: { pose, say, react(kind, info) { try { return !!(M.m && typeof M.m.react === 'function' && M.m.react(kind, info)); } catch (e) { return false; } } },
    // the motion store and the camera (read-only store; other render modules may subscribe to the hit-stop with camera.onFreeze)
    motion, camera,
    destroy() { S.destroyed = true; resetLayers(); camera.destroy(); try { if (M.m) M.m.destroy(); } catch (e) { /* ignore */ } clearTimeout(M.timer); clearInterval(sweepTimer); if (wire) wire.destroy(); if (meter) meter.destroy(); if (ro) ro.disconnect(); fx.clear(); },
    // exposed for dev/test harness
    _banner: banner, _winBanner: winBanner, _shake: shake, _state: S, _round: round, _mascot: () => M.m, _fx: fx,
    _trace(on) { S.traceOn = on !== false; if (S.traceOn) S.traceLog.length = 0; return S.traceLog; },
  };
  return api;
}

export default createRenderer;
