// Frame-time / layer / canvas budget check (WP5 acceptance; WP10 reuses it for the 4x CPU baseline).
//
//   node tests/e2e/perf_tumble.mjs [--rate 4] [--book tumble|busy|<devbook>] [--from-step 8] [--runs 3] [--port 5863]
//        [--viewport 1024x576] [--css "<extra css>"] [--json out.json] [--touch] [--dpr 3]
//
// Plays a 30-cell tumble chain (12 cascades on the 6x5 board) under CDP Emulation.setCPUThrottlingRate, records every rAF delta,
// and reports p50 / p95 / p99 of the frames from the start of tumble step `from-step` to the end of the chain, the compositor layer
// count (idle, median and max while playing, via the LayerTree domain) and the canvas backing-store bytes (all <canvas>).
// Budgets: p95 <= 16.6 ms (reported as `p95ok`; one 60 Hz vsync interval reads 16.67, so the gate is 16.7), promoted layers <= 45
// WHILE THE TUMBLE PLAYS (`layersOk` = idle <= 45 AND p90 of the layer counts sampled during the chain <= 45; `layersMaxOk` also
// reports the single worst frame), canvas <= 96 MB. Exit code 1 when a budget fails.
import fs from 'node:fs';
import path from 'node:path';
import { args, startServer, launch, openHarness, bookFor, layerProbe, pct } from './lib_capture.mjs';

const A = args();
const port = Number(A.port || 5863), rate = Number(A.rate || 4), runs = Number(A.runs || 3), fromStep = Number(A['from-step'] || 8);
const [vw, vh] = String(A.viewport || '1024x576').split('x').map(Number);
const srv = await startServer(port);
const browser = await launch();
const results = [];
let exit = 0;
try {
  for (let r = 0; r < runs; r++) {
    const { ctx, page, cdp, errors } = await openHarness(browser, srv.base, { viewport: { width: vw, height: vh }, css: A.css, dpr: Number(A.dpr || 1), touch: !!A.touch });
    const layers = await layerProbe(cdp);
    await page.waitForTimeout(800);
    const book = await bookFor(page, A.book || 'tumble', { steps: 12, minTumbles: Math.max(9, fromStep + 1) });
    if (!book) throw new Error('no book');
    const idleLayers = layers.now;
    if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    layers.start();
    const out = await page.evaluate(async ({ ev, fromStep }) => {
      const fr = [];
      let last = 0, on = true;
      const loop = (t) => { if (last) fr.push([t, t - last]); last = t; if (on) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      await H.play(ev, { turbo: false });
      on = false;
      const tumbles = H.marks.filter((m) => m.type === 'tumbleBoard');
      const t0 = tumbles[fromStep - 1] ? tumbles[fromStep - 1].t : (tumbles.length ? tumbles[tumbles.length - 1].t : 0);
      const tEnd = (H.marks.find((m) => m.type === 'setWin' && m.t > t0) || H.marks[H.marks.length - 1]).t;
      return { all: fr.map((f) => f[1]), win: fr.filter((f) => f[0] >= t0 && f[0] <= tEnd).map((f) => f[1]), cb: H.canvasBytes(), steps: tumbles.length, winMs: tEnd - t0 };
    }, { ev: book.events, fromStep });
    layers.stop();
    if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    results.push({ book: book.label, steps: out.steps, windowMs: Math.round(out.winMs), frames: out.win.length, p50: pct(out.win, .5), p95: pct(out.win, .95), p99: pct(out.win, .99), longest: Math.max(...out.win), p95all: pct(out.all, .95), idleLayers, medianLayers: layers.median, p90Layers: layers.p90, maxLayers: layers.max, canvasMB: out.cb.totalMB, canvases: out.cb.list, errors: errors.slice(0, 5) });
    await ctx.close();
  }
} catch (e) { console.error(e); exit = 2; }
await browser.close(); srv.stop();
if (results.length) {
  const med = (k) => pct(results.map((x) => x[k]), .5);
  const sum = {
    rate, runs: results.length, viewport: `${vw}x${vh}`, dpr: Number(A.dpr || 1), fromStep, book: results[0].book,
    p50: +med('p50').toFixed(1), p95: +med('p95').toFixed(1), p99: +med('p99').toFixed(1), longest: +med('longest').toFixed(1),
    p95ok: med('p95') <= 16.7, idleLayers: med('idleLayers'), medianLayers: med('medianLayers'), maxLayers: med('maxLayers'),
    layersOk: med('idleLayers') <= 45 && med('p90Layers') <= 45, p90Layers: med('p90Layers'), layersMaxOk: med('maxLayers') <= 45, canvasMB: med('canvasMB'), canvasOk: med('canvasMB') <= 96,
    perRun: results.map(({ canvases, ...x }) => x), canvases: results[0].canvases,
  };
  console.log(JSON.stringify(sum, null, 2));
  if (A.json) fs.writeFileSync(path.resolve(A.json), JSON.stringify(sum, null, 1));
  if (exit === 0 && !(sum.p95ok && sum.layersOk && sum.canvasOk)) exit = 1;
}
process.exit(exit);
