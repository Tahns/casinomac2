# FIX render -> shell (round 1): K5 / H4-F5 idle forced layout every second

Trace (H4, idle page, 1024x576, 4x CPU): `src/ui/ledger.js` ticks every second and calls `fit(netEl)` / `fit(timeEl)` = `fitText`
(`src/main.js`). fitText already caches on `textContent.length | clientWidth`, but it READS `e.clientWidth` first on every call, which
forces a synchronous style + layout whenever anything on the page has invalidated style since the last frame (idle loops do, every
frame), and it rewrites `aria-label` each second.

Snippet for `src/main.js` (width from a ResizeObserver, no layout read on the tick):

```js
const fitW = new WeakMap();
const fitRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((es) => { for (const en of es) fitW.set(en.target, en.contentRect.width); }) : null;
function fitText(e) {
  let w = fitW.get(e);
  if (w == null) { w = e.clientWidth; fitW.set(e, w); if (fitRO) fitRO.observe(e); }
  if (!w) return;
  const key = e.textContent.length + '|' + Math.round(w);
  if (e.dataset.fit === key) return;
  e.dataset.fit = key;
  e.style.fontSize = '';
  const sw = e.scrollWidth;
  if (sw <= w + 0.5) return;
  const fs = parseFloat(getComputedStyle(e).fontSize) || 14;
  e.style.fontSize = Math.max(fs * 0.55, (fs * w) / sw * 0.97).toFixed(1) + 'px';
}
```

`src/ui/ledger.js` render(): only call `fit(timeEl)` when the TIME text length changed (give the TIME value
`font-variant-numeric: tabular-nums` in styles.css), and only set `aria-label` when NET changed (the per-second TIME in a live
label is noise for screen readers too).

Render-side (done in this round): the dust canvas of the scene is no longer cleared and redrawn when nothing changes, the symbol
idle clock no longer walks getAnimations() on every tick (cache dropped by a MutationObserver), the parallax layers are promoted only
while they move, the logo idle loops rest during a round, wire smoke / dust / stars hold fewer layers.
