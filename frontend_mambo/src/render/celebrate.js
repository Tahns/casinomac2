// Agent Mambo v2: the celebration gate (SYNTHESIS 4 lever 1; WP4 owns this file after step 0).
//
// level(R, C) -> 0..3 from the running return R of the round and its cost C (both in the SAME unit: bet multiples, micro-units, anything):
//   L0  R <= C        quiet ledger tick only: nothing that looks, sounds or moves like a win (UKGC RTS 14F reading)
//   L1  C < R < 5C    wink
//   L2  5C <= R < 15C
//   L3  R >= 15C      staircase
// R is the RUNNING return per cascade step, C = bet x mode cost (a 100x door round has C = 100 bets). Stage with payout / (bet x cost),
// never with the book's `winLevel`. Anything unusable (NaN, negative, C <= 0, missing) is level 0: when in doubt, stay quiet.
//
// Amounts in the books are integers (1/100 x of the bet), so the comparisons are exact; the 1e-9 relative slack only absorbs
// float noise from callers that divide first, and it always errs on the quiet side at the cost line.

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
