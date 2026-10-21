// Bet state. Pure / DOM-free. All values micro-units.
// Mirrored from math index.json (modes: base cost 1, bonus cost 100).
export const MODE_COSTS = { base: 1, bonus: 100 };

export function modeCost(mode) {
  const c = MODE_COSTS[mode];
  return typeof c === 'number' ? c : 1;
}
export function totalCost(bet, mode) { return Math.round(bet * modeCost(mode)); }
export function canAfford(balance, bet, mode) { return Number(balance) >= totalCost(bet, mode); }

function deriveLevels(cfg) {
  const { minBet, maxBet, stepBet } = cfg;
  if (minBet > 0 && maxBet >= minBet && stepBet > 0) {
    const out = [];
    for (let v = minBet; v <= maxBet && out.length < 200; v += stepBet) out.push(v);
    if (out.length) return out;
  }
  const d = cfg.defaultBetLevel || minBet || maxBet;
  return d ? [d] : [];
}

export function createBetState(config, activeRound) {
  const cfg = config || {};
  let levels = Array.isArray(cfg.betLevels) ? cfg.betLevels.map(Number).filter((n) => n > 0) : [];
  levels = [...new Set(levels)].sort((a, b) => a - b);
  if (!levels.length) levels = deriveLevels(cfg);
  let bet = Number(cfg.defaultBetLevel);
  if (!levels.includes(bet)) bet = levels.find((l) => l >= (bet || 0)) ?? levels[levels.length - 1];
  if (activeRound && activeRound.active && Number(activeRound.amount) > 0) bet = Number(activeRound.amount);
  const st = {
    levels,
    get bet() { return bet; },
    min: levels[0], max: levels[levels.length - 1],
    canUp() { return levels.some((l) => l > bet); },
    canDown() { return levels.some((l) => l < bet); },
    up() { const n = levels.find((l) => l > bet); if (n !== undefined) bet = n; return bet; },
    down() { for (let i = levels.length - 1; i >= 0; i--) if (levels[i] < bet) { bet = levels[i]; break; } return bet; },
    // after an active round (resume) the next bet stays round.amount: nothing resets it.
    setFromRound(r) { if (r && Number(r.amount) > 0) bet = Number(r.amount); return bet; },
    cost(mode) { return totalCost(bet, mode); },
    canAfford(balance, mode) { return canAfford(balance, bet, mode); },
  };
  return st;
}
