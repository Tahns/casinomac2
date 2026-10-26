// WP7: cross-check of the front-end geo.js against the math golden fixtures (read-only: geo.js is copied to a temp .mjs).
// usage: node math/games/agent_mambo/tools/check_geo_golden.mjs [path/to/geo.js]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const geoSrc = process.argv[2] || path.resolve(here, '..', '..', '..', '..', 'frontend_mambo', 'src', 'render', 'geo.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-check-'));
fs.copyFileSync(geoSrc, path.join(tmp, 'geo.mjs'));
const geo = (await import(pathToFileURL(path.join(tmp, 'geo.mjs')).href)).default;
const dir = path.resolve(here, '..', 'tests', 'golden') + path.sep;
let bad = 0, checks = 0;
const eq = (a, b, what) => { checks++; if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log('MISMATCH', what, JSON.stringify(a), JSON.stringify(b)); } };
for (const id of ['mezzanine', 'atrium', 'lobby', 'annex']) {
  const g = JSON.parse(fs.readFileSync(dir + `layout_${id}.json`, 'utf8'));
  const lay = geo.setLayout(g.events[0]);
  eq(lay.id, id, 'id'); eq(lay.cellCount, g.expect.cellCount, 'cellCount');
  // plan data identical to the canonical plan of geo.js
  eq(g.events[0].cells, geo.FLOOR_PLANS[id].cells, id + ' cells vs FLOOR_PLANS');
  eq(g.events[0].rows, geo.FLOOR_PLANS[id].rows, id + ' rows');
  const reveal = g.events[1];
  eq(reveal.board.map((c) => c.length), g.expect.revealColumnLengths, id + ' reveal lengths');
  eq(reveal.board.map((_, r) => geo.revealLength(r)), g.expect.revealColumnLengths, id + ' revealLength()');
  for (let r = 0; r < 6; r++) {
    for (let ci = 0; ci < g.expect.paddedToGeo[r].length; ci++) {
      eq(geo.toGeo(r, ci + 1), g.expect.paddedToGeo[r][ci], `toGeo ${id} ${r} ${ci + 1}`);
    }
    for (const [gr, p] of Object.entries(g.expect.geoToPadded[r])) eq(geo.toPadded(r, Number(gr)), p, `toPadded ${id} ${r} ${gr}`);
  }
  const win = g.events.find((e) => e.type === 'winInfo');
  win.wins.forEach((w, i) => {
    eq(w.positions.map((p) => ({ reel: p.reel, row: geo.toGeo(p.reel, p.row) })), g.expect.winGeoPositions[i], id + ' win positions');
    const o = w.meta.overlay; eq({ reel: o.reel, row: geo.toGeo(o.reel, o.row) }, g.expect.winOverlayGeo[i], id + ' overlay');
  });
  const tum = g.events.find((e) => e.type === 'tumbleBoard');
  eq(tum.explodingSymbols.map((p) => ({ reel: p.reel, row: geo.toGeo(p.reel, p.row) })), g.expect.tumbleExplodingGeo, id + ' exploding');
  // fuse cells are geometric: every one must be a cell of the plan
  const fp = g.events.find((e) => e.type === 'fusePath');
  eq(fp.cells.every((c) => geo.hasCell(c.reel, c.row)), true, id + ' fusePath cells exist');
  // geoGrid rebuilt from the reveal through geo.js
  const grid = Array.from({ length: lay.rows }, () => Array(6).fill(null));
  reveal.board.forEach((col, r) => col.slice(1, -1).forEach((s, i) => { grid[geo.toGeo(r, i + 1)][r] = s.name; }));
  eq(grid, g.expect.geoGrid, id + ' geoGrid');
}
console.log(bad === 0 ? `GEO.JS vs GOLDEN: ${checks} checks, 0 mismatches` : `GEO.JS vs GOLDEN: ${bad} MISMATCHES of ${checks}`);
process.exit(bad ? 1 : 0);
