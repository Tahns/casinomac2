# Mambo, the animated vector heroine (Agent Mambo v2)

Author: ART agent (pass 1), ART2 agent (pass 2, see section 12). Status: working rig, five costumes, 12 poses, 20 clips, demo, test harness, board and mock-ups. Pass 2 (body redraw, gloves, crop, mirror) is committed; the running log is `docs/v2/NOTES_ART2.md`.

## 1. What was decided and why (brief history, the last brief wins)

1. First attempt: a hand-drawn static generator (kept only as `legacy/heroine_handdrawn_v0.mjs`, not used).
2. Intermediate brief: vectorise Higgsfield pictures. Dropped (never shipped).
3. **Final brief (user)**: the heroine must be a **clean hand-authored vector**, built as a **parametric, layered, animated rig** (eyes that move, morphing mouth, breathing, springs, procedural clips), costumes as swappable layers on the same body and face, character on the **left** of the grid, glamour not sexual. The Higgsfield sheets in `higgs/` are used **only as visual model sheets** (proportions, face, lashes, hair, hands, shoes, uniform details; coordinates were read off a grid overlay of `higgs/base_v2_b.png`). No pixel of AI output and no trace of it is in the shipped SVG: every shape is a hand-written Bezier path in `mambo_art.mjs` / `mambo_outfits.mjs`. `heroine_board.png` shows the model sheet next to the rig for comparison only.

## 2. Files (all under `docs/research2/art/`)

| File | Role |
|---|---|
| `mambo_art.mjs` | Palette, geometry helpers (`spl`, `lut`, `tubeD`), the shared body silhouette `SIL` + `garmentD`, primitives (outline + print offset + halftone + fine texture), 11 glove kinds, shoe, face (hair, face, eyes, brows, 8-viseme mouth), `faceLayout(turn)`. DOM-free. |
| `mambo_outfits.mjs` | The 5 costumes (skirt/lower garment, torso, headgear, face gear, props). |
| `mambo_rig.mjs` | **Runtime** (browser ES module, no dependency): `createHeroine`, `POSES`, `MOODS`, `CLIPS`, `CROPS`, `Ease`. |
| `mambo_compat.mjs` | Drop-in adapter for the current mascot hook (`createMascot`, `setPose('happy'|'bigwin'|'shock'|'shrug'|'plunger'|'celebrate'...)`, `say`). |
| `rig_demo.html` | Interactive demo: a button per clip, pose, outfit, mood, viseme, draggable look target, option toggles, frame cost readout. |
| `rig_dev.html`, `board.html`, `hero_still.html` | Static review pages used by the scripts below. |
| `compare.html`, `gloves.html`, `crop_test.html` | Pass 2 dev pages: model sheet vs rig vs overlay on a 10-unit grid (`?poses=idle,point&model=sheet&mode=1|2|4`), every glove kind, the waist-up crop at phone sizes. |
| `rig_test.mjs` | Playwright harness: console errors, per-frame cost, contact sheets of clips, expression sheets (looks, visemes, eyes). |
| `build_board.mjs`, `build_mockup.mjs`, `render_png.mjs` | Produce `heroine_board.png`, `heroine_mockup*.png`. |
| `heroine_board.png` | Model sheet vs rig, 12 poses, 7 close-up expressions, the 4 other costumes x 6 poses. |
| `sheets/*.png` | Contact sheets from `rig_test.mjs`: 8 gaze targets, 8 visemes, eye/lid states, 12-frame clips (winBig, shock, outfitChange, 12 more), readability at 100/300 px. |
| `heroine_mockup.png` (1024x576), `heroine_mockup_mobile.png` (425x812), `heroine_mockup_sheet.png` | Composites on real screenshots of `frontend_mambo`, heroine on the **left** of the grid. |

Run locally (any static server rooted at `docs/research2`): `python3 -m http.server 5731 --bind 127.0.0.1 --directory docs/research2`, then open `http://127.0.0.1:5731/art/rig_demo.html`. Tests: `node rig_test.mjs --out DIR --url http://127.0.0.1:5731/art/rig_demo.html --soak 1 --crops 1 --perf 1 [--clips winBig,shock --frames 12 --dt 0.1] [--looks 1 --visemes 1 --eyes 1] [--reduced 1]` (Playwright from `PW_DIR`, default `/tmp/claude-0/pw`). `--soak` = 14,670 steps (every pose and every clip on each of the 5 outfits), `--crops` (pass 2) = 7,120 more steps through the bust / head crops and the mirror option, both must report `nonFinite: []`.

Size (pass 2): about 130 KB of source in total (unminified). One costume = about 60 KB of SVG markup (the gloves now carry 11 kinds x 2 thumbs per hand). Measured cost (headless Chromium, JS only, update + render): **0.2-0.27 ms average, 2-3 ms worst frame** over 600 frames of the busiest clips (pass 1: 0.17 ms; the limbs are now rebuilt as tapered outlines every frame); the real-time demo shows ~0.6 ms average with confetti. Only attributes (`transform`, `d`, `opacity`, `display`, ellipse/rect numbers) are written, each only when its string changed. No layout reads in the frame loop (the only `getBoundingClientRect` is in `setLook({x,y})`).

## 3. Public API

```js
import { createHeroine } from './mambo_rig.mjs';
const h = createHeroine(el, { outfit: 'inspectrice', seed: 7, limited: 12, idle: true, reduced: undefined,
                              lookTargets: { grid: () => ({x, y}) /* container px */, meter: ..., spin: ... }, onCue: (name, clip) => {} });
h.setLook('grid' | 'player' | 'meter' | 'spin' | {x, y} | null)   // x,y = px inside `el`; null = free (mood default + saccades)
h.setMood('sly' | 'happy' | 'worried' | 'bored' | 'alert' | 'smug')
h.play('winBig', { speed: 1, hold: false, queue: false, onEnd })   // interruptible; 'outfitChange' accepts { outfit }
h.stop()                  // back to idle
h.setPose('point')        // hold a pose (poses never end by themselves)
h.setOutfit('casino', { animated: true })   // animated = paravent wipe clip, swap hidden behind the screen
h.wink('L'|'R'), h.blink('normal'|'half'|'slow'), h.setMouth(viseme), h.fx(name), h.impulse({jump, sq, cap, hair, shake})
h.set({param: value}), h.clear(), h.snap(), h.step(dt) /* manual stepping, tests */, h.render()
h.setCrop('full'|'bust'|'head'), h.setMirror(bool)   // pass 2, see section 12; also options { crop, mirror } of createHeroine; h.crop / h.mirror read the state
h.setReduced(bool), h.setIdle(bool), h.setLimited(hz), h.setSpeed(x), h.pause(), h.resume(), h.stats(), h.state(), h.destroy()
```
`opts.raf:false` gives a fully manual loop (used by every test and still render). Everything is deterministic for a given `seed` (mulberry32; blink/saccade/idle director use it, clips are data).

## 4. Rig structure (what a front-end can grab)

L / R always mean **screen** left / right. She faces **right** (toward the grid) with a slight 3/4 body turn: the centre-front line of the garments sits about 14 units right of x=200 (`SIL.cl`). viewBox `0 0 400 600` (the `crop` option changes the window), ground y=566, figure centred on x=200, head pivot (neck) at (200,236), shoulders (165,253)/(232,255), waist (200,304), hip (200,346), ankles (156,524)/(234,524). The torso art is drawn in a frame lifted by `TORSO_LIFT` = 6 units (collar under the chin). `HEAD_PIVOT`, `HEAD_SCALE` and `REST` live in `mambo_art.mjs`.

Group tree (all ids carry the per-instance prefix `mambo<N>-`; names below are without it):
`mirror > root > root-t` (`mirror` = the optional horizontal flip; `root-t` = translate / ground-pivot rotate / squash and stretch) then `shadow`, `lower` (`legs > leg-l/-r` each `-ink` + `-fill` + `-sh` shine, `skirt > skirt-t`, `shoes > shoe-l/-r > shoe-*-t`), `upper > upper-t` (waist-pivot lean + breath) containing `arms-back`, `torso > torso-t` (chest breath; costume layer), `head > head-t` (neck-pivot tilt, offsets) with `hair-mass` (+ `hair-tuft` revealed when the cap pops), `hair-curl-l/-r`, `face`, `features` (`cheeks`, `nose > nose-s`, `eye-l`, `eye-r`, `brow-l`, `brow-r`, `mouth > mouth-s`), `face-gear` (glasses), `cap` (cap / fedora / aviator helmet), `hair-front` (fringe curl), then `arms-front > arm-l, arm-r` (`-ink`/`-fill` tapered noodle outline, `-tx` print texture, `-tri/-trf` cuff band, `hand-l/-r > hand-*-t > prop-slot-* + g-<l|r>-<kind>` with `kind` in `fist relax hip open splay point flat palm pinch thumbup wave`, each with two thumbs `-ta` / `-tb` cross-faded by the runtime), `prop-store`, and a separate `fx` layer (particles, paravent).

Per eye (`eye-l`, `eye-r`): `-sclera`, `-iris` (group: `-iris-disc`, `-pupil`, `-glint`, turquoise rim light), `-stars` (star eyes), `-lower` (lower lid), `-lidfill` (upper lid / eyeshadow), `-upper` (upper outline, fades as the lid closes), `-lashline` (heavy lid line with liner flick), `-lashes` (5 lashes near eye, 3 far eye, direction flips from up-out to down-out as the lid closes); brows are independent paths. Mouth: `m-lips`, `m-cav` (cavity, clipped via `m-clipd`), `m-teeth`, `m-tongue`, `m-seam`, `m-gloss`, `m-dimple`.

Animation channels (all springs, `state()` returns the live values): root `rx rrot sq spin`, body `hipX hipTilt ux uy lean shr sho` (sho = shoulder-line tilt of the torso and the arm roots, the S-curve control), legs `lax lay lb1 lb2 lsr lsf` / `rax ...` (ankle offsets, noodle bends, shoe rotation and flip), head `hx hy htilt turn` (turn = 3/4 face turn, moves and foreshortens the features), eyes `uL uR` (lid openness), `joyL joyR`, `lowL lowR`, `slL slR` (lid slant), `wide pup stars lookx looky`, brows `bL{y,r,a}` `bR{y,r,a}`, cap `cy cr`, arms `al{x,y,b1,b2,r,sx,sy}` / `ar{...}` (wrist target, two noodle bend values, glove roll and squash), `acc` (absolute prop angle), `beam`, `blush`. Discrete channels: glove kind per hand (11 kinds), prop hand, prop2 hand, layer front/back, viseme. Secondary springs (damped, driven by head linear and angular acceleration plus a slow wind term): `hair`, `curlL`, `curlR`, `bangs`, `cap`, `skirt`, `whistle`, `scarf1`, `scarf2`.

Pivots to animate natively from outside: neck (200,225), waist (200,304), hip (200,346), shoulders, ankles (166,524)/(238,524); `PIVOTS`-style table is `REST` in `mambo_art.mjs`.

## 5. Animation features (what the engine does)

* **Eyes**: tracking with spring easing (stiff, saccade-like), micro-saccades every 0.6-2 s (+-0.1 look units, occasionally doubled), randomised blink every 2-6 s (88 % normal, 18 % half-blink, 12 % slow sultry blink, occasional double blink), lids half-closed by default (near eye 0.5, far eye 0.88: the model's sly asymmetry), wide for shock (`wide`, tiny pupils), star eyes for big wins, joy arcs for laughter, wink per eye (lid + lower lid + brow), brows raised or lowered independently. The head follows the gaze a little (turn and tilt lag behind the eyes).
* **Mouth**: 8 visemes (`smirk grin laugh oh whistle pout wry teeth`) with identical topology (8-point lip ring, 8-point cavity, teeth, tongue, gloss, seam, dimple), tweened as number arrays (90 ms ease) and rebuilt into closed Catmull-Rom paths. Closed mouths show the lip seam, open ones the cavity.
* **Body**: breathing (3.7 s, chest and shoulders), weight shift (idle director), hip sway, head tilt with lag, hair curls, fringe, cap, skirt hem, whistle chain/whistle (and scarf tails for the vault outfit) on damped springs, arm follow-through (springs with overshoot), hand smear (stretch along the motion when a wrist is fast), root squash and stretch, ballistic jumps with landing squash and dust puffs, hat pop with settle.
* **Limited-animation feel**: primary channels (body, legs, arms, head, root) are sampled at 12 Hz (`limited`), eyes, brows, mouth, secondary springs and particles run at full rate. `h.setLimited(0)` for smooth.
* **Engine**: requestAnimationFrame, fixed 1/120 s spring solver (max 10 sub-steps per frame), easing library `Ease` (linear, in, out, inOut, outBack, snap, steps(n), parabola, pulse), clip player with **named tracks** (`pose, mood, set, mouth, look, impulse, fx, wink, blink, spin, outfit, cue`, compiled to a time-sorted event list; events are also accepted directly), interruptible clips (a new clip simply retargets the springs, so blending and follow-through are automatic), tween manager for particles and the paravent, particle pool (sparkle, dash lines, drop, puff, confetti, chip, bubble, note, ring, question mark), pause on `document.hidden`, delta clamp 50 ms.
* **Reduced motion** (`prefers-reduced-motion` or `{reduced:true}`): no springs, no breathing, no saccades, no blink, no jumps or particles except sparkles; poses swap instantly (clips still run, as pose swaps with their holds). Tested: no console error.

## 6. Poses (hold) and clips (events)

Poses (12 asked + `think`): `idle point smallwin bigwin shock shrug anticipation whistle impatient laugh salute curtsy think` (+ `rest`, the neutral skeleton used for comparisons). Each pose is only a sparse set of channel targets over the mood baseline, so every costume gets it for free; props follow the hand (prop angle is given as an **absolute** angle per pose and converted per costume: flashlight / magnifier follow the arm, fan and test tube stay upright).

Clips (20): `spinStart scatterTease winSmall winBig megaWin shock lose freeSpinStart freeSpinEnd curtsy meterMilestone` (game) and idle gags `checkFlashlight blowWhistle examineNails glancePlayer hairFlip shiftWeight`, plus `impatient laugh outfitChange`. Idle director: after 5-12 s without a clip it plays one gag (weight shifts twice as likely; whistle gag only for the inspectrice).

### Wiring to the book events (current frontend names)

| Game moment (event / state in `render/index.js`) | Call |
|---|---|
| Spin button pressed / reels spinning | `h.setLook('spin')`, `h.play('spinStart')` (holds until the next call), `h.setLook('grid')` once the board is shown |
| `reveal` with 2 scatters on the board (anticipation, `antic`) | `h.play('scatterTease')` (eyes dart between reels, leans in; holds) |
| 3rd scatter lands / near-miss | `h.play('shock')` |
| `winInfo` / `setTumbleWin` small win (< 15x) | `h.play('winSmall')` |
| Win tier BIG (>= 15x of the cost) / MEGA (30x) / SUPER (50x) | `h.play('winBig')`; for MEGA and SUPER chain `h.play('winBig')` then `h.fx('confetti')` after 1 s if wanted |
| Win tier EPIC (100x) and `wincap` (MAX) | `h.play('megaWin')` (spin, confetti, three bounces) |
| `updateGlobalMult` / meter milestones (5, 10, 20, 50, MAX) | `h.setLook('meter'); h.play('meterMilestone')` |
| Wire: `fusePath` / `fuseBurn` growing | `h.setMood('alert')`, optional `h.set({beam:1})` flashlight sweep |
| Wire `fuseBlast` (board blown) | `h.play('shock')` then on the refill `h.play('winSmall')` |
| Wire `fuseFizzle` / dead round (0x) | `h.play('lose')` (shrug, eye roll, sigh puff) |
| `freeSpinTrigger` (start of the free spins) | `h.play('freeSpinStart')` (salute, wink, ring); optionally `h.setOutfit(<mission outfit>, {animated:true})` first (paravent change) |
| `updateFreeSpin` retrigger | `h.play('winSmall')` or `h.play('freeSpinStart')` |
| `freeSpinEnd` / mission complete | `h.play('freeSpinEnd')` (curtsy), then `h.setOutfit('inspectrice', {animated:true})` |
| Player idle for 20 s | nothing to do (director), or `h.play('impatient')` |
| Player hovers or touches the board | `h.setLook({x, y})` (container px), release with `h.setLook('grid')` |
| UNLEASH / SECRET ENTRANCE confirm | `h.play('freeSpinStart')` |

Costume per mission (DESIGN suggests one per bonus): base `inspectrice` (tile, cover, base game), `casino` (mission "Table 13"), `lab` ("Eprouvette X"), `vault` ("Combinaison jaune"), `trench` (infiltration). The tile and cover use the inspectrice only.

Old-hook compatibility: `createMascot(hostEl, {size, bubble})` from `mambo_compat.mjs` maps the old pose names (`idle think happy bigwin shock plunger shrug dance celebrate`) to clips and keeps `say()` (textContent only), so `src/render/index.js` can swap its `import('./mascot.js')` for this module without other changes.

## 7. Placement (decided by the user: LEFT of the grid, looking at it)

`heroine_mockup.png` / `_mobile.png` / `_sheet.png`. Desktop: the left column of the current layout (177 px wide, 299 px high under the HUD) fits her at about 350 px tall (cap just below the WIN panel); she reads clearly with a cream die-cut rim (`rim` option only in the stills: the live rig has no filter, a 2-px drop-shadow stack on the host element gives the same rim at about 0.3 ms per frame in my tests, not enabled by default). For "big on desktop" the host should give her a left gutter of about 240 px and move the three HUD panels out of that column (or let her stand behind them), then she can be 420-480 px tall (jump headroom of 25 % above the head must stay free or `overflow:visible`). Portrait 425x812: there is no free vertical room; the mock puts her small (156 px) in the bottom-left corner beside the autoplay/spin buttons, overlapping the left end of the SECRET ENTRANCE button, which is a compromise. Better options for the integrator: waist-up crop leaning on the top edge of the board (change `svg viewBox` to `60 40 300 300`), or hide her in portrait and keep only the eyes-and-hat peek.

Mirroring (pass 2): she faces right by design. `createHeroine(el, { mirror: true })` or `h.setMirror(true)` wraps the whole figure in one flipped group (`translate(400 0) scale(-1 1)`) and mirrors the viewBox crop, particle spawns, pixel look targets and `wink('L'|'R')` (screen side; `'near'`/`'far'` address the eye by depth). Cost: one transform. Use it only if the layout puts her on the right of the grid.

Portrait mobile (pass 2): `createHeroine(el, { crop: 'bust' })` (or `createMascot(host, { crop: 'bust' })`) shows waist-up only (viewBox `86 24 226 322`: cap, eyes, bust, both hands in the idle poses), hides and stops updating the legs, skirt and shadow, and clips with `overflow:hidden`. It reads at 120 px wide (see board section D) and works with every outfit. `crop: 'head'` is the face-and-cap avatar (96 px wide and up).

## 8. [217] discipline (no sexual content, no minors) and platform notes

* Adult woman: adult face and proportions (long lashes, make-up, mature outfits), no childlike traits. Cartoon proportions with a modest hourglass (waist 44 vs hips 80 units) instead of the model sheet's stronger curves.
* Always fully covered: jacket buttoned to a V-neck with shirt and tie, knee-length pencil skirt, black tights, gloves; gown with high collar and 3/4 sleeves + long gloves, floor-length, **no slit**; lab coat closed to the knee; jumpsuit with scarf; trench coat to the knee. No cleavage, no thigh, no bare midriff, no exposed back.
* No removing of clothes, no kiss (the old "baiser" idea was dropped), no arched or hip-thrust pose, no close-up on hips or lips (the lips are small; the closest crop is the face only, shown in the expression row of the board). The outfit change happens **behind a folding screen** with the head visible and clothes as confetti, no nudity or underwear at any frame.
* The sly look (half-lidded eyes, one raised brow, smirk) is the default expression; shock and lose expressions are comic. Curtsy is a polite bow, whistle is a mouth whistle (no finger on lips, no kiss shape: the whistle viseme is a small round O).
* Fictional agency badge: an 8-point "Mambo star" with a navy centre on the cap (the model sheet's plain 5-point star was **not** copied, to stay away from any real star badge). No flag, no real force name or seal. The flashlight, whistle and notebook are neutral props; no handcuffs.
* No resemblance to famous rubber-hose characters: no black spit curls, no garter, no hoop earrings, no round mouse ears; the hair is chestnut with a swept fringe curl and two flips; the cap is a garrison cap.
* Lab costume: **test tube with lime liquid and bubbles**, not a cocktail glass (alcohol caution kept from the old mascot note).
* Human step still required: Stake Studio review decides on [217]. The doubts to judge are listed in section 10.

## 9. Known flaws and limits (honest list)

* Look (updated after pass 2): the body now has an S-curve, a 3/4 turn and slim tapered limbs, but the rig is still a little **less voluptuous and less fluid than the Higgsfield model sheet** (flatter hip, the head sits a bit large and round, no bust highlight, rubber-hose limbs are straighter than the model's). This is deliberate for [217] (the silhouette stays modest) and for limited-animation readability.
* Hands (pass 2): 11 glove kinds (3 fingers + thumb + cuff). The thumb is drawn on both sides of the hand and the runtime cross-fades them in about 0.15 s when the arm direction would put it below the hand (no mirror flip, no pop). A hand that is not in the list needs a new entry in `GLOVE_DEFS` (`mambo_art.mjs`).
* The far eye and far brow are foreshortened by `turn`; at `turn` > 1.1 the far eye touches the face edge. Mirroring is now supported (section 12) as a flipped group: the cap star, badge and whistle chain are mirrored with it (acceptable, they are symmetric 8-point shapes), the eyes swap sides, so `wink('L')` is a SCREEN side.
* Shoes: a single shape; toe flip is a scale through zero (cartoon snap). The casino gown hides the legs, so leg poses (kick, cross) only show as shoes peeking at the hem.
* Props: only one main prop per hand and one secondary item (`prop2`: chips, clipboard) shown on a few poses; the rope of the grappling hook is a static coil.
* Hair and cap springs are tuned by eye on the base costume; the aviator helmet and fedora use the same spring gains.
* `limited: 12` Hz sampling makes slow drifts look steppy on high-refresh screens by design; it can be switched off.
* The mock-up for portrait is a compromise (see section 7). The live game CSS was not touched (frontend_mambo is not ours).
* No audio: `onCue(name)` fires `spinStart scatterTease winSmall winBig megaWin shock lose freeSpinStart freeSpinEnd meterMilestone whistle outfitChange` so the audio layer can sync stingers (mascot_hop / mascot_gasp).
* Not tested on a real phone GPU; numbers above are headless JS cost. Pattern-filled shading (halftone) is a static `<pattern>`; if a mid phone struggles, `createHeroine(el, {halftone:false})` removes every pattern fill.

## 10. For a human to judge

1. Stake review [217]: curvy-but-covered silhouette, wink and sly look, mouth whistle, the gown's silhouette (no slit, high neck), the fan and the mask. If anything is flagged, the safe fallbacks are `mood 'happy'` (no raised brow, grin) and the lab/trench costumes only.
2. Whether the garrison-cap star (8-point sunburst, gold) is distinct enough from police badges for [253] (it is fictional but still a "badge on a cap").
3. Provenance: the model sheets were generated by AI (Higgsfield, with the user's explicit permission) and used only to measure proportions; nothing of them ships. The board image does contain the model for comparison and should not be published as an asset.

## 11. How to extend

* New costume: add an object to `OUTFIT_DEFS` in `mambo_outfits.mjs` with `sleeve`, `glove`, `legs`, `shoe`, `lidFill`, `skirt(c)`, `torso(c)`, `head(c)`, optional `gear(c)` / `maskUnder(c)` / `hairTop(c)`, `prop(c)` / `prop2(c)`, `accBase`/`accGain`, `capOver`, `shoesUnder`; add its key to `OUTFIT_KEYS`.
* New clip: add an entry to `CLIPS` (tracks or events) or pass `{clips:{myClip:{...}}}` to `createHeroine`.
* New pose: add a sparse object to `POSES` (wrist targets are in the upper-body rest coordinates, see the existing ones); preview with `rig_dev.html?poses=mypose&grid=209,231`.

## 12. Art pass 2 (ART2 agent): what changed and what to know

User feedback on pass 1: torso nearly symmetrical, no 3/4 twist or S-curve, stiff hand-on-hip forearm, chunky, five glove shapes with a thumb-flip pop. Pass 2 redraws the body in code (still pure hand-written Bezier geometry, nothing traced from the model sheets, which stay a visual reference and were only used as an overlay in `compare.html`).

* **Shared body silhouette** (`SIL`, `silBack/silFront/silCl`, `garmentD()` in `mambo_art.mjs`): one set of knot tables (back edge, front edge, centre-front line at 14 heights from collar to hem) drives the torso and lower garment of **all five outfits**, so they share one S-curve body (chest tipped back, waist tucked at y~306, pelvis pushed out, slim pencil knee) with the closure line shifted 12-16 units to the right (3/4 turn toward the grid). Each outfit adds its own ease/flare through `eB`/`eF` callbacks (`flare()` in `mambo_outfits.mjs` for the gown, coat and trench) and its own details (lapels in 3/4 view with a wide near lapel and a sliver far lapel, princess seams, belt on the centre line, shifted buttons).
* **Slimmer limbs**: arms and legs are tapered closed outlines (`tubeD`, width 10.2 -> 8.2 for arms plus a rounded sleeve head, 12.2 -> 8.3 with a slight calf for legs) instead of fat constant strokes; body outline 5 units (was 4.6), limb outline 4.6; shoes 0.88x, gloves 0.92x; fine print-screen texture (`tex`) on garments.
* **Hands**: 11 kinds (`fist relax hip open splay point flat palm pinch thumbup wave`), finger sausages with round tips on a puffy palm, curved tapered thumbs. Both thumb sides exist per hand and the runtime cross-fades them (`gthumb` in the rig): no flip, no pop (tested: opacity 1 -> 0.74 -> 0.55 -> ... -> 0.02 over about 15 frames). The old poses were re-posed with the new kinds (hand on hip uses `hip`, shock `flat`, shrug `palm`, impatient/laugh `relax`/`flat`).
* **Head and neck**: head moved 14 units toward the body line (`HEAD_PIVOT` x -9 -> 5), neck pivot lowered to y 236 with a longer tapered neck, narrower chin, hair redrawn as a waved page-boy with crescent flips (no closed ring, so no hoop-earring reading), the face itself (half-lidded long lashes, raised brow, glossy red smirk) is unchanged.
* **Poses**: new `sho` channel (shoulder tilt) and an S-curve idle (hip out, shoulder tilted, head counter-tilted, hand on hip with a relaxed forearm), re-posed point, smallwin (leg kick), bigwin, shock, shrug, anticipation, whistle, impatient, laugh, salute, curtsy against the model sheet (`board.html`, section A). Old channel values still work.
* **New API**: `crop` (`full | bust | head`), `mirror`, `setCrop`, `setMirror`, `CROPS` export, `wink('near'|'far')`; `mambo_compat.createMascot` accepts `{ crop, mirror }`. Every pre-existing API, id and pose name is kept (the soak test passes unchanged: 14,670 steps, no non-finite value, no console error); ids that changed in a compatible way: arm and leg `-ink`/`-fill` now hold closed outlines (they still exist with the same names), glove groups are `g-<l|r>-<kind>` with `-ta`/`-tb` thumbs.
* **Iterations** (each time compared to the model sheet and re-rendered): 1) silhouette tables + new torso and limbs, 2) gloves and thumb blend, hand-on-hip pose, 3) neck, head and shoulder positions (overlay on the model), 4) the six key poses against the pose sheet, 5) other outfits and texture, 6) crop and mirror. Final comparison board: `heroine_board.png` (section A is the model-vs-rig comparison for idle, point, smallwin, bigwin, shock, shrug).
* **[217] check on the redraw**: all five garments remain fully covering (V-neck with shirt, tie, buttoned jacket, knee-length pencil skirt, black tights, gloves; gown with high gold collar and long gloves, no slit; coat closed to the knee; jumpsuit with scarf; trench to the knee). The S-curve is modest (waist 48 vs hips 84 units at rest, ratio 0.57 against 0.55 in pass 1), no cleavage, no arched pose (the idle hip tilt is 2-3 degrees), no clothing removal. The model sheet's stronger bust and hip curves were not copied.
* **Known pass-2 flaws**: the bust crop cuts the hands in poses with raised arms (bigwin, salute) because it is designed for idle and reaction poses on mobile; the idle hand-on-hip glove overlaps the jacket hem by design; the lower leg is straighter than the model's rubber-hose bend; frame cost went from 0.17 to about 0.25 ms (tapered outlines rebuilt per frame), still negligible.
* The Higgsfield sheets are still **reference only** and `heroine_board.png` still contains them for comparison: do not ship the board.
