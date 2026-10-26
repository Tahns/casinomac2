# Mambo (mascot) - Mabel "Mambo" Fontaine
Files (owned by MASCOT): `src/render/mascot.js`, `src/render/mascot.css` (auto-linked by the JS; may also be linked in index.html), `mascot-dev.html`, `tools/art/bake_mambo.mjs` -> `tools/art/mambo_poses.json`, `tests/shots/mascot_*.png`, this file. Spec: docs/mambo/DESIGN.md 2.3-2.4.

## API (unchanged from Old Gus)
```js
import { createMascot, POSES } from './render/mascot.js';
const m = createMascot(hostEl, { size: 200, variant: 'auto', bubble: 'top', pose: 'idle' /*, reduced: true*/ });
m.setPose('bigwin'); m.say('BIG WIN!', 2200); m.hideSay(); m.getPose(); m.destroy();
```
- Poses (same names): idle, think, happy, bigwin, shock, plunger, shrug, dance, celebrate. Unknown name -> idle. Re-setting a pose restarts it.
- `size` = height px (width = 6/7). SVG viewBox `-20 -24 240 280` (6:7, ground line at y 248 like Old Gus). `variant` full|small|auto (small if size <= 140: no halftone / earrings / fine lines, thicker outline 5.6 vs 4).
- Class hooks kept for page CSS: `.gus-wrap` (+ alias `.mambo-wrap`), `svg.gus` (+ `.mambo`, `.small`, `.still`, `.p-<pose>`), `.gus-bubble` (+ alias `.mambo-bubble`), host `#mascot-slot` untouched. Pose attribute: `svg[data-pose]`.
- `say()` uses textContent; the bubble is re-clamped into the viewport (JS `fit()`, sets `translate`) every call. Bubble positions: top (above the antenna), left, right; portrait and 400x225 media rules as before. It cannot know where other controls are: callers should mount the mascot (and choose `bubble`) so that the side it opens to is free.
- Reduced motion: `prefers-reduced-motion: reduce` removes all animation/transitions (poses stay as static drawings); `{reduced:true}` adds `.still` for the same effect.
- Host needs overflow visible (antenna "?" star, burst, confetti and bubble exceed the box by ~10-15%).

## Look
Ink #14102B, aubergine beehive #3B1F52 with 3 cream stripes, teal hairband, lemon antenna ball, flamingo hinged lid, vermilion swing dress with cream dots, lemon belt + 8-point buckle, cream opera gloves, teal kitten heels, indigo drum case with flamingo lid. Offset-print misregistration (fills shifted 2 px up-left), lilac halftone shadows, cream die-cut rim (CSS drop-shadow on `.fig`) so the aubergine hair stays readable on the dark indigo scene. Only `steps()` animation, squash and stretch.
Pose beats: idle heel tap every beat at 118 bpm (2.03 s loop); dance 132 bpm (0.909 s = 2 beats); plunger 3.04 s = 6 beats (slam on the beat at 50%); celebrate 3.6 s (heel spin first 36%, then raised seltzer, hold).

## Pose use (DESIGN 2.4)
idle rest; think spin/tumble; happy small win; bigwin big/epic win; shock scatter near-miss / 4th scatter / board dead with wire armed; plunger free-spins entry + wire blast; shrug dead round / wire fizzle; dance free-spins loop; celebrate free-spins end / max win.

## Dev / verify
`mascot-dev.html` (all poses 120+240, 90 px frame), `?pose=bigwin&size=300&say=HI`, `?sheet=250&still=1` (contact sheet), `&still=1` freezes animation. Shots: `tests/shots/mascot_<pose>_{1x,3x}.png`, `mascot_all.png`.
`cd tools/art && PW_DIR=/tmp/claude-0/pw node bake_mambo.mjs` bakes static per-pose SVG fragments (all 9 poses, no rim, no burst/confetti-in-flight) to `mambo_poses.json` (viewBox [-20,-24,240,280]); STORE art can use it in place of gus_poses.json.

## Needs from other owners / known flaws
- STYLES/INTEGRATION: `styles.css` still styles `#mascot-slot .gus` with height `--gh`; the beehive is taller than Old Gus's hat, so the slot may look slightly smaller; nothing required.
- STORE: `gen_store_art_*.mjs` still read `gus_poses.json`; switch to `mambo_poses.json` (keys idle...celebrate).
- Celebrate spin is a scaleX flip (faces mirror through the turn, cut-paper style), the case is mirrored too.
- At 90 px the face is only a few pixels: silhouette (beehive + red dress) carries the read; at 120 px eyes and lips are readable.
- Elbow joints are simple round caps (open outline), arms are tubes; no individual fingers except open-palm tick marks.
- Pose celebrate: le verre vert tenu ressemble a un cocktail (meme point de vigilance alcool que le symbole Atomic Fizz): a remplacer par un soda/verre a bulles ou un objet neutre.
