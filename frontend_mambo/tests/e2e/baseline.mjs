// WP10 performance baseline (SYNTHESIS 9 row 10): p95 frame time of a 30-cell tumble chain (tumble step 8 to the end)
// under 4x CPU throttle, at the 4 Engine viewports, plus compositor layers and canvas memory. Reuses WP5's perf_tumble.mjs
// (one child process per viewport, own port, killed by that script).
//   node tests/e2e/baseline.mjs [--rate 4] [--runs 3] [--port 5876] [--json tests/e2e/baseline_m1.json]
// 36 cells (Annex, 6x6) waits for the M2 floor plans: the renderer has no layout support in M1, so it is reported as "not yet".
// Frame times only mean something on an idle machine: the load average is recorded next to every number.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const rate = String(A.rate || 4), runs = String(A.runs || 3), port = String(A.port || 5876);
const OUT = path.resolve(FRONT, A.json || 'tests/e2e/baseline_m1.json');
const VPS = [
  { name: '1024x576', args: ['--viewport', '1024x576'] },
  { name: '400x225', args: ['--viewport', '400x225'] },
  { name: '800x450', args: ['--viewport', '800x450'] },
  { name: '425x812', args: ['--viewport', '425x812', '--touch', '--dpr', '3'] },
];
const rows = [];
for (const vp of VPS) {
  const load = os.loadavg()[0];
  const tmp = path.join(os.tmpdir(), `wp10_baseline_${process.pid}_${vp.name}.json`);
  const r = spawnSync(process.execPath, [path.join(HERE, 'perf_tumble.mjs'), '--rate', rate, '--runs', runs, '--port', port, '--json', tmp, ...vp.args], { cwd: FRONT, encoding: 'utf8', timeout: 600000 });
  let sum = null; try { sum = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp); } catch (e) { /* failed run */ }
  const row = sum ? { viewport: vp.name, cells: 30, rate: Number(rate), p50: sum.p50, p95: sum.p95, p99: sum.p99, p95ok: sum.p95ok, idleLayers: sum.idleLayers, p90Layers: sum.p90Layers, maxLayers: sum.maxLayers, layersOk: sum.layersOk, canvasMB: sum.canvasMB, canvasOk: sum.canvasOk, loadAvg: +load.toFixed(2) }
    : { viewport: vp.name, cells: 30, error: (r.stderr || r.stdout || '').slice(-400), loadAvg: +load.toFixed(2) };
  rows.push(row);
  console.log(JSON.stringify(row));
}
rows.push({ viewport: 'all', cells: 36, status: 'not yet: floor plans (Annex 6x6) arrive in M2' });
const out = { date: new Date().toISOString(), host: { cpus: os.cpus().length }, budget: { p95: 16.6, layers: 45, canvasMB: 96 }, rows };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('written', path.relative(FRONT, OUT));
process.exit(rows.some((r) => r.error) ? 2 : rows.every((r) => r.cells === 36 || (r.p95ok && r.layersOk && r.canvasOk)) ? 0 : 1);
