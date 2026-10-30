# NOTES WP3 HEROINE (running log)

Owner: WP3. Ports 5840-5849 (5840 static server, 5841 mock RGS, 5849 snapshot server of `sync_heroine.mjs --fallback`). Files: `frontend_mambo/src/render/mascot.js`, `mascot.css`, `src/render/heroine/**`, `src/i18n/en_hero.js`, `tests/heroine/**`, `tools/sync_heroine.mjs`. Requests written: `docs/v2/requests/WP3_to_WP4.md`, `WP3_to_WP11.md`, `WP3_to_WP10.md`.

## Architecture (what exists)

```
mascot.js (public, no static import)         createMascot(host, opts) -> { el, ready, mode(), setPose, getPose, say, hideSay, react, setCrop, setOutfit, destroy }
  |  dynamic import                           createMascotV1 = the v1 character (last resort), REACT_KINDS (16), POSES (v1 list), mascotOf(el) registry
heroine/index.js (DOM glue)                   createHeroineMascot(host, opts): stage, bubble, layout event, settings, visibility, static fallback
  |-- gaze.js        pure geometry + DOM reader   grid / cluster / meter / spin / player look targets, crop and letterbox aware
  |-- bubble.js      pure placement               bubble over her skirt (outside the slot), none when the box is too small
  |-- director.js    reactions -> rig calls       arbitration, cooldowns, dead streak, motion levels, outfit lock, holds
  |-- clips.js       pure data                    KINDS table, WHITELIST, BLOCKED, wind-up, calm / neutral transforms, outfit change def
  |-- mambo_*.mjs    SYNCED rig                   tools/sync_heroine.mjs (copy + 2 named patches), SYNC.json manifest
  `-- fallback_art.js GENERATED static svg        sync_heroine.mjs --fallback (idle pose of the inspectrice)
```
Chain of failure: rig throws or does not load -> static picture of the same heroine -> (if even that cannot load) the v1 character in the original `#mascot-slot`.

## Decisions

- **Redirect, not a WP4 change**: the v1 renderer still calls `createMascot(#mascot-slot, ...)`; when `#heroine-slot` exists the heroine is drawn there (the shell then shows it and retires `#mascot-slot`). A later `createMascot(#heroine-slot)` also works. Any other host gets a free-standing figure (`opts.size` px high, `opts.crop`), e.g. the loading screen.
- **Synced rig + two named patches** (`osFollow`: the OS reduced-motion media change no longer overrides the settings; `frameGuard`: an exception in the rAF loop calls `onError` instead of silently freezing). Everything else lives in my own files so a new art drop is one command (`node tools/sync_heroine.mjs`, `--check` verifies).
- **Whitelist** (`clips.js WHITELIST`): hairFlip, impatient, laugh are BLOCKED. The rig's own idle director (blink, saccades, gags every 5-12 s) stays on, but its `hairFlip` slot is overridden with a weight shift through the rig's `clips` option.
- **shock only from `blast`**; the legacy v1 pose `shock` (called by v1 for the anticipation and the scatter landing) now maps to the leaning-in tease. Blast has a 2.5 s cooldown.
- **Celebrate only above the cost**: `win` / `bigwin` / `epic` with `info.ratio <= 1` or `info.level <= 0` become the quiet beat (no clip, held pose released, one slow blink). Defence in depth, WP4 already gates.
- **Dead spins**: the shrug (`lose`) only on every third consecutive dead spin and not twice within 6 s; the others just release the held pose. A paying result resets the streak.
- **Sober overrides ([217])**: the rig's `anticipation` pose put the glove on her cheek/mouth (reads as a finger to the lips). `POSE_FIX` moves the hand out to the side pointing at the grid, in scatterTease, in the static Still pose and in the legacy `think` pose. `spinStart` uses a ready stance (hand on the hip, small lean) instead.
- **Outfit change** is my own def (`outfitChangeDef`): opaque folding screen in, puff at the swap (a poof), screen out, salute. No garment confetti, no visible spin. The director LOCKS reactions for its 1.9 s (cutting it would leave the screen on); one queued change at most.
- **Jumps** are capped (`JUMP_MAX` 790 -> 130 art units) so the head stays inside the slot's 18% headroom; waist-up crop 250, face crop 0.
- **Motion**: `settings.get('motionLevel')` decides. Full: clips. Calm: same clips without jumps, spins, cap pops and heavy particles, speed 0.9. Still: `rig.setReduced(true)` and NO clip, a static pose per reaction (`KINDS[k].pose`, held `STILL_HOLD` ms) then idle; outfits swap instantly.
- **Speech bubble**: a sibling inside `#app` (the slot clips its children), over her skirt with the tail up at her head; no visible bubble when the box is smaller than 118x150 px (portrait corner, face crop); `aria-hidden` (flavour, the slot is aria-hidden too).
- **Gaze**: real element positions (`.board-wrap`, `#btn-bet`, `#meter-slot .mm-badge`, `react(.., { at: {x,y} })` for the last winning cluster, viewport px), computed with the crop and the svg letterboxing.

## More decisions (added during the build)

- **`.mjs` -> `.js`**: the art uses `.mjs`; the shipped copies are `mambo_art.js`, `mambo_outfits.js`, `mambo_rig.js`, `mambo_compat.js` (every other module of the game is `.js`, a static host that does not map `.mjs` would refuse to serve it as a module). The sync retargets the import specifiers; `SYNC.json` records source and shipped hashes. `mambo_compat.js` is the art's reference adapter: shipped for parity, imported by nothing (WP11 may drop it from `dist`).
- **Third patch `tightFull`**: the rig's full-figure window was 400x600 art units, the painted figure only spans x 100..300, y 40..566, so the full crop is now `[60, 30, 280, 556]` (+10% bigger in the left column: painted 249 px of the 272 px box at 1024x576, was 226). The ground shadow stays inside the window, jumps use the 18% headroom of the slot (`JUMP_MAX` 700 = 102 art units).
- **Motion**: Auto + an OS "reduce motion" request = Still for the figure (the settings store says Calm for it: springs, breathing and saccades are still too much for a person who asked for reduced motion). An explicit Calm, Full or Still is taken as chosen, live.
- **Gaze at rest**: the grid target is the lower left part of the board (she stands low, staring at its far top corner looked odd); `look('grid')` is restored after every reaction.
- **Free-standing figure** (loading screen: `logo.js` calls `createMascot(#mb-ld-mascot, { size })` then `setPose('think')`): the heroine is drawn there too, in the held `think` pose with the sober hand.
- **Not done on purpose**: no cream rim by default (`createMascot(host, { rim: true })` turns on 4 hard drop-shadows, about 0.3 ms/frame in the art notes), no frame-rate throttling while idle (0.3-0.6 ms per frame measured), no per-costume static fallback (the picture is the inspectrice idle pose), no mirror (she is left of the grid in both layouts).

## Verification (all green at the time of writing)

- `node --test tests/heroine`: 58 unit tests (vocabulary and table, whitelist, the ten clip targets, wind-up, calm and neutral transforms, jump cap, outfit change timing, director arbitration with a fake rig and clock, Still, outfit lock, gaze geometry, bubble placement fuzz, sync drift, fallback art content, en_hero lines and word screen, source hygiene).
- `node tests/heroine/browser.mjs`: 41 checks. Budget 0.45 ms/frame average (max 8.9 ms = the costume swap frame) over 600 frames of the busiest reactions with the director on; live in the game 0.4-0.65 ms; 28,800 soak steps (16 kinds x 5 outfits x 3 crops x 3 motion levels) without a non-finite value; one simulated hour of the rig's own gag director: no hairFlip; fallback chain (5 cases); Still / Calm / hidden tab / live settings; bounding boxes at 1024x576 (177x272, left/full), 800x450 (139x213), 400x225 (70x57, head), 425x812 (69x99, corner bust): no overlap with the grid, a button, a HUD plate or the logo, no scroll, painted figure inside the box; gaze; 100 px readability.
- `node --test tests/core tests/text tests/shell tests/heroine`: 153 pass. The guideline runner was run from an isolated copy of `frontend_mambo` (it writes its report and shots into the tree it runs from).
- Looked at (Read): `tests/heroine/shots/game_1024x576.png`, `game_425x812.png`, `readable_100px.png`; contact sheets of every reaction at 300 px (inspectrice) and win / bigwin / blast for the casino gown; the portrait corner crop in six reactions at 3x; the static fallback at three crops; the loading screen.

## For a human to judge ([217], Stake review)

1. The casino gown is the most fitted costume (floor length, high gold collar, no slit): fallback is the trench cut. `winSmall` shows a small heel kick behind her (shoe only, skirt covers the leg); `bigwin` both arms up with star eyes; `blast` open mouth, hands on cheeks.
2. The idle gag `glancePlayer` winks at the player now and then (user directive: wink allowed as sober charm); remove it from the rig's gag pool (`MICRO` in `mambo_rig.js`) if the review objects. `blowWhistle` is a mouth whistle (round O, no finger on the lips, no kiss shape).
3. The rig's `anticipation` pose was changed (hand moved off her face: it read as a finger to the lips); `POSE_FIX` in `clips.js`.
4. The costume change is behind an opaque screen, her face is hidden too, a puff at the swap, no garment confetti: please confirm it reads as a quick change and nothing else.

## Flaws and limits

- The bubble covers her skirt and legs for 2 s (no free room in the left column); no bubble in boxes under 118x150 px (portrait corner, face crop at 400x225).
- The portrait corner box (69x99, waist-up) cuts raised hands in the big-win poses (known art limit); jumps are capped there so the head stays in.
- The costume swap re-parses the whole figure (about 60 KB of markup): one frame of 9-12 ms, hidden behind the screen, not visible but measurable (max in the budget run).
- `fallback_art.js` is 47 KB, loaded only when the rig fails.
- Not tested on a real phone GPU; the halftone patterns are off on low-end devices (`hardwareConcurrency <= 2`, `deviceMemory <= 2`) and with high contrast.
- Audio cues (`onCue`) are available but nothing consumes them yet (WP4 / WP2).

## State

- [x] sync script (3 patches, `.js` copies, `--check`, `--fallback`), rig copied, static fallback generated
- [x] heroine/ modules, mascot.js wiring, en_hero.js
- [x] unit tests, browser tests, screenshots viewed
- [x] request files WP3_to_WP4 / WP11 / WP10
- [x] commit (own paths only)

## Resume hints

`cd frontend_mambo`; static server `PORT=5840 node tools/mock-rgs/static-server.mjs`, mock RGS `MOCK_PORT=5841 node tools/mock-rgs/server.mjs` (only needed by hand; `browser.mjs` starts its own). New art drop: `node tools/sync_heroine.mjs --fallback && node --test tests/heroine`. Dev harness: `/tests/heroine/harness.html` (exposes `window.H`). Scratch scripts (contact sheets, live shots) were in `/tmp/claude-0/scratch/wp3/` and are not part of the repo.

## Fix round 1 (reviewer finding D4-live-reactions-red)

- Finding: D4 was red at 1024x576, 800x450 and 425x812 (38/41, not 41/41) because the live reaction loop slept a fixed 1500 ms after `epic`, while megaWin at speed 2.5 runs 3.683 s / 2.5 + 60 ms = 1533 ms. `blast` (prio 3) arrived while `epic` (prio 5) still ran and was refused by design (director.js). It only passed when setTimeout fired 33 ms late. The director was correct; the test was flaky.
- Fix (tests/heroine/browser.mjs only): the `epic` gap is now 1700 ms, and after every planned gap the loop waits (capped at 3 s, polling every 20 ms) until `m.impl.director().state()` shows no running clip, or only a holding one, and no costume lock. The test no longer depends on timer lateness.
- Verified: `PORTS=5842,5843 node tests/heroine/browser.mjs` 41/41, then `PORTS=5844,5845` 41/41 again (D4 started list has all ten kinds plus gag at all four viewports, avg 0.54-1.05 ms/frame). `node --test tests/core tests/text` 60/60. Fresh game_1024x576.png and game_425x812.png viewed: heroine left of the grid (full figure) and in the portrait corner (waist-up).
