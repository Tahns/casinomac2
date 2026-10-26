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

## State

- [x] sync script, rig copied, fallback generated
- [x] heroine/ modules, mascot.js wiring, en_hero.js
- [x] unit tests (`node --test tests/heroine`)
- [ ] browser tests (`node tests/heroine/browser.mjs`), screenshots, perf
- [ ] request files, final notes, commit
