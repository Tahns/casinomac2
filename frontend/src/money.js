// Currency formatting. Amounts are micro-units (1_000_000 = 1.00).
export const MICRO = 1_000_000;

const META = {
  USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],
  PHP: ['₱', 2], INR: ['₹', 2], IDR: ['Rp', 0], KRW: ['₩', 0], BRL: ['R$', 2], MXN: ['MX$', 2],
  DKK: ['KR', 2, true], PLN: ['zł', 2, true], VND: ['₫', 0, true], TRY: ['₺', 2], CLP: ['CLP', 0, true],
  ARS: ['ARS', 2, true], PEN: ['S/', 2, true], XGC: ['GC', 2, true], XSC: ['SC', 2, true], XEC: ['SC', 2, true],
};
// Social coins are shown "10.00 SC"; all other symbols per table above.

export function currencyMeta(currency) {
  const c = String(currency || '').toUpperCase();
  if (META[c]) { const [symbol, decimals, after] = META[c]; return { symbol, decimals, symbolAfter: !!after }; }
  try {
    const nf = new Intl.NumberFormat('en', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' });
    const parts = nf.formatToParts(1);
    const sym = parts.find((p) => p.type === 'currency');
    const dec = nf.resolvedOptions().maximumFractionDigits;
    if (sym) return { symbol: sym.value, decimals: dec, symbolAfter: false };
  } catch (e) { /* unknown code */ }
  return { symbol: c || '', decimals: 2, symbolAfter: true };
}

// Exact decimal string of micro-units, at least `minDec` decimals, trailing zeros trimmed
// down to minDec (so 5000 micro -> "0.005", never rounded to 0.00 or 0.01).
export function decimalString(micro, minDec) {
  let n = Math.round(Number(micro) || 0);
  const neg = n < 0; n = Math.abs(n);
  const whole = Math.floor(n / MICRO);
  let frac = String(n % MICRO).padStart(6, '0');
  while (frac.length > minDec && frac.endsWith('0')) frac = frac.slice(0, -1);
  if (frac.length < minDec) frac = frac.padEnd(minDec, '0');
  return (neg ? '-' : '') + whole + (frac.length ? '.' + frac : '');
}

export function formatMoney(micro, currency, opts = {}) {
  const meta = currencyMeta(currency);
  const s = decimalString(micro, meta.decimals);
  const neg = s.startsWith('-');
  const abs = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + (meta.symbolAfter ? `${abs} ${meta.symbol}` : `${meta.symbol}${abs}`);
}

// Plain number string without symbol (inputs etc.)
export function formatAmount(micro, currency) {
  return decimalString(micro, currencyMeta(currency).decimals);
}
