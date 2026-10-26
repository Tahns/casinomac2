// Bet state. Pure / DOM-free. All values micro-units.
// Mirrored from math index.json (modes: base cost 1, bonus cost 100).
export const MODE_COSTS = { base: 1, bonus: 100 };
// v2: the two later Secret Entrance doors cost 100x as well (SYNTHESIS 7). A door only appears in the picker once the rules
// data lists its mode (src/ui/doors.js); kept apart from MODE_COSTS, which tests pin to the v1 modes.
export const DOOR_MODE_COSTS = { entrance_orders: 100, entrance_blackout: 100 };

export function modeCost(mode) {
  const k = String(mode == null ? '' : mode).toLowerCase();
  const has = (o) => Object.prototype.hasOwnProperty.call(o, k);
  const c = has(MODE_COSTS) ? MODE_COSTS[k] : has(DOOR_MODE_COSTS) ? DOOR_MODE_COSTS[k] : undefined;
  return typeof c === 'number' ? c : 1;
}
// UNLEASH is sold at round prices and never below a minimum price (display-currency units, converted to micro).
// 50 units in most currencies; larger round numbers where 50 units is worth very little.
export const UNLEASH_MIN_PRICE = { USD: 50, EUR: 50, CAD: 50, GBP: 50, XSC: 50, XGC: 50, XEC: 50, MXN: 1000, JPY: 7500,
  // approx. 50 EUR in round numbers for other common currencies (to be confirmed per market)
  KRW: 75000, IDR: 800000, VND: 1300000, CLP: 50000, INR: 4500, PHP: 3000, THB: 1800, CNY: 400, ZAR: 1000, BRL: 300, PEN: 200, ARS: 50000, COP: 200000, TRY: 1700, RUB: 5000, NGN: 80000, PLN: 200, SEK: 550, NOK: 550, DKK: 370, CHF: 50, NZD: 90, AUD: 80 };
export function unleashMinPrice(currency) {
  const u = UNLEASH_MIN_PRICE[String(currency || '').toUpperCase()];
  return Math.round((typeof u === 'number' ? u : 50) * 1000000);
}
export function unleashAvailable(bet, currency, mode = 'bonus') { return totalCost(bet, mode) >= unleashMinPrice(currency); }
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
