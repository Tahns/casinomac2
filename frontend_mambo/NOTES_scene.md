# NOTES_scene (SCENE + FX agent)

Done: scene.js, logo.js, fx.js, index.html (title, h1 default text, loading markup only). Shots: tests/shots/scene_*.png (idle, fs, loading, fx at 1024x576, 800x450, 400x225, 425x812).

## scene.js (exports unchanged: createScene(app) -> {host, redraw, shakeTargets, destroy}; new: setLair(on, instant))
Flat canvas layers, no AI. Base: sky, crescent, far/near skyline (lemon windows, coral CLUB sign that blinks), rooftop (parapet, water tower, CSS radar dish), 18 atomic sparkles (twinkle loop, steps), 8 blind-light bands (opacity .10, drift 6 px/s), palm leaf + bongo silhouettes, CSS satellite (40 s).
Lair (free spins): separate group revealed by a clip-path iris when `body.fs-mode` or `#app.fs-mode` toggles (750 ms, steps). Riveted teal round room, map screen, rotating radar wedge, 2 coral alarm lamps, coral blinds.
Palette tokens (all optional, defaults built in; STYLES may define them on :root / body.fs-mode):
base `--mb-sky --mb-sky2 --mb-far --mb-near --mb-dark --mb-window --mb-moon --mb-lilac --mb-lemon --mb-cream --mb-coral --mb-flamingo --mb-blind`;
lair `--mb-fs-bg --mb-fs-wall --mb-fs-ring --mb-fs-seam --mb-fs-rivet --mb-fs-dark --mb-fs-screen --mb-fs-lamp --mb-fs-blind --mb-fs-wedge`.
Old `--sc-*` variables are no longer read. Call `scene.redraw()` after changing tokens at runtime. Old `.lantern` CSS in styles.css is dead code. CSS injected as `<style id="mbs-css">`.

## logo.js
`buildLogo(host)` unchanged signature; builds `svg.stack` (landscape) and `svg.wide` (portrait; existing styles.css toggles them). AGENT / MAMBO are separate per-letter `<text>` with pinned textLength, accessible name "Agent Mambo". `initLoading()` runs on import: fills `#mb-ld-logo` and puts Mambo (`think`) into `#mb-ld-mascot`.

## Loading screen (index.html)
Self-contained `<style id="mb-ld-css">` inside `#loading` (overrides the old `#loading`/`.ld-*` rules in styles.css; those can be deleted). Wire-fuse bar: 8 lugs light in order on a 3.6 s steps(8) loop (not tied to real progress). Text uses `data-i18n="loading.text"`; TEXT should set it to "Preparing the mission...".

## fx.js (old API kept: resize shards sparks embers coins coinRain smoke ring glow clear count)
New: `stars(x,y,size,n,{colors})`, `burstBubble(x,y,size,word?)` (word defaults to i18n fx.pow/fx.boom/fx.wow), `confetti(x,y,size,n,{spread,angle,power,w,colors})`, `dust(x,y,size,n)`, `pieces(x,y,color,size,n)`,
`breakCell(x,y,size,color,{word,bubble,dust,pieces})` (80 ms flash + bubble + 3 paper pieces + stars + dust; call once per removed cell with the cell centre and its symbol colour; call `shake()` once per blast),
`iris(x,y,{dir:'close'|'open',ms,color}) -> Promise` ('close' holds until 'open' or clear()), `shake(amp,ms)` (#game + #scene), exported `FX_COLORS`. `sparks(x,y,null,...)` cycles the new palette. Caps: 240 live particles; each helper clamps n (confetti 30, pieces 6, stars 12, dust 5).

## Notes for others
- INTEGRATION: index.js still passes old colours ('#ffe27a', '255,160,60', 'fuse' class...) to fx.sparks/glow/ring; switch to FX_COLORS and use fx.breakCell/fx.shake for the blast.
- STYLES: favicon and `<meta theme-color>` in index.html still mining colours (not my section); the `.sfx` bubble classes teal/brick/mustard referenced by fx.js banner hook still come from styles.css.
- Black jagged marks under the board in portrait come from another layer (not scene).
