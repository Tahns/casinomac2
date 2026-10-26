# NOTES_wire (WIRE+METER agent)
Files: `src/render/wire.js`, `wire.css`, `meter.js`, `meter.css`, test page `wire-dev.html` (`?nodev=1`, `?turbo=1`; buttons path/burn3/blast/fizzle/meter), shots `tests/shots/wire_{d,p,t}_*.png` (d=1024x576, p=425x812, t=400x225). fuse.js/fuse.css are now dead files.

## Wire (INTEGRATION: replace the fuse block in index.js)
- `import { createWire } from './wire.js'` (alias `createFuse` also exported, same API: `path burn blast fizzle clear active destroy`).
- ctx fields (all optional except board/cellCenter): `board, cellCenter(c,r)->{x,y,size}, cellEl(c,r), emptyCell(c,r), fx, audio, pose, shake(amp,ms), flash(peak,ms,color), sleep, turbo(), reduced, t, destroyed(), symColor(c,r)`.
- `emptyCell(c,r)` MUST remove the symbol from `S.grid` (leave a hole) so the following `tumbleBoard` drops new symbols in. Without it the wire only hides the DOM node (`visibility:hidden`). `swapCell` is no longer used: no wild is created.
- `fx.breakCell(x, y, size, color, {reel,row})` is called if present (FX owns it: 3 paper pieces); otherwise the local fallback draws 3 cut-paper triangles + dust. Cells in the blast are flashed 80 ms, cream burst star with POW!/BAM!/BOOM! (first 3 cells), shake `ctx.shake(1.5, 250)`. Burnt path cells absent from the blast list (scatters) get a blue shield ring and stay.
- Event flow unchanged: `fusePath` only stores; the cable is drawn at the first `fuseBurn`. `reveal` -> `wire.clear()`. `fuseBlast {cells}` needs no `replaced`.
- Sounds: `audio.play('fuse')` (path, each burn, blast ticks that speed up), `'explosion'`, `'fizzle'` (new, harmless if unknown). Poses: think (path/burn), shock then plunger (blast), happy (after blast), shrug (fizzle).
- Caption keys (fallback English if missing): `fx.wire` "WIRE!", `fx.defuse` "DEFUSE!", `fx.pow`, `fx.bam`, `fx.boom`. Add `fx.bam`/`fx.wire`/`fx.defuse` to i18n (TEXT). Turbo/skip: `ctx.turbo()` removes travel, ticks and stagger.
- Board must be `position:relative` (layer is appended to it). Clock bomb sits on the end cell's corner; LED reads `n/8`.

## Meter
- `import { createMeter } from './meter.js'`; `const meter = createMeter(hostEl, {audio, reduced, t, cap?, bars?:20})`. Returns `{set(v,{animate,from:{x,y}}), pulse(), max(), show(bool), reset(), destroy(), value, el}`.
- `hostEl`: an element with `position:relative` and EXACTLY the symbol-grid box (e.g. the board's frame wrapper, overflow visible). The meter positions itself outside it: ladder to the left (`--mm-gap` var for the gap to the frame; set ~12-16px if the frame has piping), strip above (26 px), or badge at the top-left corner plus a 4 px bar under it. Layout is picked by media queries (`max-height:300px` badge, `max-aspect-ratio:4/5` strip, else ladder), re-evaluated on resize; `ctx.layout` forces one. STYLES must leave ~64 px left of the grid (desktop) and ~36 px above it (portrait).
- Wiring: `updateGlobalMult {globalMult}` -> `meter.set(v,{animate:true, from:{x,y}})` (from = client px of the winning cluster, optional; +1 chip flies to the badge). First value at free-spins start: `meter.show(true); meter.reset(); meter.set(1)`; each later free spin: `meter.pulse()` (KEPT tag). Cap reached: `meter.max()`. Free spins end / base game: `meter.show(false)`. Do not use for base game.
- Sound: `audio.play('meter', {level, note, octave})` on growth (note = level mod 10) and on max; AUDIO may map it to the pentatonic vibraphone.
- Keys: `meter.title` "Mission Meter", `meter.kept` "KEPT", `meter.max` "MAX". Tiers by level: 5/10/20/50 change hue (teal, lemon, coral, flamingo) and add a star ring. >20 levels the ladder scrolls. Reduced motion: no animation, static.
- Verified with Playwright at 1024x576, 425x812, 400x225: no console errors.
