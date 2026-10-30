// Flash / luminance capture (WP5 acceptance "<= 2 flashes per second in any 1 s window"; WP10 reuses it for the QA baseline).
//
//   node tests/e2e/flash_capture.mjs [--book busy|fixture|<devbook name>] [--fixture fixtures/books_bonus_sample.jsonl]
//        [--port 5861] [--turbo] [--max-ms 40000] [--motion full|calm|still] [--flash-reduced] [--json out.json]
//        [--viewport 1024x576]
//
// Records the page with the CDP screencast (every compositor frame, jpeg 320 px), decodes the frames in a blank page, computes the
// WCAG relative luminance of the whole frame and of 25 overlapping windows (each 1/3 x 1/3 of the frame, ~ the 10 degree area),
// and counts flashes: a flash is a pair of opposing changes of >= 0.10 relative luminance with the darker state < 0.80. It also
// reports saturated-red area (R / (R+G+B) >= 0.8) per frame. Exit code 1 when any window exceeds 2 flashes in a 1 s window.
// BASE=http://host:port reuses a running server instead of starting one.
import fs from 'node:fs';
import path from 'node:path';
import { args, startServer, launch, openHarness, bookFor, busiestFixture, screencast, luminanceSeries, countFlashes, ROOT } from './lib_capture.mjs';

const A = args();
const port = Number(A.port || 5861);
const [vw, vh] = String(A.viewport || '1024x576').split('x').map(Number);
const srv = await startServer(port);
const browser = await launch();
let exit = 0;
try {
  const { page, cdp, errors, ctx } = await openHarness(browser, srv.base, { viewport: { width: vw, height: vh }, motion: A.motion, flashReduced: A['flash-reduced'] ? true : undefined });
  let book;
  if (A.book === 'fixture' || A.fixture) {
    const file = path.resolve(ROOT, A.fixture || 'fixtures/books_bonus_sample.jsonl');
    const b = await busiestFixture(file, Number(A['max-events'] || 400));
    book = { events: b.events, label: `fixture ${path.basename(file)} id ${b.id} (${b.events.length} events, x${b.payoutMultiplier / 100})` };
  } else {
    book = await bookFor(page, A.book || 'busy');
  }
  if (!book) throw new Error('no book');
  const maxMs = Number(A['max-ms'] || 40000);
  const t0 = Date.now();
  const frames = await screencast(cdp, async () => {
    await page.evaluate(({ ev, turbo }) => { window.__done = false; H.play(ev, { turbo }).finally(() => { window.__done = true; }); }, { ev: book.events, turbo: !!A.turbo });
    await page.waitForFunction(() => window.__done === true, null, { timeout: maxMs, polling: 250 }).catch(() => {});
    await page.waitForTimeout(400);
  });
  const ms = Date.now() - t0;
  const series = await luminanceSeries(browser, frames);
  const N = series.length ? series[0].lum.length : 0;
  const per = [];
  for (let i = 0; i < N; i++) per.push(countFlashes(series, i));
  const worst = per.reduce((a, r, i) => (r.maxPerSecond > a.v ? { v: r.maxPerSecond, i } : a), { v: 0, i: 0 });
  const dts = series.slice(1).map((f, i) => f.t - series[i].t);
  const fps = dts.length ? 1000 / (dts.reduce((a, b) => a + b, 0) / dts.length) : 0;
  const redMax = Math.max(0, ...series.map((f) => Math.max(...f.red)));
  const govLog = await page.evaluate(async () => { try { const m = await import('../../src/render/flash.js'); return m.flash.log; } catch (e) { return []; } });
  const res = {
    book: book.label, motion: A.motion || 'default', flashReduced: !!A['flash-reduced'], turbo: !!A.turbo, viewport: `${vw}x${vh}`,
    wallMs: ms, frames: frames.length, captureFps: +fps.toFixed(1),
    maxFlashesPerSecond: worst.v, worstWindow: worst.i === 0 ? 'full frame' : `window ${worst.i}`,
    fullFrameFlashesPerSecond: per[0] ? per[0].maxPerSecond : 0,
    transitionsFullFrame: per[0] ? per[0].transitions.length : 0,
    maxSaturatedRedShare: +redMax.toFixed(3),
    governorFlashes: govLog.length,
    pageErrors: errors.slice(0, 10),
    pass: worst.v <= 2,
  };
  console.log(JSON.stringify(res, null, 2));
  if (A.json) fs.writeFileSync(path.resolve(A.json), JSON.stringify({ ...res, series: series.map((f) => ({ t: Math.round(f.t), L: +f.lum[0].toFixed(4) })) }, null, 1));
  if (!res.pass) exit = 1;
  await ctx.close();
} catch (e) { console.error(e); exit = 2; } finally { await browser.close(); srv.stop(); }
process.exit(exit);
