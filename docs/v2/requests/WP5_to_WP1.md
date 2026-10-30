# WP5 (FX-WIRE) to WP1 (SHELL): layer budget in styles.css, Clearance Dial strings

## 1. styles.css: stop promoting every cell twice (layer budget <= 45 at 30 cells)

Why: `.cell{will-change:transform;transform:translateZ(0)}` and `.cell .sym-svg{will-change:transform}` promote 60 compositor layers
(2 per cell), and the idle `bob` loop runs on the compositor, so each symbol stays a layer even without will-change. In software
compositing (headless, many low-end phones) every layer is redrawn on every frame that has damage. Measured at 1024x576, idle,
harness `tests/fx/harness.html`: 94 layers with the WP5 files as committed, **33** with the snippet below (v1 was 174). The look is
identical: the idle bob animates a non-inherited custom property (`--mbt`, registered by `src/render/symbols.js`, universal syntax =
discrete; with `steps(1,end)` the value of each interval is its start value, exactly as before).

Replace the two lines (styles.css ~line 261-262):
```css
.cell{position:absolute;left:calc(var(--c)*16.6667%);top:calc(var(--r)*20%);width:16.6667%;height:20%;will-change:transform;transform:translateZ(0)}
.cell .sym-svg{display:block;width:100%;height:100%;padding:6%;overflow:visible;will-change:transform;transform-origin:50% 92%}
```
with:
```css
.cell{position:absolute;left:calc(var(--c)*16.6667%);top:calc(var(--r)*20%);width:16.6667%;height:20%}
.cell .sym-svg{display:block;width:100%;height:100%;padding:6%;overflow:visible;transform-origin:50% 92%}
```
and the idle bob (~line 266-267):
```css
.cell:not(.win):not(.dim):not(.fuse):not(.adim) .sym-svg{animation:bob 3.4s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.43s + var(--r,0)*-.71s)}
@keyframes bob{0%{transform:scale(1,1)}25%{transform:scale(1.025,.975)}50%{transform:scale(1,1)}75%{transform:scale(.985,1.02)}}
```
with:
```css
.cell:not(.win):not(.dim):not(.fuse):not(.adim) .sym-svg{transform:var(--mbt,none);animation:bob 3.4s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.43s + var(--r,0)*-.71s)}
@keyframes bob{0%{--mbt:scale(1,1)}25%{--mbt:scale(1.025,.975)}50%{--mbt:scale(1,1)}75%{--mbt:scale(.985,1.02)}}
html[data-quality="lite"] .cell .sym-svg,html[data-quality="calm"] .cell .sym-svg{animation:none!important}
```
(`--mbt` is registered in `symbols.js` with `@property --mbt{syntax:"*";inherits:false}`; without the registration it still works
but would inherit into the symbol parts, which also use `--mbt`.) The win squash and the scatter `fuse` shake stay as they are
(short, state-driven). Check: `node tests/e2e/perf_tumble.mjs --rate 1 --runs 1` prints `idleLayers`; the same file accepts
`--css "<snippet>"` to preview a CSS change before it lands.

`html[data-quality]` is written by `src/render/quality.js` (WP5): `full | lite | calm` from the frame-time EMA.

## 2. Strings (en.js / en_ui.js; player-facing name "Clearance Dial", SYNTHESIS 0.2)

```js
'label.meter': 'CLEARANCE DIAL',            // was 'MISSION METER' (index.js prints it under the Debrief / free-spins end banner)
'meter.title': 'Clearance Dial',            // aria-label of the dial (meter.js falls back to this text when the key is missing)
'meter.band.largo': 'Largo',
'meter.band.andante': 'Andante',
'meter.band.allegro': 'Allegro',
'meter.band.presto': 'Presto',
'fx.bam': 'BAM!',                           // wire blast word (wire.js falls back to 'BAM!'; v1 showed the humanised "Bam")
```
All pass the social word screen (no restricted word). `meter.js` and `wire.js` only call `t()` for keys that exist (`hasKey`),
because `t()` humanises a missing key ("meter.title" -> "Title").

## 3. Settings dialog wording (no change needed, FYI)
"Screen flash effects" off (`reduceFlash: true`) and Calm both make every flash a single 167 ms dissolve at <= 0.25; Still draws no
flash at all (`src/render/flash.js`). The quality governor never changes a stored setting.

## 4. Follow-up (WP5 fixer pass, 2026-10-30): frame budget

a) **The loading screen keeps animating after it is hidden.** `#loading` is only `visibility:hidden` after boot, and CSS animations
keep running under visibility:hidden: 13 main-thread animations (`mbn1..8` animate `fill`, `mbburn`, `mbspark`, `mbtick`, the
loading-logo `lgtw` stars) are serviced on every frame for the whole session. Measured idle at 4x CPU throttle (harness, 1024x576):
p50 frame 33 ms -> 16.8 ms with `#loading{display:none}`. Add to styles.css:
```css
body.rendered:not(.state-booting):not(.state-authenticating) #loading *,body.state-error #loading *{animation:none!important}
```
(or set `display:none` at the end of the fade). This is the largest single idle cost left on the page.

b) Item 1 still applies (drop the two `will-change` / `translateZ(0)` lines and make the bob animate `--mbt`). The bob no longer needs
its own phase rule beyond the snippet: `symbols.js` now runs ONE stepped clock for every looping symbol animation (paused CSS
animations whose delay carries a registered non-inherited `--mbclk`, written only when that element's step changes, on a 12 fps
grid) and its `CLOCK_CSS` already overrides the bob's play state and delay under `html[data-mbclock]`. With item 1 + 4a previewed
(`--css`), the 30-cell tumble at 4x went p50 33 -> 16.7 ms.
