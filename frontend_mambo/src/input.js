// Pure (DOM-free) game logic: guards, end-round rule, autoplay, keyboard decision.
import { canAfford, totalCost } from './bet.js';

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
