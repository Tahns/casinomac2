// Static source review for code-level guidelines.
import fs from 'node:fs';
import path from 'node:path';
import { FRONT } from './lib.mjs';

function files() {
  const out = [];
  const walk = (d) => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!['node_modules', 'tests', 'tools', 'fixtures', 'shots'].includes(f.name)) walk(p); } else if (/\.(js|mjs|html|css)$/.test(f.name)) out.push(p); } };
  walk(FRONT);
  return out.filter((p) => !/serve\.mjs$/.test(p));
}
const rel = (p) => path.relative(FRONT, p);
const OWNER = (f) => (/src\/(main|params|rgs|money|bet|input)\.js/.test(f) ? 'CORE' : /src\/(i18n|rules|replay)/.test(f) ? 'TEXT' : /index\.html|styles\.css|render|audio/.test(f) ? 'RENDER' : '?');

export async function staticReview() {
  const fl = files(); const res = [];
  const grep = (re, filter = () => true, ctx) => { const hits = []; for (const f of fl) { const lines = fs.readFileSync(f, 'utf8').split('\n'); lines.forEach((l, i) => { const t = l.trim(); if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; if (re.test(l) && filter(l, f)) hits.push(`${rel(f)}:${i + 1} (${OWNER(rel(f))}): ${t.slice(0, 130)}`); }); } return hits; };

  const hosts = grep(/https?:\/\/[^\s'"`)]+/i, (l) => !/w3\.org|localhost|127\.0\.0\.1/.test(l) && !/^\s*(\/\/|\*)/.test(l));
  res.push({ title: 'Hardcoded hosts / external http(s) URLs (should be none; RGS only via params.rgsUrl)', status: hosts.length ? 'FAIL' : 'PASS', lines: hosts });
  const localHosts = grep(/localhost|127\.0\.0\.1/i);
  res.push({ title: 'Hardcoded localhost references', status: localHosts.length ? 'FAIL' : 'PASS', lines: localHosts });
  const exth = grep(/<(script|link|img|iframe)[^>]+(src|href)=["']https?:|@import\s+url\(["']?https?:|url\(["']?https?:/i);
  res.push({ title: 'External scripts/styles/fonts/CDN in HTML/CSS', status: exth.length ? 'FAIL' : 'PASS', lines: exth });

  const dollar = grep(/(['"`])\$\1|['"`]\$['"`]|`\$\$\{|['"`]\$[0-9]|\+\s*['"]\$['"]|['"]\$['"]\s*\+/, (l, f) => !/money\.js$/.test(f) || true);
  res.push({ title: "Fixed '$' symbol (currency symbol must come from money.js per currency)", status: dollar.length ? 'FAIL' : 'PASS', lines: dollar });
  const dollarMoney = grep(/\$/, (l, f) => /money\.js$/.test(f) && /USD|symbol|\$['"`]/.test(l));
  res.push({ title: "money.js symbol table lines (review XSC/XGC have no '$')", status: 'INFO', lines: dollarMoney.slice(0, 12) });

  const dec = grep(/toFixed\(\s*2\s*\)|minimumFractionDigits:\s*2|maximumFractionDigits:\s*2|\/\s*100\b(?!0)/, (l, f) => true);
  res.push({ title: 'Fixed 2 decimals / /100 (JPY has 0 decimals; sub-cent payouts need more)', status: dec.length ? 'AT RISK' : 'PASS', lines: dec });
  const micro = grep(/\b1e6\b|1_?000_?000\b|\*\s*100\b/, (l, f) => !/money\.js|bet\.js|rgs\.js|params\.js/.test(f));
  res.push({ title: 'Micro-unit conversions outside money.js/bet.js (review)', status: micro.length ? 'AT RISK' : 'PASS', lines: micro });

  // end-round call sites with context
  const ctx = [];
  for (const f of fl) { const L = fs.readFileSync(f, 'utf8').split('\n'); L.forEach((l, i) => { if (/endRound\s*\(/.test(l) && !/^\s*(\/\/|\*)/.test(l) && !/(async\s+)?endRound\s*\(\)\s*\{|endRound:|export const endRound|endRound\(\)\s*\{/.test(l) && !/rgs\.js$/.test(f)) ctx.push({ at: `${rel(f)}:${i + 1} (${OWNER(rel(f))})`, ctx: L.slice(Math.max(0, i - 6), i + 1).map((x) => x.trim()).join(' ⏎ ').slice(0, 330) }); }); }
  const guarded = ctx.length > 0 && ctx.every((c) => /payoutMultiplier\s*>\s*0|payout\s*>\s*0|payoutMultiplier\s*>\s*0|\.active|win\s*>\s*0|totalWin\s*>\s*0|mult\s*>\s*0/.test(c.ctx));
  res.push({ title: 'end-round call sites (must be guarded: only payoutMultiplier > 0; never for 0x)', status: ctx.length === 0 ? 'AT RISK' : guarded ? 'PASS' : 'FAIL', lines: ctx.length ? ctx.map((c) => `${c.at}: ${c.ctx}`) : ['no endRound( call site found in game code'] });

  // keydown listeners
  const kd = grep(/addEventListener\(\s*['"]key(down|up|press)['"]/);
  const kdBad = kd.filter((l) => !/(window|globalThis|self)\.addEventListener/.test(l));
  const pd = grep(/preventDefault\(\)/, (l, f) => /input\.js|main\.js/.test(f));
  res.push({ title: 'keydown listeners (Space must be on window, preventDefault called)', status: !kd.length ? 'AT RISK' : kdBad.length ? 'AT RISK' : 'PASS', lines: [...kd.map((l) => 'listener ' + l), ...pd.map((l) => 'preventDefault ' + l)] });
  const sp = grep(/'Space'|" "|' '|keyCode\s*===?\s*32|key\s*===?\s*' '/, (l, f) => /input\.js|main\.js/.test(f));
  res.push({ title: 'Space key handling lines', status: 'INFO', lines: sp });

  // markup / css rules
  const idx = fs.existsSync(path.join(FRONT, 'index.html')) ? fs.readFileSync(path.join(FRONT, 'index.html'), 'utf8') : '';
  const css = fs.existsSync(path.join(FRONT, 'styles.css')) ? fs.readFileSync(path.join(FRONT, 'styles.css'), 'utf8') : '';
  const vm = /<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']+)["']/i.exec(idx) || /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']viewport["']/i.exec(idx);
  const title = (/<title>([^<]*)<\/title>/i.exec(idx) || [])[1];
  const rl = [];
  rl.push(`viewport meta: ${vm ? vm[1] : 'MISSING'}`);
  rl.push(`<title>: ${title}`);
  rl.push(`<html lang>: ${(/<html[^>]*lang=["']([^"']*)/i.exec(idx) || [])[1]}`);
  rl.push(`styles.css html,body overflow:hidden rule: ${/overflow\s*:\s*hidden/.test(css)}; height:100%: ${/height\s*:\s*100%/.test(css)}; touch-action:none: ${/touch-action\s*:\s*none/.test(css)}`);
  const badTitle = /megaways|boosted|enhanced|rtp|rush|bonanza|gates of|olympus|kraken/i.test(title || '');
  res.push({ title: 'HTML/CSS: viewport meta, title restrictions, overflow, touch-action', status: !vm || badTitle || !/overflow\s*:\s*hidden/.test(css) || !/touch-action\s*:\s*none/.test(css) ? 'FAIL' : 'PASS', lines: rl });
  const wallet = grep(/\/wallet\/|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/, (l, f) => !/rgs\.js$/.test(f));
  res.push({ title: 'Network calls outside rgs.js (must be none; replay must not touch wallet)', status: wallet.length ? 'AT RISK' : 'PASS', lines: wallet });

  // social i18n restricted words (static)
  try {
    const restricted = /(?<![A-Za-z])(bets?|betting|bonus\s+buy|bought|buy|cash|cost\s+of|credit|currency|deposit|fund|gamble|money|paid|pays?|payer|paytable|purchase|rebet|stake|total\s+bet|wager|withdraw|win\s+feature|place\s+your\s+bets|at\s+the\s+cost\s+of)(?![A-Za-z])/gi;
    const { fileURLToPath, pathToFileURL } = await import('node:url');
    const hits = [];
    const sp2 = path.join(FRONT, 'src/i18n/social.js');
    if (fs.existsSync(sp2)) {
      const m = await import(pathToFileURL(sp2).href + '?' + Date.now());
      const walk = (o, p) => { if (typeof o === 'string') { const h = o.match(restricted); if (h) hits.push(`${p}: ${[...new Set(h)].join(',')} :: ${o.slice(0, 80)}`); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p + '.' + k); };
      walk(m, 'social');
    }
    res.push({ title: 'src/i18n/social.js string values containing restricted words', status: hits.length ? 'FAIL' : 'PASS', lines: hits });
  } catch (e) { res.push({ title: 'social.js import', status: 'INFO', lines: ['could not import: ' + e.message] }); }
  return res;
}
