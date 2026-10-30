// WP10 milestones 2 and 3: scripted Engine self-check (docs/research2/00_ENGINE_SELFCHECK_PROMPT.md) for the items a machine can
// reach that the guideline runner (run.mjs) does not already cover end to end, recomputed from the FINAL math files.
//   node tests/guidelines/engine_selfcheck.mjs [--no-browser]      (PORTS="game,rgs"; spawns and kills only its own servers)
// Writes tests/guidelines/REPORT_engine.md (or QA_REPORT=) and exits 1 on a FAIL.
// Items: MATH-MODES (index.json <= 20 modes, every events / weights file present), [25] RTP + max win per mode recomputed from the
// lookup tables == rules data, [27] cost per mode == index.json, [266] door figures (median, share above the price) == shares.json
// == recomputed from the tables, and shown on the door cards; [213] title words; [275] loader strings in the shipped source;
// [223] viewport meta; [185] disclaimer verbatim; EXT-SRC no external host in shipped source; [27]/[25] the rules screen lists the
// four modes with cost and RTP; [266]-UI door cards in the real game; [78] XEC / XSC / XGC door costs without "$".
import fs from 'node:fs';
import path from 'node:path';
import { FRONT, HERE, setSid, loadPlaywright, ensureServers, stopServers, Session, mockCfg, mockReset, sleep } from './lib.mjs';

const REPO = path.resolve(FRONT, '..');
const LIB = path.join(REPO, 'math/games/agent_mambo/library');
const REPORT = process.env.QA_REPORT || path.join(HERE, 'REPORT_engine.md');
const NO_BROWSER = process.argv.includes('--no-browser');
const J = JSON.stringify;
const results = [];
const rec = (id, status, title, ...ev) => { results.push({ id, status, title, ev: ev.flat().filter(Boolean) }); console.log(`${status.padEnd(8)} [${id}] ${title}\n    ${ev.flat().filter(Boolean).join('\n    ')}`); };

// ---------------- math (node only) ----------------
const index = JSON.parse(fs.readFileSync(path.join(LIB, 'publish_files/index.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(FRONT, 'data/rules_data.json'), 'utf8'));
const shares = JSON.parse(fs.readFileSync(path.join(LIB, 'shares.json'), 'utf8'));
const lut = (mode) => {
  const cands = [path.join(LIB, 'publish_files', `lookUpTable_${mode}_0.csv`), path.join(LIB, 'lookup_tables', `lookUpTable_${mode}_0.csv`), path.join(LIB, 'lookup_tables', `lookUpTable_${mode}.csv`)];
  const f = cands.find((c) => fs.existsSync(c));
  const rows = fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).map((l) => l.split(',').map(Number)).filter((r) => r.length >= 3 && Number.isFinite(r[1]));
  return { file: path.relative(REPO, f), rows };
};
const stats = {};
for (const m of index.modes) {
  const { file, rows } = lut(m.name);
  let W = 0, S = 0, max = 0, gt = 0; const pts = [];
  for (const [, w, p] of rows) { W += w; S += w * p / 100; if (p / 100 > max) max = p / 100; if (p / 100 > m.cost) gt += w; pts.push([p / 100, w]); }
  pts.sort((a, b) => a[0] - b[0]); let acc = 0, median = null; for (const [x, w] of pts) { acc += w; if (acc >= W / 2) { median = x; break; } }
  stats[m.name] = { file, books: rows.length, rtp: S / W / m.cost, max, pGtPrice: gt / W, median };
}
{
  const missing = index.modes.flatMap((m) => [m.events, m.weights]).filter((f) => !fs.existsSync(path.join(LIB, 'publish_files', f)) && !fs.existsSync(path.join(LIB, 'lookup_tables', f)) && !fs.existsSync(path.join(LIB, 'lookup_tables', f.replace(/_0\.csv$/, '.csv'))));
  rec('MATH-MODES', index.modes.length <= 20 && !missing.length ? 'PASS' : (missing.length ? 'AT RISK' : 'FAIL'), 'index.json: at most 20 modes, every events / weights file present',
    `${index.modes.length} modes: ${index.modes.map((m) => `${m.name} (cost ${m.cost})`).join(', ')}`, `files not found in publish_files or lookup_tables: ${J(missing)} (the release pack is built by tools/build/pack_math.mjs)`);
}
{
  const ev = []; let bad = 0;
  for (const m of index.modes) {
    const s = stats[m.name]; const r = (rules.modes || []).find((x) => x.name === m.name) || {};
    const ok = Math.abs(s.rtp - 0.96) < 5e-5 && Math.abs((r.rtp ?? -1) - s.rtp) < 5e-5 && s.max === 5000 && r.maxWin === s.max;
    if (!ok) bad++;
    ev.push(`${m.name}: RTP from ${s.file} (${s.books} rows) = ${(s.rtp * 100).toFixed(4)}%, rules ${((r.rtp ?? NaN) * 100).toFixed(2)}%; max win ${s.max}x, rules ${r.maxWin}x ${ok ? '' : '<-- FAIL'}`);
  }
  rec(25, bad ? 'FAIL' : 'PASS', 'RTP and max win per mode: recomputed from the lookup tables == rules data == 96.00% / 5,000x', ev);
}
{
  const ev = []; let bad = 0;
  for (const m of index.modes) { const r = (rules.modes || []).find((x) => x.name === m.name); const ok = !!r && r.cost === m.cost; if (!ok) bad++; ev.push(`${m.name}: index.json cost ${m.cost}, rules ${r && r.cost} ${ok ? '' : '<-- FAIL'}`); }
  const extra = (rules.modes || []).filter((r) => !index.modes.some((m) => m.name === r.name)).map((r) => r.name);
  if (extra.length) bad++;
  rec(27, bad ? 'FAIL' : 'PASS', 'every mode described with its cost, consistent with index.json (data side)', ev, `modes in the rules but not in index.json: ${J(extra)}`);
}
{
  const ev = []; let bad = 0;
  for (const mode of ['bonus', 'entrance_orders', 'entrance_blackout']) {
    const s = stats[mode]; const sh = shares[mode] || {}; const rd = (rules.shares || {})[mode] || {};
    const okMed = Math.abs(sh.medianX - s.median) <= 0.1 && rd.medianX === sh.medianX;
    const okP = Math.abs(sh.pGtPrice - s.pGtPrice) < 0.005 && Math.abs(rd.pGtPrice - sh.pGtPrice) < 1e-9;
    if (!okMed || !okP) bad++;
    ev.push(`${mode} (${sh.name}): median ${s.median}x from the table, shares.json ${sh.medianX}x, rules data ${rd.medianX}x; P(R > ${s ? index.modes.find((m) => m.name === mode).cost : '?'}x) table ${(s.pGtPrice * 100).toFixed(2)}%, shares.json ${(sh.pGtPrice * 100).toFixed(2)}%, rules data ${(rd.pGtPrice * 100).toFixed(2)}% ${okMed && okP ? '' : '<-- FAIL'}`);
  }
  rec('266', bad ? 'FAIL' : 'PASS', 'probabilities shown on the door cards match the math (data side)', ev);
}

// ---------------- shipped source (node only) ----------------
const listFiles = (dir) => fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(js|mjs|css|html|json)$/.test(f)).map((f) => path.join(dir, f));
const shipped = [path.join(FRONT, 'index.html'), path.join(FRONT, 'styles.css'), ...listFiles(path.join(FRONT, 'src')), ...listFiles(path.join(FRONT, 'data'))];
const read = (f) => fs.readFileSync(f, 'utf8');
{
  const re = /stake[\s_-]?engine|powered by stake|engine-?loader/i;
  const hits = shipped.filter((f) => re.test(read(f))).map((f) => path.relative(FRONT, f) + ': ' + (read(f).match(re) || [])[0]);
  const dist = path.join(FRONT, 'dist/front'); const dhits = fs.existsSync(dist) ? listFiles(dist).filter((f) => re.test(read(f))).map((f) => path.relative(FRONT, f)) : [];
  rec(275, hits.length || dhits.length ? 'FAIL' : 'PASS', 'no Stake Engine loader strings in the shipped source or the built front', `source files scanned: ${shipped.length}; hits ${J(hits)}; dist hits ${J(dhits)}`);
}
{
  const html = read(path.join(FRONT, 'index.html')); const title = (/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || '';
  const bad = /megaways|xways|enhanced|boosted|\brtp\b|%|gates of|bonanza|olympus|\brush\b|kraken|waylanders/i;
  rec(213, title && !bad.test(title) ? 'PASS' : 'FAIL', 'title without restricted words (trademark search stays a human item)', `<title>${title}</title>`);
  const meta = (/<meta[^>]+name=["']viewport["'][^>]*>/i.exec(html) || [])[0] || '';
  const okMeta = /maximum-scale=1/.test(meta) && /user-scalable=no/.test(meta);
  const touch = /touch-action:\s*(none|manipulation)/.test(read(path.join(FRONT, 'styles.css')));
  rec(223, okMeta || touch ? 'PASS' : 'FAIL', 'double-tap zoom off', meta, `touch-action none|manipulation in styles.css: ${touch}`);
  const D = 'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.';
  const where = shipped.filter((f) => read(f).replace(/\s+/g, ' ').includes(D)).map((f) => path.relative(FRONT, f));
  rec(185, where.length ? 'PASS' : 'FAIL', 'disclaimer verbatim in the shipped source', `found in ${J(where)}`);
  const ext = shipped.flatMap((f) => [...read(f).matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+|url\(\s*["']?https?:\/\/[^)]+|import\s*\(?\s*["']https?:\/\/[^"']+|fetch\(\s*["']https?:\/\/[^"']+/g)].map((m) => path.relative(FRONT, f) + ': ' + m[0].slice(0, 80)));
  rec('EXT-SRC', ext.length ? 'FAIL' : 'PASS', 'no external host referenced by src / href / url() / import / fetch in the shipped source', `hits ${J(ext.slice(0, 8))}`);
}

// ---------------- browser ----------------
if (!NO_BROWSER) {
  await ensureServers();
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const sessions = [];
  const sess = async (q, o) => { const s = new Session(browser); sessions.push(s); await s.open(q, o); return s; };
  try {
    // [266]-UI: the door cards show the same figures as the data
    setSid('engine-266'); await mockReset(); await mockCfg({ balance: 5e11 });
    let s = await sess({});
    await s.click('#btn-unleash', { force: true }); await s.waitVisible('#modal-confirm', 3000).catch(() => {});
    const cards = await s.page.evaluate(() => [...document.querySelectorAll('#door-cards .door')].map((d) => ({ mode: d.dataset.mode, text: d.innerText.replace(/\s+/g, ' ') })));
    const ev = []; let bad = cards.length === 3 ? 0 : 1;
    for (const c of cards) {
      const sh = shares[c.mode] || {}; const want = [String(sh.medianX), Math.round(sh.pGtPrice * 100) + '%', '96.00%', '5,000'];
      const miss = want.filter((w) => !c.text.includes(w)); if (miss.length) bad++;
      ev.push(`${c.mode}: "${c.text.slice(0, 160)}"${miss.length ? ' missing ' + J(miss) + ' <-- FAIL' : ''}`);
    }
    rec('266-UI', bad ? 'FAIL' : 'PASS', 'door cards in the real game show the figures of the math (median, share above the price, RTP, max win)', ev);
    await s.close();
    // [27]/[25] rules screen: the four modes with cost 100x and 96.00%
    setSid('engine-27'); await mockReset();
    s = await sess({});
    if (!(await s.visible('#btn-info')) && (await s.visible('#btn-menu'))) { await s.click('#btn-menu', { force: true }); await sleep(300); }
    await s.click('#btn-info', { force: true }); await sleep(800);
    let txt = '';
    for (const tab of await s.page.locator('[role=tab]').all()) { await tab.click({ force: true }).catch(() => {}); await sleep(150); txt += '\n' + (await s.page.evaluate(() => document.body.innerText)); }
    const names = { bonus: /stage door/i, entrance_orders: /coat check/i, entrance_blackout: /service stairs/i, briefing: /briefing/i, orders: /sealed orders/i, blackout: /ballroom blackout/i, floor: /annex/i, cost100: /100\s?[x×]/i, rtp: /96\.00\s?%/ };
    const missing = Object.entries(names).filter(([, re]) => !re.test(txt)).map(([k]) => k);
    rec('27-UI', missing.length ? 'FAIL' : 'PASS', 'rules screen: the three doors, their missions, the floor plans, 100x cost and 96.00% shown', `missing ${J(missing)} (text scanned ${txt.length} chars)`);
    await s.close();
    // [78] XEC / XSC / XGC: door costs and cards without "$"
    const ev78 = []; let bad78 = 0;
    for (const [cur, unit] of [['XSC', 'SC'], ['XGC', 'GC'], ['XEC', 'SC']]) {
      setSid('engine-78-' + cur); await mockReset(); await mockCfg({ currency: cur, balance: 5e11 });
      s = await sess({ social: 'true', currency: cur });
      await s.click('#btn-unleash', { force: true }); await s.waitVisible('#modal-confirm', 3000).catch(() => {});
      const t = await s.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      const ok = !t.includes('$') && new RegExp('100\\.00 ' + unit).test(t); if (!ok) bad78++;
      ev78.push(`${cur}: "$" present=${t.includes('$')}, "100.00 ${unit}" present=${new RegExp('100\\.00 ' + unit).test(t)}`);
      await s.close();
    }
    rec(78, bad78 ? 'FAIL' : 'PASS', 'social currencies on the door picker: "SC" / "GC", never "$"', ev78);
    const ce = sessions.flatMap((x) => [...x.consoleErrors, ...x.pageErrors]); const ex = sessions.flatMap((x) => x.externalReqs().map((r) => r.url));
    rec('CONSOLE-ENGINE', ce.length || ex.length ? 'FAIL' : 'PASS', 'no console / page error, no external request in these sessions', `errors ${J(ce.slice(0, 4))}; external ${J(ex.slice(0, 4))}`);
  } catch (e) { rec('RUNNER', 'FAIL', 'runner exception', e.stack || e.message); }
  await browser.close().catch(() => {});
  stopServers();
}

const count = (st) => results.filter((r) => r.status === st).length;
const md = [`# Engine self-check, scripted part (WP10, milestones 2 and 3)`, '', `Run ${new Date().toISOString()}. ${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('AT RISK')} AT RISK. The runtime checks of run.mjs ([181]-[243]) are in REPORT.md.`, '',
  '| Id | Verdict | Check | Evidence |', '|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.status} | ${r.title} | ${r.ev.join('<br>').replace(/\|/g, '\\|')} |`)].join('\n');
fs.writeFileSync(REPORT, md + '\n');
console.log(`ENGINE: ${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('AT RISK')} AT RISK -> ${path.relative(FRONT, REPORT)}`);
process.exit(count('FAIL') ? 1 : 0);
