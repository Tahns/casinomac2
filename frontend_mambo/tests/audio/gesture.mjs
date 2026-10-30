// WP2 M2/M3: music default 5 % and "press to play" (nothing audible before the first user gesture), in the real game.
//   node tests/audio/gesture.mjs      (own ports 5934/5935 or PORTS="a,b"; exit 1 on a FAIL)
// G1 on load: /wallet/authenticate is sent with no gesture (Engine [181] is never blocked by an overlay), no AudioContext exists, the game
//    reaches idle, nothing covers the board waiting for a tap.
// G2 first gesture (a click on the page background): the AudioContext is created and running, the bed starts on the music bus.
// G3 music default 5 %: the Music slider reads 5 (settings dialog and audio.getVolume), the music bus gain = taper(5) (-42 dB), Master and
//    Effects stay 75 (unity); a stored value is kept (am_vol_music = 40 -> 40).
import { chromium, startServers, gameUrl, reporter, sleep } from '../heroine/m23_lib.mjs';

const { check, done } = reporter();
const servers = await startServers('5934,5935');
const browser = await chromium.launch();

const HOOK = `(() => {
  window.__ac = { made: 0, states: [] };
  for (const k of ['AudioContext', 'webkitAudioContext']) {
    const AC = window[k]; if (!AC) continue;
    window[k] = class extends AC { constructor(...a) { super(...a); window.__ac.made++; window.__ac.last = this; } };
  }
})();`;

async function session(store) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 }, serviceWorkers: 'block' });
  await ctx.addInitScript(HOOK);
  if (store) await ctx.addInitScript((s) => { try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, store);
  const page = await ctx.newPage(); const errors = []; const auth = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (/\/wallet\/authenticate/.test(r.url())) auth.push(Date.now()); });
  await page.goto(gameUrl(servers));
  await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 25000 }).catch(() => {});
  await sleep(1500);
  return { ctx, page, errors, auth };
}

{
  const { ctx, page, errors, auth } = await session();
  const pre = await page.evaluate(async () => {
    const { audio } = await import('/src/audio.js');
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return { made: window.__ac.made, ready: audio.ready, idle: document.body.classList.contains('state-idle'), center: el ? (el.closest('.board-wrap') ? 'board' : el.id || el.className) : null };
  });
  check('G1 on load: authenticate sent without a gesture, game idle, no AudioContext yet, nothing covers the board', auth.length >= 1 && pre.made === 0 && !pre.ready && pre.idle && pre.center === 'board', JSON.stringify({ auth: auth.length, ...pre }));

  await page.mouse.click(1010, 8); await sleep(900);
  const post = await page.evaluate(async () => {
    const { audio, taper } = await import('/src/audio.js');
    const e = audio._engine;
    return { made: window.__ac.made, state: window.__ac.last && window.__ac.last.state, ready: audio.ready, music: audio.getVolume('music'), master: audio.getVolume('master'), sfx: audio.getVolume('sfx'),
      musicGain: e ? e.musicBus.gain.value : null, sfxGain: e ? e.sfxBus.gain.value : null, want: taper(5), mood: audio.mood };
  });
  check('G2 first gesture: one AudioContext, running', post.made === 1 && post.state === 'running' && post.ready, JSON.stringify({ made: post.made, state: post.state }));
  check('G3 music default 5 %: slider 5, music bus = taper(5) (-42 dB), Master and Effects 75 (unity)', post.music === 5 && post.master === 75 && post.sfx === 75 && Math.abs(post.musicGain - post.want) < 1e-3 && Math.abs(post.sfxGain - 1) < 1e-3,
    JSON.stringify(post));

  await page.click('#btn-settings'); await sleep(600);
  const ui = await page.evaluate(() => { const i = document.getElementById('st-vol-music') || document.querySelector('#modal-settings input[type=range][id*=music]'); return i ? { v: i.value, t: i.getAttribute('aria-valuetext') } : null; });
  check('G3b the settings dialog shows Music at 5', ui && ui.v === '5', JSON.stringify(ui));
  check('G1b no console error', errors.length === 0, errors.slice(0, 2).join(' / '));
  await ctx.close();
}
{
  const { ctx, page } = await session({ am_vol_music: '40' });
  const v = await page.evaluate(async () => (await import('/src/audio.js')).audio.getVolume('music'));
  check('G3c a stored Music level is kept (40 stays 40)', v === 40, String(v));
  await ctx.close();
}

await browser.close();
done();
