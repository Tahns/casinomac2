# Agent Mambo v2: frozen interfaces and file ownership (step 0)

Status: step 0 DONE (2026-10-26). Source of truth for the decisions is `docs/research2/SYNTHESIS.md` (section 9 "Interfaces frozen in step 0" and section 8 event contract); this file documents the exact signatures that were built from it. Everything below exists in `frontend_mambo/` as a working stub or a first implementation: v1 behaviour is unchanged (LAYERS is empty, `react()` is a no-op, volumes have no audible effect yet, the gear, the settings dialog and the heroine slot are `hidden`).

Rules for everybody:
- A frozen signature (name, argument order, return type, the meaning of a value) changes only with a request file `docs/v2/requests/<FROM>_to_<TO>.md` accepted by the owner AND the unit test that pins it updated in the same commit. Adding optional arguments, new keys, new exports, new reaction kinds, new ctx fields is always allowed for the owner.
- Edit only the files your WP owns (table at the end). Need a change elsewhere: write `docs/v2/requests/<YOURWP>_to_<OTHERWP>.md` (what, why, exact snippet).
- `npm test` style command: `cd frontend_mambo && node --test tests/core tests/text`. IMPORTANT: Node resolves the DIRECTORY argument to its `index.js`, so a new test file in `tests/core/` or `tests/text/` runs only when it is imported by that folder's `index.js` (owner of `tests/core/**`: WP10).
- Source hygiene enforced by the guideline runner: the word "stake" must not appear anywhere in the shipped front-end source (`frontend_mambo/src/**`, `index.html`, `styles.css`; [275] turns AT RISK on any hit, even in a comment or an identifier; the only allowed hit is the sanitizer regex in `src/i18n/social.js`). Say "cost", "play amount" or "C" instead. Tests, tools, fixtures and `docs/` are not scanned. No external hosts, no `fetch` outside `rgs.js` (plus the existing `data/rules_data.json` read), every `localStorage` access inside try/catch.
- Unknown things are ignored, never thrown: unknown audio id, unknown reaction kind, unknown event type, unknown settings key, unknown jurisdiction flag, unknown layout id (falls back to Mezzanine).

## 1. `src/settings.js` (owner WP1) the ONE preference store

```js
import { settings } from './settings.js';          // singleton; also: createSettings(env), createStorage(env), capabilitiesFrom(flags), parseStored(raw), remainingRoundMs(t0, now, min)
settings.get(key)            // stored keys and derived keys below; unknown key -> undefined
settings.set(key, value)     // validated (invalid -> rejected, store unchanged); returns the value now held; unknown/derived key -> undefined
settings.on(key | '*', fn)   // fn(value, key, previousValue); returns the unsubscribe function; a throwing fn never breaks the store
settings.capabilities        // GETTER: current frozen snapshot, read it at the point of use (a new object replaces it when flags change)
```
Extension surface (WP1 may rely on it): `settings.applyJurisdiction(flags|null)` (main.js calls it right after `/wallet/authenticate` with `config.jurisdiction`; replay never calls it, so replay keeps the defaults), `settings.reset()`, `settings.flush()` (writes now; also runs on `pagehide` and when the tab is hidden), `settings.remainingRoundMs(t0, now, minMs)`, `settings.storage` (`read/write/remove`, whitelist + try/catch + memory fallback), `settings.version` (1). `on('capabilities', fn)` fires when a flag set changes the snapshot.

Stored keys (inside the single `am_settings` JSON `{v:1, ...}`; only non-default values are written; debounced 200 ms):

| key | values | default | meaning |
|---|---|---|---|
| `motion` | `'auto'\|'full'\|'calm'\|'still'` | `'auto'` | Auto follows `prefers-reduced-motion` live |
| `reduceFlash` | `null\|true\|false` | `null` | `null` = follow reduced motion |
| `highContrast` | `null\|true\|false` | `null` | `null` = follow `prefers-contrast: more` |
| `ledger` | boolean | `true` | session summary; forced on by `capabilities.ledgerLocked` |
| `text` | `100\|115\|130` | `100` | reserved (P2) |
| `remind` | `0\|15\|30\|60` | `0` | reserved (cut candidate) |

Derived read-only keys (`get`/`on` work, `set` is ignored): `motionLevel` (`'full'|'calm'|'still'`, Auto resolved), `flashReduced` (bool), `contrastOn` (bool), `ledgerOn` (bool). They fire `on(...)` when the stored value, the OS media query or the capabilities change. settings.js also writes `data-motion` (= motionLevel), `data-flash` (`reduced|full`), `data-contrast` (`more|normal`), `data-text` on `<html>` (nothing in v1 CSS uses them yet). `render/motion.js` (WP4) is a read-only subscriber of these keys; it never stores anything.

Storage keys whitelist (`STORAGE_KEYS`): `am_muted`, `am_vol_master`, `am_vol_music`, `am_vol_sfx`, `am_settings`. The first four belong to `audio.js` (one source of truth for mute and volumes); settings.js owns only `am_settings`. Never stored: turbo, autoplay, bet, `lang`, `social`, `currency`, jurisdiction flags.

`settings.capabilities` (positive polarity: `true` = may be offered; default = a market without restrictions). One capability per RGS flag, all 12 mapped (`FLAG_TO_CAPABILITY`):

| RGS `jurisdiction` flag | capability | default |
|---|---|---|
| `socialCasino` | `social` | false |
| `disabledFullscreen` | `fullscreen` | true |
| `disabledTurbo` | `turbo` | true |
| `disabledSuperTurbo` | `superTurbo` | true |
| `disabledAutoplay` | `autoplay` | true |
| `disabledSlamstop` | `slamstop` | true (false = no banner skip before the count-up has ended) |
| `disabledSpacebar` | `spacebar` | true |
| `disabledBuyFeature` | `buyFeature` | true (hides the Secret Entrance button, its dialog and the door picker) |
| `displayNetPosition` | `netPosition` | false |
| `displayRTP` | `rtp` | false |
| `displaySessionTimer` | `sessionTimer` | false |
| `minimumRoundDuration` | `minRound` (bool) | false |

Extra capability fields (not extra flags): `minRoundMs` (number, ms, clamped 0..60000, the value of `minimumRoundDuration`; the unit is an assumption), `anticipation` (default true, the kill switch of the honest slow-roll, SYNTHESIS 4 lever 3), `ledgerLocked` (= `netPosition || sessionTimer`). Truthy parsing: `true`, `1`, `'true'`, `'1'`; anything else is false. Unknown flag keys are ignored.

## 2. `src/audio.js` (owner WP2) real surface (M2/M3; the step-0 signatures did not change, everything below is additive)

```js
import { audio, createEngine, taper, taperDb, CUE_INFO, CUE_IDS, VOLUME_KINDS, DEFAULT_VOLUME, parseVolume } from './audio.js';
// frozen in step 0, now audible
audio.setVolume(kind, pct) / getVolume(kind) / volumes / onChange(fn) / setMuted(b) / muted / play(id, opt) / preview(kind)
// added by WP2
audio.play(id, { quiet: true })   // quiet-result path (R <= C): a cue with winLike true is refused (false, no node)
audio.toggleMute()                // the header speaker: unmute | restore last non-zero sliders when the sliders made it silent | mute; returns true when silent afterwards
audio.silent                      // muted, or Master 0, or Music and Effects both 0 (what body.muted and #btn-sound[aria-pressed] show); audio.muted stays the pure mute flag (am_muted)
audio.lastVolume(kind)            // last non-zero level (memory only); audio.resetVolumes()  // three sliders to 75
audio.cueInfo(id) -> { winLike, minGap? } | null;  audio.isWinLike(id) -> boolean | null
audio.duck = bool                 // -6 dB of the bed under the big stingers (default false: opt-in until a human ear check)
onChange payload: { type: 'volume'|'mute', kind?, value?, volumes, muted, silent }
```
Taper: `taper(s)`: 0 -> 0, 1..75: dB = -45*(75-s)/75, 76..100: dB = +3*(s-75)/25, gain = 10^(dB/20) (75 = unity = the v1 mix, 100 = +3 dB, 1 = -44.4 dB). Graph: sfx -> sfxBus and bed -> musicBus (own reverb return) -> duck -> master (mute + Master slider) -> compressor -> soft limiter. Zero handling: Master, Music or Effects at 0 (or mute) means nothing is queued on that bus. Preview: `settingsTest` cue on the bus being tested, 1 per 250 ms. New cue ids: `ledgerTick settingsTest caseSeal caseOpen lightsOut spotlightStep layoutDraw doorCreak dialStep` (+ `stamp` options); all `winLike: false`. Every sound has an explicit `winLike` flag in `CUE_INFO` (table in `src/audio.js`, notes in `docs/v2/NOTES_WP2_AUDIO.md`). Human item: the free-spins bed moved from E dorian to F# dorian; not listened to, needs an ear check together with the new cues and the duck. `audio.js` must stay importable alone (the harness `tests/audio/harness.html` imports only it).

## 3. Heroine: `mascot.react(kind, info)` (owner WP3 implements, WP4 calls)

- `createMascot(...)` (render/mascot.js) now returns `{ el, setPose, say, hideSay, getPose, react, destroy }`. `react(kind, info) -> boolean` (true when a clip started). Step 0: stub, always `false`. Legacy `pose(name, hold)` / `say(key, ms, force, vars)` stay (the v1 renderer still calls them).
- Renderer hook: `renderer.mascot = { pose, say, react }` (render/index.js); `react` delegates to the created mascot and returns false when the module or the method is missing.
- `REACT_KINDS` (exported from mascot.js), starter vocabulary: `idle, spin, anticipate, quiet, dead, win, bigwin, epic, blast, fizzle, trigger, retrigger, end, outfit`. WP4 sends only listed kinds; WP3 may APPEND kinds (and documents them here); an unknown kind returns false.
- Mapping WP4 uses (celebration gate `celebrate.level(R, C)`): level 0 -> `quiet`, 1 -> `win`, 2 -> `bigwin`, 3 -> `epic`; a spin without any result -> `dead`; `reveal.anticipation` -> `anticipate` (never a shock without a real trigger); `fuseBlast` -> `blast`, `fuseFizzle` -> `fizzle`; `freeSpinTrigger` / `missionAssigned` -> `trigger` (info `{ mission, outfit }`); `freeSpinRetrigger` -> `retrigger`; `freeSpinEnd` -> `end`; costume change -> `outfit` (info `{ outfit: 'lab'|'trench'|'casino'|... }`).
- `info` is a free object: `{ level, ratio, R, C, combo, mission, outfit, ms }`; every key optional. Engine [217]: only sober clips; the whitelist lives in WP3.
- M2/M3 state (WP3): `REACT_KINDS` = the 14 kinds above + `meter`, `gag` (appended). `react()` returns true when a clip, a static pose or a costume change started. `info` keys read: `level ratio at speed ms mission outfit`. `createMascot(host, opts)` options `size crop outfit reduced onCue v1 halftone`, returns the heroine ASYNCHRONOUSLY (extra API `mode() ready setCrop setOutfit impl`); `mascotOf(el)`; `createMascotV1(host, opts)` keeps the synchronous v1 SVG mascot (used by `tools/art/bake_mambo.mjs`). Full table: `docs/v2/requests/WP3_to_WP4.md`.
- Shipped files (all reached by dynamic `import()` from `src/render/mascot.js`, so a copy step must keep the whole folder): `src/render/heroine/{index,clips,director,gaze,bubble}.js`, `heroine.css`, the synced rig `mambo_art.js mambo_outfits.js mambo_rig.js` (+ `SYNC.json`, generated by `node tools/sync_heroine.mjs` from `docs/research2/art/*.mjs`; never hand-edit) and `fallback_art.js` (static SVG, loaded only when the rig fails). `mambo_compat.js` is not imported by the game. No `.mjs` is shipped. Outfits: `inspectrice` (base, tile and cover), `lab` (The Briefing), `trench` (Sealed Orders), `casino` (Ballroom Blackout), `vault` (reserved).

## 4. `src/render/layers/index.js` (owner WP6; the call site in render/index.js is WP4's)

```js
export const LAYERS = [];                 // WP6 lists its layers here: [{ id, onEvent(ev, ctx), reset() }]
export function dispatch(ev, ctx)         // calls every layer; returns null (no layer returned a Promise) or ONE Promise that never rejects
export function resetLayers()             // calls reset() of every layer; never throws
```
Layer shape: `{ id: string, onEvent(ev, ctx) -> void | Promise, reset() -> void }`. `onEvent` is called for every book event in book order (events after `wincap` that the player skips are not dispatched, except `freeSpinEnd` and `finalWin`). The player runs its own handling of the event AND waits for the returned Promises, concurrently (so a layer may hold the book, e.g. the blueprint draw-on before `reveal`, the `caseOpen` count-up before `setWin`; keep Rule P durations). A throw or a rejection is logged (`console.error('layer', id, ...)`) and never stops the book. `reset()` is called at the start and the end of every book and on `destroy()`; it must be idempotent and remove all DOM, timers and listeners the layer owns.

`ctx` (built once per renderer in render/index.js; fields are only ever added): `app` (the `#app` element), `root` (`#game`), `wrap` (`.board-wrap`), `board` (`.board`), `geo` (the module namespace of `render/geo.js`), `T(ms)` (turbo/skip scaled duration), `sleep(ms)` (scaled), and live getters `turbo`, `skip`, `cost` (mode cost multiplier), `inFs`. WP4 adds more (settings, celebrate level, motion store) as the player grows and lists them here.

## 5. `src/render/geo.js` (owner WP4) board geometry

Two row languages. COMPACT-PADDED (winInfo, tumbleBoard.explodingSymbols, freeSpinTrigger/Retrigger positions): `padded = compactIndex + 1`. GEOMETRIC (fuse*, lightRoute, the `layout` event, everything drawn): 0 = top row of the frame. `geometric = cells[reel][padded - 1]`.
```js
import * as geo from './render/geo.js';
geo.setLayout(layoutEvent | planId | null)   // null/undefined/invalid = Mezzanine; returns the active plan { id, name, cols, rows, cells, cellCount, links } (frozen)
geo.getLayout(); geo.resetLayout();
geo.toGeo(reel, paddedRow)    // -> geometric row, or -1 when it is not a cell of the plan
geo.toPadded(reel, geoRow)    // -> padded row (compactIndex + 1), or -1
geo.toGeoPos(pos) / geo.toPaddedPos(pos)   // same on { reel, row, ...rest } objects (row = -1 when absent)
geo.hasCell(reel, geoRow); geo.cellsOf(reel); geo.revealLength(reel)   // reveal.board[reel] carries cellsOf(reel).length + 2 symbols
geo.isValidLayout(ev); geo.FLOOR_PLANS   // canonical mezzanine / atrium / lobby / annex
```
"Identity for Mezzanine": Mezzanine has `cells[r] = [0,1,2,3,4]`, so `toGeo(reel, p) === p - 1` and `toPadded(reel, g) === g + 1`, exactly the v1 renderer's `vis(row) = row - 1`; rows outside the plan give -1 (v1 filtered them with `inB`), so callers filter on `>= 0`. Old books (no `layout` event) must call `setLayout(null)` at the start of the book (a spin has one plan, fixed for the whole spin, free spins are Mezzanine in v2.0). Golden fixtures: `tests/core/geo.test.mjs` (the four plans, both tables, the SYNTHESIS 8 Atrium example, bad input).

## 6. `src/render/celebrate.js` (owner WP4) the celebration gate

```js
import { level, isCelebratory, crossedCost, THRESHOLDS } from './render/celebrate.js';
level(R, C)                   // 0..3, R = running return of the round, C = bet x mode cost, same unit
```
L0 `R <= C` (quiet ledger tick only), L1 `C < R < 5C` (wink), L2 `5C <= R < 15C`, L3 `R >= 15C` (staircase). Anything unusable (NaN, negative, `C <= 0`, missing) is 0. `isCelebratory(level)` = `level >= 1`; `crossedCost(prevR, R, C)` is true exactly once per round when R passes from "not above C" to "above C" (the "in the black" beat). Stage with payout / (bet x cost), never with the book's `winLevel`. Float noise is absorbed with a 1e-9 relative slack that always errs on the quiet side at the cost line.

## 7. i18n merge (`src/i18n/index.js`, owner WP1)

`EN = { ...en.js, ...en_ui.js, ...en_hero.js, ...en_layers.js, ...en_rules.js }` (later wins, so a partial overrides `en.js`; WP3's `en_hero.js` overrides the `mascot.*` keys). Exports: `EN` (frozen merged table), `hasKey(key)`, `allKeys()` (now the merged keys), plus the unchanged `t, setLang, setSocial, applyI18n, socialize, t.mode`. `src/render/index.js` uses `EN` for its speech-bubble key check. Partials are owned by: `en_ui.js` WP1, `en_hero.js` WP3, `en_layers.js` WP6, `en_rules.js` WP11; all four exist and export `{}` in step 0. A key with no entry anywhere falls back to a humanised key (`btn.settings` shows "Settings"), never to the raw key. Social wording: every string must pass the restricted-word screen (`tests/text`), `social.js` (WP1) overrides by key, `socialize()` is only a safety net.

## 8. `index.html` contract (owner WP1)

New, all invisible in step 0 so v1 looks the same: `#btn-settings` (gear, `hidden`, right after `#btn-sound` inside `.tools`, `data-i18n-title="btn.settings"`, `aria-haspopup="dialog"`); `#modal-settings` (`.modal`, `hidden`, `role=dialog`, `aria-modal`, `aria-label` from `btn.settings`, an empty `.modal-box` that WP1 fills; main.js `openModal/closeModal` and the inert logic work on it like on the other modals); `#heroine-slot` (`hidden`, directly after `#mascot-slot`, inside `#app`; WP3 draws the rig into it, WP1 lays it out LEFT of the grid, removes `hidden` and retires `#mascot-slot` when the rig is ready). New stylesheets linked after `meter.css` and created empty: `src/ui/ui.css` (WP1), `src/render/heroine/heroine.css` (WP3), `src/render/layers/layers.css` (WP6). No new script tags: modules are imported from JS (`main.js` imports `settings.js` and calls `applyJurisdiction`).

M1 state (WP1): `#btn-settings` is visible and wired (inside `#btn-menu` at height <= 360 px); `#modal-settings` is built on first open by `src/ui/settings_dialog.js` (ids `st-*`, four tabs through `src/ui/tabs.js`, Info tab = `rules.buildRules(data, ctx).sections` grouped as Rules = overview + howto + features, Win table, Controls, Modes and RTP, Legal, plus the RTP line, the session summary and the version). New in `index.html`: `#ledger` (inside `#hud-info`), `#door-cards` and `#door-hint` (inside `#modal-confirm`), `#replay-settings` (created by `replay.js`); `#heroine-slot` keeps its contract (`data-mode`, `data-crop`, event `am:heroine-layout`, `WP1_to_WP3.md`). `main.js` imports `src/ui/*`. New body classes: `has-heroine`, `no-turbo|no-autoplay|no-buy|no-fullscreen|no-space|no-slam`. `bet.js` gained `DOOR_MODE_COSTS` (`entrance_orders` 100, `entrance_blackout` 100); `input.js` gained `spaceDecision` and `createPacer`. Door cards (`src/ui/doors.js`) show a door when `data/rules_data.json` lists its mode AND has `shares[mode]` (`{ medianX, pGtPrice, rtp, maxWin }`); Stage Door always.

## 9. Event contract (math emits, front end replays)

Unchanged from SYNTHESIS section 8 (`layout`, `reveal` with `len(cells[r])+2`, positions COMPACT-PADDED vs geometric, `missionAssigned`, `lightRoute`, `winInfo.meta.{lit,lensMult,banked}`, `caseOpen`, old books play as Mezzanine and `briefing` with step 8). `geo.js` is the only mapping between the two row languages. The FINAL books emit exactly this; every event with an example copied from a real book: `frontend_mambo/CONTRACT.md` section 3. Small FINAL samples of the four modes for the mock RGS and the tests: `frontend_mambo/fixtures/` (`node tools/build/make_fixtures.mjs`; v1 books in `fixtures/v1/`). Rules data from the final tables: `node tools/gen_rules_data.mjs` (`--check`).

## 10. File ownership (SYNTHESIS section 9, paths relative to `frontend_mambo/` unless `math/`)

(* = new file; step 0 temporarily gave one agent all shared front-end files only to create the stubs listed above. From now on ownership is exclusive.)

| WP | Scope | Owns (exclusively) | Depends | Acceptance tests |
|---|---|---|---|---|
| 1 SHELL | menu, settings store, ledger, entrance picker, flags, replay gear, i18n merge | `index.html`, `styles.css`, `src/main.js`, `src/settings.js`*, `src/ui/**`*, `src/replay.js`, `src/bet.js`, `src/input.js`, `src/i18n/{index,en,social,en_ui}.js` | step 0 | U2-U5, G1-G8; no scroll at 4 viewports; heroine box never overlaps grid or buttons; all 12 flags; Space guard; social scan of dialog |
| 2 AUDIO | buses, sliders, taper, preview, cues (`ledgerTick`, `settingsTest`, `stamp`, `caseSeal`, `caseOpen`, `lightsOut`, `spotlightStep`, `layoutDraw`, `doorCreak`, `dialStep`), `winLike` flag | `src/audio.js`, `tests/audio/**` | step 0 | A1-A5, L1-L7, U1; unknown ids are no-ops; no `winLike` sound at R <= C |
| 3 HEROINE | rig integration behind the v1 `createMascot` API, `react(kind,info)`, outfits, reduced motion; `en_hero.js` overrides `mascot.*` keys (carries the five reworded lines of 09 4.3) | `src/render/mascot.js`, `mascot.css`, `src/render/heroine/**`*, `src/i18n/en_hero.js`*, `tests/heroine/**`* | step 0 | <= 2 ms/frame over 600 frames (rig_test --perf); 10 reaction kinds map to clips; static pose when Still; static SVG fallback if the rig throws; bbox test at 4 viewports |
| 4 RENDER-CORE | event player, celebration gate, staircase, shape-driven board, layer dispatcher | `src/render/index.js`, `devbooks.js`, `motion.js`*, `camera.js`*, `celebrate.js`*, `geo.js`* | 1 (settings API) | gate test (0.4x/1.0x/1.2x/15x/100x at cost 1 and 100: no celebratory call at R <= C); staircase tiers >= 0.5 s, 5000x <= 7.5 s; 4 floor plans x 4 viewports no overflow; v1 books pixel-near identical |
| 5 FX-WIRE | fx engine, wire/fuse, scene, dial, logo, flash and quality governors | `src/render/{fx,wire,fuse,scene,meter,logo,symbols}.js`, `fuse.css`, `wire.css`, `meter.css`, `flash.js`*, `quality.js`* | step 0 | <= 2 flashes/s in any 1 s window; p95 frame <= 16.6 ms at 4x CPU throttle on a 30-cell tumble step 8+; <= 45 promoted layers; touch canvas <= 96 MB |
| 6 LAYERS | blueprint, Orders envelope, Blackout spotlight, dossier cutscene, costume screen, entrance transition | `src/render/layers/**`*, `src/i18n/en_layers.js`* | 4 (geo, dispatcher) | layout outline cells == `cellCount`; envelope never touches WIN before `caseOpen`; `meta.lit` matches the beam; skip only after 1.2 s; 10-second test: 5 viewers, sound off, name the mission >= 4/5 |
| 7 MATH-GEO | layouts, geometry-aware clusters, wire path, `draw_board` mixin that also emits the `layout` event | `math/games/agent_mambo/{layouts.py*,game_geometry.py*,game_calculations.py}`, `tests/test_layouts.py`*, `tools/layout_bench.py`* | none | 0 mismatches vs stock clusters on 300 random 6x5 boards; no IndexError on 4 plans x 100k boards; tumble conserves cell count; validator; deterministic draw |
| 8 MATH-MISSIONS | `MISSIONS`, mission draw, Orders bank, Blackout lens, modes, optimizer fences | `math/games/agent_mambo/{missions.py*,game_override.py,game_executables.py,gamestate.py,game_events.py,game_config.py,game_optimization.py}`, `tests/test_missions.py`* | 7 mixin at T+2:00 | payouts multiples of 0.1x; `evaluate_wincap()` after every multiplication; `finalWin == payoutMultiplier`; `caseOpen.win == bank x mult`; route inside board; 5k-book smoke per mode |
| 9 MATH-PIPELINE | the single CPU queue, calibration, reweight, recompress, shares, report; owns the tunables (`calib_params.py`*) | `math/games/agent_mambo/{run.py,calib_params.py*,reels/**,tools/**,tests/test_math.py,MATH_REPORT.md,PROGRESS.md,library/**}` | 7, 8 | each mode RTP 96.000% +-0.0005; P(5000x) = 1/50k per door; `shares.json`; hashes valid (`rgs_verification`); total <= 0.7 GB; `final_checks` pass; P(R > stake) report vs targets |
| 10 QA | e2e harness, baseline, guideline runner, mock RGS | `tests/e2e/**`*, `tests/guidelines/**`, `tests/core/**`, `tests/text/**`, `tools/mock-rgs/**`, `package.json`, `tests/shots/**` | step 0 | 60 fps capture + flash/luminance script; baseline at 30 and 36 cells, 4 viewports, 4x CPU; G1-G9 plus scripted subset of Engine [181]-[275]; zero console errors incl. replay |
| 11 CONTENT-RELEASE | rules text and data, fixtures, contract docs, store art, build | `src/rules.js`, `src/i18n/en_rules.js`*, `data/rules_data.json`, `tools/gen_rules_data.mjs`, `fixtures/**`, `CONTRACT.md`, `tools/build/**`, `tools/art/**`, `dist/**`, `VERSION`, `docs/v2/**`* | 9 (shares) | RTP and max win per mode, every layout and mission with final shares, [185] verbatim, word screen pass, sober tile and cover, `verify:build` green |

Files created in step 0 and who owns them now: `src/settings.js` WP1; `src/ui/ui.css` WP1; `src/render/heroine/heroine.css` WP3; `src/render/layers/{index.js,layers.css}` WP6; `src/render/{geo,celebrate}.js` WP4; `src/i18n/en_{ui,hero,layers,rules}.js` WP1/WP3/WP6/WP11; unit tests `tests/core/{geo,celebrate,settings,layers,audio_api}.test.mjs` and the import list `tests/core/index.js` WP10 (the settings and audio tests pin the contract of sections 1-2: their owners WP1/WP2 send a request file to WP10 for new cases, or WP10 grants direct edits); `docs/v2/INTERFACES.md` and `docs/v2/NOTES_STEP0.md` WP11 (docs/v2/**).

Small edits made to shared files in step 0 (all inert): `src/main.js` (import `settings`, `settings.applyJurisdiction(fs)` after authenticate), `src/render/index.js` (imports `EN`, `geo`, `dispatch/resetLayers`; `layerCtx`; one dispatch line in the book loop; `resetLayers()` at book start/end/destroy; `mascot.react`), `src/render/mascot.js` (`REACT_KINDS`, `react` stub), `src/audio.js` (API skeleton above), `src/i18n/index.js` (merge), `index.html` (section 8).
