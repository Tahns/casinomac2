// Agent Mambo v2: the celebration gate (SYNTHESIS 4 lever 1, 5 animations 4-7 and 20; WP4 owns this file after step 0).
//
// level(R, C) -> 0..3 from the running return R of the round and its cost C (both in the SAME unit: bet multiples, micro-units, anything):
//   L0  R <= C        quiet ledger tick only: nothing that looks, sounds or moves like a win (UKGC RTS 14F reading)
//   L1  C < R < 5C    wink
//   L2  5C <= R < 15C ripple
//   L3  R >= 15C      staircase
// R is the RUNNING return per cascade step, C = bet x mode cost (a 100x door round has C = 100 bets). Stage with payout / (bet x cost),
// never with the book's `winLevel`. Anything unusable (NaN, negative, C <= 0, missing) is level 0: when in doubt, stay quiet.
//
// Amounts in the books are integers (1/100 x of the bet), so the comparisons are exact; the 1e-9 relative slack only absorbs
// float noise from callers that divide first, and it always errs on the quiet side at the cost line.
//
// Everything below the frozen step-0 API is PURE (no DOM, no audio, no timers) so that node can test the decisions the event
// player takes:
//   createRound(cost)      running R of one round from the book events (base + spin), the "in the black" crossing, banked spins
//   stageWin / STAGE       what a winning cluster step may do at a level, expressed as calls on injected sinks
//   tumbleRecipe(level)    what the pop + refill of a winning step may do
//   endPlan(...)           what setWin / wincap / freeSpinEnd show: nothing, a staircase, the neutral Debrief or DECLASSIFIED
//   tierPlan(x, C)         the staircase: segments 0.85 s (first 0.9 s) + 0.55 s beats, last segment 0.9 + 0.5 log10(x / theta)
//   guardPose(name, level) a happy / celebrating heroine pose never plays at level 0

export const THRESHOLDS = Object.freeze({ l1: 1, l2: 5, l3: 15 }); // multiples of C
const EPS = 1e-9;

export function level(R, C) {
  const r = Number(R), c = Number(C);
  if (!Number.isFinite(r) || !Number.isFinite(c) || c <= 0 || r <= 0) return 0;
  if (!(r > c * (1 + EPS))) return 0;                 // strictly above the cost, or quiet
  if (r >= c * THRESHOLDS.l3 * (1 - EPS)) return 3;
  if (r >= c * THRESHOLDS.l2 * (1 - EPS)) return 2;
  return 1;
}

/** Only levels >= 1 may play a happy pose, a win sound, sparks, shake, banner or any other celebratory output. */
export const isCelebratory = (lvl) => lvl >= 1;

/** True exactly when the running return passes from "not above C" to "above C" (the one "in the black" beat, once per round). */
export function crossedCost(prevR, R, C) { return level(prevR, C) === 0 && level(R, C) >= 1; }

export default level;

// ------------------------------------------------------------------------------------------------------------------------------
// tier staircase (SYNTHESIS 5 row 7, juice J18): thresholds in multiples of the cost C
// ------------------------------------------------------------------------------------------------------------------------------
export const WINCAP = 5000;                                    // bet multiples (max win), the MAX WIN title
export const TIER_THRESHOLDS = Object.freeze([15, 30, 50, 100]); // x cost: BIG / MEGA / SUPER / EPIC
export const TIER_KEYS = Object.freeze(['win.big', 'win.mega', 'win.super', 'win.epic']);
export const SEGMENT_FIRST_MS = 900;   // first count segment (0 -> 15C)
export const SEGMENT_MS = 850;         // every other count segment
export const BEAT_MS = 550;            // the beat after each threshold: title stamp, stinger, hit-stop, one ring
export const HIT_STOP_MS = Object.freeze([0, 83, 100, 125]); // big / mega / super / epic (83 ms = one step of the 12 fps grid)
export const WINCAP_HIT_STOP_MS = 125;
export const TIER_TRAUMA = Object.freeze([0.25, 0.35, 0.45, 0.6]);
export const STAIRCASE_MAX_MS = 7500;  // acceptance: 5000x at cost 1 never takes longer than this (counts + beats)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Title key of an amount: x is a multiple of the bet, C the mode cost multiplier. Same thresholds as the v1 `tierFor`. */
export function tierOf(x, C) {
  const v = Number(x), c = Number(C) > 0 ? Number(C) : 1;
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= WINCAP) return 'win.max';
  const r = v / c;
  let k = null;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) if (r >= TIER_THRESHOLDS[i] * (1 - EPS)) k = TIER_KEYS[i];
  return k;
}

/**
 * The staircase of one amount.  x = amount (bet multiples), C = cost multiplier.
 *   steps: { type:'count', from, to, ms, tier } | { type:'beat', tier, key, ms, hitStop, trauma }   (ms in normal time; the player scales it with T())
 *   Below the first tier there is one plain count (700-1500 ms) and no beat.
 *   A count segment k runs from theta(k-1) to theta(k) in 0.85 s (the first one in 0.9 s); then comes a 0.55 s beat for the tier reached.
 *   The last segment (theta_last -> x) lasts 0.9 + 0.5 log10(x / theta_last) s, capped at 2 s; it is skipped when x is exactly on the threshold.
 *   totalMs counts segments and beats only (no hold, no MAX stamp): 2.4 s at 20x, 3.8 s at 45x, 5.2 s at 75x, 6.9 s at 500x, 7.4 s at 5000x.
 */
export function tierPlan(x, C) {
  const target = Number(x), c = Number(C) > 0 ? Number(C) : 1;
  if (!Number.isFinite(target) || target <= 0) return { target: 0, cost: c, steps: [], totalMs: 0, tiers: 0, finalKey: null };
  const rho = target / c;
  const reached = TIER_THRESHOLDS.filter((th) => rho >= th * (1 - EPS));
  const steps = [];
  if (!reached.length) {
    steps.push({ type: 'count', from: 0, to: target, ms: Math.round(clamp(700 + 450 * Math.log10(1 + rho), 700, 1500)), tier: -1 });
  } else {
    let from = 0;
    reached.forEach((th, i) => {
      const to = th * c;
      steps.push({ type: 'count', from, to, ms: i === 0 ? SEGMENT_FIRST_MS : SEGMENT_MS, tier: i });
      steps.push({ type: 'beat', tier: i, key: TIER_KEYS[i], ms: BEAT_MS, hitStop: HIT_STOP_MS[i], trauma: TIER_TRAUMA[i] });
      from = to;
    });
    if (target - from > target * 1e-9) {
      const last = reached[reached.length - 1] * c;
      steps.push({ type: 'count', from, to: target, ms: Math.round(clamp(SEGMENT_FIRST_MS + 500 * Math.log10(target / last), SEGMENT_FIRST_MS, 2000)), tier: reached.length - 1 });
    }
  }
  const totalMs = steps.reduce((a, s) => a + s.ms, 0);
  return { target, cost: c, steps, totalMs, tiers: reached.length, finalKey: tierOf(target, c) };
}

// ------------------------------------------------------------------------------------------------------------------------------
// the running return of one round, from the book events
// ------------------------------------------------------------------------------------------------------------------------------
/**
 * R of a round = base (confirmed by the last setTotalWin) + spin (the spin in progress), both in 1/100 x of the bet as in the books.
 *   winInfo adds its wins to the spin, updateTumbleWin / setTumbleWin / setWin set the spin, setTotalWin / wincap / freeSpinEnd / finalWin
 *   set the base (and close the spin), reveal rolls an unconfirmed spin into the base. A win flagged `meta.banked` (Sealed Orders, later
 *   milestone) is filed, not paid: it never moves R until the setWin that follows the case opening.
 * apply(ev) returns { type, prev, next, delta, level, crossed, banked } with R in bet multiples; `crossed` is true exactly once per round.
 */
export function createRound(cost = 1) {
  const st = { cost: Number(cost) > 0 ? Number(cost) : 1, base: 0, spin: 0, banked: false, black: false, level: 0 };
  const R = () => (st.base + st.spin) / 100;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  function apply(ev) {
    const prev = R();
    const type = ev && ev.type;
    switch (type) {
      case 'reveal': st.base += st.spin; st.spin = 0; st.banked = false; break;
      case 'winInfo': {
        const wins = Array.isArray(ev.wins) ? ev.wins : [];
        let tot = 0, banked = false;
        for (const w of wins) { if (w && w.meta && w.meta.banked) banked = true; else tot += num(w && w.win); }
        if (!wins.length) tot = num(ev.totalWin);
        if (banked) st.banked = true;
        st.spin += tot;
        break;
      }
      case 'updateTumbleWin': case 'setTumbleWin': if (!st.banked) st.spin = num(ev.amount); break;
      case 'setWin': st.spin = num(ev.amount); st.banked = false; break;
      case 'setTotalWin': case 'wincap': case 'freeSpinEnd': case 'finalWin': st.base = num(ev.amount); st.spin = 0; st.banked = false; break;
      default: break;
    }
    const next = R();
    let crossed = false;
    if (!st.black && crossedCost(prev, next, st.cost)) { st.black = true; crossed = true; }
    st.level = level(next, st.cost);
    return { type, prev, next, delta: next - prev, level: st.level, crossed, banked: st.banked };
  }
  return {
    apply,
    reset(c) { st.base = 0; st.spin = 0; st.banked = false; st.black = false; st.level = 0; if (c !== undefined) st.cost = Number(c) > 0 ? Number(c) : 1; },
    setCost(c) { st.cost = Number(c) > 0 ? Number(c) : 1; st.level = level(R(), st.cost); },
    get R() { return R(); }, get cost() { return st.cost; }, get level() { return st.level; }, get black() { return st.black; },
    get banked() { return st.banked; }, get spin() { return st.spin / 100; }, get base() { return st.base / 100; },
  };
}

// ------------------------------------------------------------------------------------------------------------------------------
// what a winning step may do at a level (the recipes) and the stager that calls the sinks
// ------------------------------------------------------------------------------------------------------------------------------
const rec = (o) => Object.freeze(o);
/**
 * STAGE[level]: L0 is the quiet result of juice J09: a lemon outline, the number in cream, ONE ledger tick. No win sound, sparks,
 * shake, ripple or happy pose. L1 adds the wink, L2 the ripple (amplitude 1.14), L3 the strongest ripple before the staircase.
 * `trauma` is the camera trauma of the step (+ `traumaPerCombo` for each combo step after the first, non-tier sources capped at .5 by the camera).
 */
export const STAGE = Object.freeze([
  rec({ level: 0, celebratory: false, ledgerTick: true, winSound: false, sparks: 0, trauma: 0, traumaPerCombo: 0, ripple: 0, tint: false, outline: 'lemon', popup: 'quiet', countMs: 0, overshoot: false, mascot: 'quiet', holdMin: 450, holdMax: 450 }),
  rec({ level: 1, celebratory: true, ledgerTick: false, winSound: true, sparks: 4, trauma: 0.10, traumaPerCombo: 0.04, ripple: 1.08, tint: true, outline: 'cream', popup: 'pop', countMs: 420, overshoot: false, mascot: 'win', holdMin: 780, holdMax: 1500 }),
  rec({ level: 2, celebratory: true, ledgerTick: false, winSound: true, sparks: 5, trauma: 0.16, traumaPerCombo: 0.04, ripple: 1.14, tint: true, outline: 'cream', popup: 'pop', countMs: 560, overshoot: true, mascot: 'bigwin', holdMin: 780, holdMax: 1500 }),
  rec({ level: 3, celebratory: true, ledgerTick: false, winSound: true, sparks: 6, trauma: 0.22, traumaPerCombo: 0.04, ripple: 1.20, tint: true, outline: 'cream', popup: 'pop', countMs: 700, overshoot: true, mascot: 'epic', holdMin: 780, holdMax: 1500 }),
]);
export const recipe = (lvl) => STAGE[lvl >= 3 ? 3 : lvl >= 1 ? lvl | 0 : 0];

/** The calls that make a result look, sound or move like a win; the quiet path (level 0) never makes one of them. */
export const CELEBRATORY_SINKS = Object.freeze(['winSound', 'sparks', 'trauma', 'ripple', 'inBlack', 'hitStop', 'banner', 'coins']);

/**
 * Stage one winning cluster step.  info = { level, crossed, combo, total (this step, bet multiples) }.
 * sinks (all optional): inBlack(info), outline({ color, tint }), popup({ kind, countMs, overshoot }), ledgerTick(), winSound({ combo }),
 * sparks(n), trauma(amount), ripple(amplitude), mascot(kind, info).  Returns { recipe, holdMs }.
 */
export function stageWin(sinks, info) {
  const s = sinks || {};
  const lvl = info && info.level >= 1 ? Math.min(3, info.level | 0) : 0;
  const r = STAGE[lvl];
  const combo = Math.max(1, (info && info.combo) | 0 || 1);
  const call = (name, ...a) => { const f = s[name]; if (typeof f === 'function') f(...a); };
  if (lvl >= 1 && info && info.crossed) call('inBlack', info);           // the one "in the black" beat comes first: from here on L1+ cues are allowed
  call('outline', { color: r.outline, tint: r.tint });
  call('popup', { kind: r.popup, countMs: r.countMs, overshoot: r.overshoot });
  if (r.ledgerTick) call('ledgerTick');
  if (r.winSound) call('winSound', { combo });
  if (r.sparks) call('sparks', r.sparks);
  if (r.trauma) call('trauma', r.trauma + r.traumaPerCombo * (combo - 1));
  if (r.ripple) call('ripple', r.ripple);
  call('mascot', r.mascot, { ...(info || {}), level: lvl });
  const total = Number(info && info.total) || 0;
  return { recipe: r, holdMs: Math.round(clamp(r.holdMin + (r.holdMax > r.holdMin ? total * 9 : 0), r.holdMin, r.holdMax)) };
}

/** What the pop + refill of a winning step may do. L0: the cells just leave, nothing else. */
export function tumbleRecipe(lvl) {
  const celebratory = lvl >= 1;
  return Object.freeze({ level: celebratory ? Math.min(3, lvl | 0) : 0, shards: celebratory, sparks: celebratory, ring: celebratory, popSound: celebratory, trauma: celebratory, brightness: celebratory });
}

/** A happy, celebrating or big-win heroine pose is blocked at level 0 (returns null = leave the pose alone). */
const HAPPY_POSES = new Set(['happy', 'bigwin', 'celebrate']);
export function guardPose(name, lvl) {
  if (HAPPY_POSES.has(name) && !(lvl >= 1)) return null;
  return name;
}

// ------------------------------------------------------------------------------------------------------------------------------
// the end of a spin / feature / round
// ------------------------------------------------------------------------------------------------------------------------------
/**
 * type: 'setWin' | 'wincap' | 'freeSpinEnd'.  R = running return of the round after this event, spinX = this spin's win, C = cost,
 * all in bet multiples.  Returns { kind, stamp, plan }:
 *   kind 'none'        nothing to show (the WIN counter already moved)
 *   kind 'staircase'   banner with the tier staircase (setWin at L3: spin >= 15C in the base game, 50C inside free spins; wincap always)
 *   kind 'filed'       neutral Debrief (freeSpinEnd with R <= C): card 250 ms, count 600 ms, stamp FILED, no rays, coins or cheer
 *   kind 'declassified' freeSpinEnd with R > C: stamp DECLASSIFIED + the staircase (a single count below 15C)
 */
export function endPlan(type, { R, C, spinX, inFs } = {}) {
  const c = Number(C) > 0 ? Number(C) : 1;
  const r = Number(R) || 0;
  const lvl = level(r, c);
  if (type === 'wincap') return { kind: 'staircase', stamp: null, plan: tierPlan(Math.max(WINCAP, r), c), level: 3 };
  if (type === 'freeSpinEnd') {
    if (lvl === 0) return { kind: 'filed', stamp: 'filed', plan: { target: Math.max(0, r), cost: c, steps: [{ type: 'count', from: 0, to: Math.max(0, r), ms: 600, tier: -1 }], totalMs: 600, tiers: 0, finalKey: null }, level: 0 };
    return { kind: 'declassified', stamp: 'declassified', plan: tierPlan(r, c), level: lvl };
  }
  // setWin
  const x = Number(spinX) || 0;
  if (lvl === 3 && x / c >= (inFs ? 50 : TIER_THRESHOLDS[0]) * (1 - EPS)) return { kind: 'staircase', stamp: null, plan: tierPlan(x, c), level: 3 };
  return { kind: 'none', stamp: null, plan: null, level: lvl };
}
