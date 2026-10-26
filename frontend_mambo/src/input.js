// Pure (DOM-free) game logic: guards, end-round rule, autoplay, keyboard decision.
import { canAfford, totalCost } from './bet.js';
import { remainingRoundMs } from './settings.js';

export const BIG_WIN_MULT = 10; // x bet counts as "big win" for autoplay stop

// Pre-bet check: balance vs bet x mode cost. Applies to button, space, autoplay, unleash.
export function checkPlay(balance, bet, mode) {
  const cost = totalCost(bet, mode);
  if (!(bet > 0)) return { ok: false, reason: 'invalid', cost };
  if (!canAfford(balance, bet, mode)) return { ok: false, reason: 'insufficient', cost };
  return { ok: true, cost };
}

// /wallet/end-round only for paid rounds that are still active; never for 0x.
export function shouldEndRound(round) {
  if (!round) return false;
  if (!(Number(round.payoutMultiplier) > 0)) return false;
  return round.active !== false;
}

export function roundHasFeature(round) {
  const ev = (round && round.state) || [];
  return ev.some((e) => e && (e.type === 'freeSpinTrigger' || e.type === 'freeSpinEnd')) ||
    (round && String(round.mode || '').toLowerCase() === 'bonus');
}

// mode that needs a confirm dialog (cost > 2x)
export function needsConfirm(cost) { return cost > 2; }

// Space bar: returns 'spin' or null. Always preventDefault by caller.
export function spaceAction({ state, modalOpen }) {
  if (modalOpen) return null;
  return state === 'idle' ? 'spin' : null;
}

// v2 Space guard (Engine [228], jurisdiction `disabledSpacebar`, SYNTHESIS 6 "Space inside a modal toggles the control, not a spin").
// Pure decision for the window keydown listener: { spin, prevent }.
//  - replay, or no bet state yet (not authenticated): never a spin, never prevented (the replay buttons keep the native Space).
//  - a dialog is open: never a spin; the key is left alone when a control inside the dialog has the focus (so it toggles that
//    control, a tab, a switch ...), and prevented otherwise (no page scroll, nothing behind the dialog).
//  - `spacebar` capability off: never a spin, always prevented (also stops a focused SPIN button from clicking on Space).
//  - otherwise a spin only when idle and no autoplay is running; the key itself is always prevented (no page scroll).
export function spaceDecision({ state, modalOpen = false, replay = false, spacebar = true, hasBet = true, autoplayActive = false, controlFocused = false, repeat = false } = {}) {
  if (replay || !hasBet) return { spin: false, prevent: false };
  if (modalOpen) return { spin: false, prevent: !controlFocused };
  if (!spacebar) return { spin: false, prevent: true };
  if (repeat) return { spin: false, prevent: true };
  return { spin: spaceAction({ state, modalOpen: false }) === 'spin' && !autoplayActive, prevent: true };
}

// v2 round pacing (jurisdiction `minimumRoundDuration`, assumed milliseconds; SYNTHESIS 6): the next round never starts before
// t0 + minMs, whatever the turbo or autoplay setting. begin() marks the start of a round (the play request), remaining() is what
// is still to wait, wait() resolves when the minimum has elapsed (immediately when there is none).
export function createPacer({ now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let t0 = null;
  const remaining = (minMs) => (t0 === null ? 0 : remainingRoundMs(t0, now(), minMs));
  return {
    begin() { t0 = now(); },
    remaining,
    async wait(minMs) { const ms = remaining(minMs); if (ms > 0) await sleep(ms); return ms; },
    get started() { return t0; },
  };
}

export function createAutoplay() {
  const ap = {
    active: false, remaining: 0, stopBigWin: false, stopFeature: false, stopBelow: 0,
    start(s) {
      ap.active = true;
      ap.remaining = Math.max(1, Math.floor(Number(s.count) || 1));
      ap.stopBigWin = !!s.stopBigWin; ap.stopFeature = !!s.stopFeature;
      ap.stopBelow = Math.max(0, Number(s.stopBelow) || 0); // micro
    },
    stop() { ap.active = false; ap.remaining = 0; },
    // call after each round; returns true if autoplay should continue
    afterRound({ balance, round }) {
      if (!ap.active) return false;
      ap.remaining -= 1;
      const mult = Number(round && round.payoutMultiplier) || 0;
      if (ap.remaining <= 0) ap.stop();
      else if (ap.stopBigWin && mult >= BIG_WIN_MULT) ap.stop();
      else if (ap.stopFeature && roundHasFeature(round)) ap.stop();
      else if (ap.stopBelow > 0 && balance < ap.stopBelow) ap.stop();
      return ap.active;
    },
  };
  return ap;
}
