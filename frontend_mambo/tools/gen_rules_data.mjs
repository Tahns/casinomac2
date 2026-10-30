#!/usr/bin/env node
// Generates data/rules_data.json from the FINAL math. No deps. (WP11)
// Usage: node tools/gen_rules_data.mjs [--check]   (--check: exit 1 when data/rules_data.json is not what this script would write)
// Sources, all read-only:
//   game_config.py                       paytable, cluster tiers, free-spin awards, dial start / cap, wire parameters (v1 rules, unchanged)
//   library/publish_files/index.json     the modes and their cost (the upload set)
//   library/publish_files/lookUpTable_<mode>_0.csv   RTP and max win of every mode, recomputed here
//   library/shares.json                  weighted shares of the final tables: floor plans, missions, door medians, P(R > price)
//   library/analysis_v2.json             cross-check of the base numbers (P(R > stake), hit rate, trigger rate)
//   library/fixtures_out/books_base_sample.jsonl     the real layout and missionAssigned events (plan cells, dial step, lens)
// Nothing is invented: a number missing from these files is left out and the rules / door cards print nothing for it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const feRoot = path.resolve(here, '..');
const mathGame = path.resolve(feRoot, '../math/games/agent_mambo');
const LIB = path.join(mathGame, 'library');
const CHECK = process.argv.includes('--check');
const configPath = path.join(mathGame, 'game_config.py');
const src = fs.readFileSync(configPath, 'utf8');

const NAMES = { H1: 'Vault Safe', H2: 'Atomic Fizz', H3: 'Hi-Fi Vinyl', H4: 'Bongos', L1: 'Fedora', L2: 'Rotary Phone', L3: 'Magnifier', L4: 'Bow Tie', W: 'Mambo Star', S: 'Classified Dossier' };

// --- tier ranges: "t1, t2, t3, t4 = (5, 5), (6, 8), ..."
const tierDecl = src.match(/((?:t\d+\s*,\s*)+t\d+)\s*=\s*((?:\(\s*\d+\s*,\s*\d+\s*\)\s*,?\s*)+)/);
if (!tierDecl) throw new Error('tier declaration not found in game_config.py');
const tierNames = tierDecl[1].split(',').map((s) => s.trim());
const tierRanges = [...tierDecl[2].matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const tierMap = Object.fromEntries(tierNames.map((n, i) => [n, tierRanges[i]]));
const tiers = tierNames.map((n) => ({ id: n, min: tierMap[n][0], max: tierMap[n][1] }));

// --- pay_group entries: (t1, "H1"): 5.0
const payBlock = src.match(/pay_group\s*=\s*\{([\s\S]*?)\n\s*\}/);
if (!payBlock) throw new Error('pay_group not found');
const pays = {};
for (const m of payBlock[1].matchAll(/\(\s*(t\d+)\s*,\s*"(\w+)"\s*\)\s*:\s*([\d.]+)/g)) {
  (pays[m[2]] ||= {})[m[1]] = Number(m[3]);
}
const order = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4'];
const symbols = [];
for (const id of Object.keys(pays).sort((a, b) => order.indexOf(a) - order.indexOf(b))) {
  symbols.push({ id, name: NAMES[id] || id, kind: id.startsWith('H') ? 'high' : 'low', pays: tierNames.map((n) => pays[id][n] ?? null) });
}
symbols.push({ id: 'W', name: NAMES.W, kind: 'wild', pays: null });
symbols.push({ id: 'S', name: NAMES.S, kind: 'scatter', pays: null });

// --- freespin triggers
function parseDict(name) {
  const m = src.match(new RegExp(name + '\\s*=\\s*\\{([\\s\\S]*?)\\n\\s{8}\\}'));
  return m ? m[1] : '';
}
const fsBlock = parseDict('self\\.freespin_triggers');
const baseM = fsBlock.match(/basegame_type\s*:\s*\{([^}]*)\}/);
const freeM = fsBlock.match(/freegame_type\s*:\s*\{([^}]*)\}/);
const toPairs = (s) => [...s.matchAll(/(\d+)\s*:\s*(\d+)/g)].map((m) => ({ scatters: Number(m[1]), spins: Number(m[2]) }));
const freespinTriggers = baseM ? toPairs(baseM[1]) : [];
const retrigger = freeM ? toPairs(freeM[1]) : [];
const intOf = (re, d) => { const m = src.match(re); return m ? Number(m[1]) : d; };
const gmStart = intOf(/self\.gm_start\s*=\s*(\d+)/, 1);
const gmStep = intOf(/self\.gm_step\s*=\s*(\d+)/, 1);
const gmCap = intOf(/self\.gm_cap\s*=\s*(\d+)/, null);
// fuse_params (technical name kept; shown to players as the bomb-timer wire)
const fuseBlock = (src.match(/self\.fuse_params\s*=\s*\{([\s\S]*?)\n\s{8}\}/) || [, ''])[1];
const fuseOf = (key) => {
  const m = fuseBlock.match(new RegExp(key + '\\s*:\\s*\\{([^}]*)\\}'));
  if (!m) return null;
  const o = {};
  for (const x of m[1].matchAll(/"(\w+)"\s*:\s*(\d+)/g)) o[x[1]] = Number(x[2]);
  return o;
};
const fuseParams = { base: fuseOf('basegame_type'), free: fuseOf('freegame_type') };
const fp = fuseParams.base || fuseParams.free || {};
const fuseLen = fp.len || 8;
const fuseDetMin = fp.detmin || 3;
const fuseAdv = fp.adv || 1;
const fuseB0 = fp.b0 || 1;
const wincap = Number((src.match(/self\.wincap\s*=\s*([\d.]+)/) || [])[1]) || null;
const cfgRtp = Number((src.match(/self\.rtp\s*=\s*([\d.]+)/) || [])[1]) || null;

// --- modes: the published index.json (cost) + lookup tables (RTP, max win), recomputed with integer weights
const pubDir = path.join(LIB, 'publish_files');
const index = JSON.parse(fs.readFileSync(path.join(pubDir, 'index.json'), 'utf8'));
const shares = JSON.parse(fs.readFileSync(path.join(LIB, 'shares.json'), 'utf8'));
const analysis = fs.existsSync(path.join(LIB, 'analysis_v2.json')) ? JSON.parse(fs.readFileSync(path.join(LIB, 'analysis_v2.json'), 'utf8')) : null;
const r4 = (x) => Math.round(x * 1e6) / 1e6;
const modes = [];
const sources = [];
for (const m of index.modes) {
  const csv = path.join(pubDir, m.weights);
  let sw = 0n, swp = 0n, max = 0;
  for (const line of fs.readFileSync(csv, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [, w, p] = line.split(',');
    sw += BigInt(w); swp += BigInt(w) * BigInt(p); if (Number(p) > max) max = Number(p);
  }
  const rtp = Number((swp * 10n ** 12n) / sw) / 1e12 / 100 / m.cost;
  const sh = shares[m.name] || {};
  if (sh.rtp != null && Math.abs(sh.rtp - rtp) > 5e-6) throw new Error(`${m.name}: lookup RTP ${rtp} != shares.json ${sh.rtp}`);
  if (sh.maxWin != null && sh.maxWin !== max / 100) throw new Error(`${m.name}: lookup max ${max / 100} != shares.json ${sh.maxWin}`);
  modes.push({ name: m.name, cost: m.cost, rtp: r4(rtp), maxWin: max / 100 });
  sources.push(path.relative(path.resolve(feRoot, '..'), csv));
}

// --- door facts (SYNTHESIS 2 "How bought"): only these four numbers are ever printed on a door card
const DOOR_MODES = ['bonus', 'entrance_orders', 'entrance_blackout'];
const doorShares = {};
for (const name of DOOR_MODES) {
  const sh = shares[name]; const mode = modes.find((x) => x.name === name);
  if (!sh || !mode) continue;
  doorShares[name] = { medianX: sh.medianX, pGtPrice: sh.pGtPrice, rtp: mode.rtp, maxWin: mode.maxWin, mission: sh.mission || null, name: sh.name || null, books: sh.books };
}

// --- the real events: plans and missions as the books announce them
const sample = path.join(LIB, 'fixtures_out/books_base_sample.jsonl');
const planEv = {}, missionEv = {};
for (const line of fs.readFileSync(sample, 'utf8').split('\n')) {
  if (!line) continue;
  for (const e of JSON.parse(line).events) {
    if (e.type === 'layout' && !planEv[e.id]) planEv[e.id] = e;
    if (e.type === 'missionAssigned' && !missionEv[e.mission]) missionEv[e.mission] = e;
  }
}
const base = shares.base || {};
const PLAN_ORDER = ['mezzanine', 'atrium', 'lobby', 'annex'];
const layouts = PLAN_ORDER.filter((id) => base.layout && base.layout[id] != null && planEv[id]).map((id) => ({
  id, name: planEv[id].name, rows: planEv[id].rows, cells: planEv[id].cells, cellCount: planEv[id].cellCount, share: base.layout[id],
}));
const MISSION_INFO = { briefing: { name: 'The Briefing', door: 'Stage Door', mode: 'bonus' }, orders: { name: 'Sealed Orders', door: 'Coat Check', mode: 'entrance_orders' }, blackout: { name: 'Ballroom Blackout', door: 'Service Stairs', mode: 'entrance_blackout' } };
const missions = Object.keys(MISSION_INFO).filter((id) => base.mission && base.mission[id] != null && missionEv[id]).map((id) => {
  const e = missionEv[id];
  const o = { id, name: MISSION_INFO[id].name, door: MISSION_INFO[id].door, mode: MISSION_INFO[id].mode, share: base.mission[id], dialStart: e.dialStart, dialStep: e.dialStep, dialCap: e.dialCap, payTiming: e.payTiming };
  if (e.lens) o.lens = { w: e.lens.w, h: e.lens.h, mult: e.lens.mult };
  return o;
});
// cross-check the base numbers with the independent analysis
if (analysis && analysis.base) {
  const a = analysis.base;
  if (Math.abs(a.pGtStake - base.pGtStake) > 1e-4) throw new Error('pGtStake differs between shares.json and analysis_v2.json');
  if (Math.abs(a.hit - base.hit) > 1e-4) throw new Error('hit differs between shares.json and analysis_v2.json');
}
const baseFacts = { hit: base.hit, pGtStake: base.pGtStake, triggerOneIn: base.triggerOneIn };
const wincapAll = Math.max(...modes.map((m) => m.maxWin));
sources.push('library/shares.json (' + (shares.generated || '') + ')', 'library/analysis_v2.json', 'library/fixtures_out/books_base_sample.jsonl', 'game_config.py');
const data = { provisional: false, version: 2, symbols, tiers, freespinTriggers, retrigger, gmStart, gmStep, gmCap, fuseLen, fuseDetMin, fuseAdv, fuseB0, fuseParams,
  wincap: wincap || wincapAll, modes, shares: doorShares, layouts, missions, base: baseFacts, generatedFrom: sources.join(' + ') };
const text = JSON.stringify(data, null, 2) + '\n';
const outFile = path.join(feRoot, 'data/rules_data.json');
if (CHECK) {
  const cur = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (cur !== text) { console.error('data/rules_data.json is stale: run node tools/gen_rules_data.mjs'); process.exit(1); }
  console.log('data/rules_data.json is up to date');
} else {
  fs.mkdirSync(path.join(feRoot, 'data'), { recursive: true });
  fs.writeFileSync(outFile, text);
  console.log(`rules_data.json written: ${modes.map((m) => `${m.name} ${(m.rtp * 100).toFixed(4)}% max ${m.maxWin}x`).join(', ')}; ${layouts.length} floor plans, ${missions.length} missions, doors ${Object.keys(doorShares).join(' ')}`);
}
