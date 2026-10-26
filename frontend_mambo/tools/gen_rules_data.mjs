#!/usr/bin/env node
// Generates data/rules_data.json from the math config + published lookup tables. No deps.
// Usage: node tools/gen_rules_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const feRoot = path.resolve(here, '..');
const mathGame = path.resolve(feRoot, '../math/games/agent_mambo');
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

// --- modes (config fallbacks)
const cfgModes = [];
for (const m of src.matchAll(/BetMode\(\s*name="(\w+)",\s*cost=([\d.]+)/g)) cfgModes.push({ name: m[1], cost: Number(m[2]) });
const maxWins = {};
const mw = src.match(/mode_maxwins\s*=\s*\{([^}]*)\}/);
if (mw) for (const m of mw[1].matchAll(/"(\w+)"\s*:\s*([\d.]+)/g)) maxWins[m[1]] = Number(m[2]);

// --- locate lookup tables: publish_files (preferred), per mode lookUpTable_<mode>_0.csv (3 cols: id,weight,payout*100)
const pubDir = path.join(mathGame, 'library/publish_files');
let provisional = false;
const notes = [];
const modes = [];
const sources = [];
for (const cm of cfgModes) {
  const csv = path.join(pubDir, `lookUpTable_${cm.name}_0.csv`);
  if (fs.existsSync(csv)) {
    let sw = 0, swp = 0, max = 0;
    for (const line of fs.readFileSync(csv, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const [, w, p] = line.split(',').map(Number);
      sw += w; swp += (w * p) / 100; if (p > max) max = p;
    }
    modes.push({ name: cm.name, cost: cm.cost, rtp: swp / sw / cm.cost, maxWin: max / 100 });
    sources.push(path.relative(path.resolve(feRoot, '..'), csv));
  } else {
    provisional = true;
    notes.push(`no published lookup table for mode ${cm.name}; values from game_config.py (rtp = configured target)`);
    modes.push({ name: cm.name, cost: cm.cost, rtp: cfgRtp, maxWin: maxWins[cm.name] ?? wincap });
  }
}
const generatedFrom = sources.concat('game_config.py').join(' + ');
const data = { provisional, symbols, tiers, freespinTriggers, retrigger, gmStart, gmStep, gmCap, fuseLen, fuseDetMin, fuseAdv, fuseB0, fuseParams, wincap, modes, generatedFrom };
if (notes.length) data.notes = notes;
fs.mkdirSync(path.join(feRoot, 'data'), { recursive: true });
fs.writeFileSync(path.join(feRoot, 'data/rules_data.json'), JSON.stringify(data, null, 2) + '\n');
console.log(`rules_data.json written (provisional=${provisional}) from ${generatedFrom}`);
