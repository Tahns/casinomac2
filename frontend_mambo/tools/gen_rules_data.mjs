#!/usr/bin/env node
// Generates data/rules_data.json from the math config + published lookup tables. No deps.
// Usage: node tools/gen_rules_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const feRoot = path.resolve(here, '..');
const mathGame = path.resolve(feRoot, '../math/games/the_unleashed_mine');
const configPath = path.join(mathGame, 'game_config.py');
const src = fs.readFileSync(configPath, 'utf8');

const NAMES = { H1: 'Ruby', H2: 'Sapphire', H3: 'Emerald', H4: 'Topaz', L1: 'Amethyst', L2: 'Pickaxe', L3: 'Lantern', L4: 'Hard hat', W: 'Gold Nugget', S: 'Dynamite' };

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
const maxMult = Number((src.match(/maximum_board_mult\s*=\s*(\d+)/) || [])[1]) || null;
const veinStart = Number((src.match(/fs_start_mult\s*=\s*(\d+)/) || [])[1]) || 1;
const fuseLen = Number((src.match(/"len"\s*:\s*(\d+)/) || [])[1]) || 8;
const fuseDetMin = Number((src.match(/"detmin"\s*:\s*(\d+)/) || [])[1]) || 3;
const veinStep = Number((src.match(/vein_step\s*=\s*(\d+)/) || [])[1]) || 1;
const wincap = Number((src.match(/self\.wincap\s*=\s*([\d.]+)/) || [])[1]) || null;
const cfgRtp = Number((src.match(/self\.rtp\s*=\s*([\d.]+)/) || [])[1]) || null;

// --- modes (config fallbacks)
const cfgModes = [];
for (const m of src.matchAll(/BetMode\(\s*name="(\w+)",\s*cost=([\d.]+)/g)) cfgModes.push({ name: m[1], cost: Number(m[2]) });
const maxWins = {};
const mw = src.match(/mode_maxwins\s*=\s*\{([^}]*)\}/);
if (mw) for (const m of mw[1].matchAll(/"(\w+)"\s*:\s*([\d.]+)/g)) maxWins[m[1]] = Number(m[2]);

// --- locate lookup tables
const candidates = [
  path.join(mathGame, 'library/publish_files'),
  path.join(feRoot, 'fixtures'),
];
let provisional = false;
const notes = [];
let modes = [];
let generatedFrom = 'game_config.py';
for (const dir of candidates) {
  const idx = path.join(dir, 'index.json');
  if (!fs.existsSync(idx)) continue;
  try {
    const manifest = JSON.parse(fs.readFileSync(idx, 'utf8'));
    const out = [];
    for (const md of manifest.modes) {
      const csv = path.join(dir, md.weights);
      if (!fs.existsSync(csv)) throw new Error('missing ' + md.weights);
      let sw = 0, swp = 0, max = 0;
      for (const line of fs.readFileSync(csv, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const [, w, p] = line.split(',').map(Number);
        sw += w; swp += (w * p) / 100; if (p > max) max = p;
      }
      const cost = Number(md.cost);
      out.push({ name: md.name, cost, rtp: swp / sw / cost, maxWin: max / 100, source: path.relative(path.resolve(feRoot, '..'), csv) });
    }
    modes = out;
    generatedFrom = path.relative(path.resolve(feRoot, '..'), dir) + '/index.json + ' + out.map((o) => path.basename(o.source)).join(', ') + ' + game_config.py';
    break;
  } catch (e) {
    notes.push(`skipped ${dir}: ${e.message}`);
  }
}
if (!modes.length) {
  provisional = true;
  notes.push('No published lookup tables found; modes use game_config.py values (rtp = configured target).');
  modes = cfgModes.map((m) => ({ name: m.name, cost: m.cost, rtp: cfgRtp, maxWin: maxWins[m.name] ?? wincap }));
}

const data = { provisional, symbols, tiers, freespinTriggers, retrigger, maxVeinMultiplier: maxMult, veinStart, veinStep, fuseLen, fuseDetMin, wincap, modes, generatedFrom };
if (notes.length) data.notes = notes;
fs.mkdirSync(path.join(feRoot, 'data'), { recursive: true });
fs.writeFileSync(path.join(feRoot, 'data/rules_data.json'), JSON.stringify(data, null, 2) + '\n');
console.log(`rules_data.json written (provisional=${provisional}) from ${generatedFrom}`);
