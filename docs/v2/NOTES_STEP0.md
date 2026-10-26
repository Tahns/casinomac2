# NOTES step 0 (frozen interfaces and stubs), running log

Owner while it ran: one agent, temporarily on ALL shared front-end files (index.html, styles.css, src/main.js, src/i18n/*, src/audio.js, src/render/mascot.js, src/render/index.js), only to create stubs with the smallest edits. Ownership is exclusive again as listed in `docs/v2/INTERFACES.md` section 10.

## Done

1. `src/settings.js`: store with `get/set/on`, `capabilities` (all 12 jurisdiction flags, positive polarity, safe defaults), `applyJurisdiction`, `reset/flush`, derived values (`motionLevel`, `flashReduced`, `contrastOn`, `ledgerOn`) that follow the OS media queries live, `data-*` attributes on `<html>`, whitelist storage (`am_muted`, `am_vol_*`, `am_settings`) with try/catch and an in-memory fallback, debounced write + flush on `pagehide`. `main.js` calls `settings.applyJurisdiction(config.jurisdiction)` after authenticate.
2. `src/audio.js`: `setVolume/getVolume/volumes/preview/onChange`, `play(id)` is strict (unknown / non-string / prototype ids return false), `setMuted` notifies. No buses: volumes are stored and announced but inaudible until WP2.
3. `src/render/mascot.js`: `react(kind, info)` stub (returns false) + `REACT_KINDS`; `renderer.mascot.react` delegates to it.
4. `src/render/layers/index.js`: `LAYERS = []`, `dispatch(ev, ctx)`, `resetLayers()`; call site in the book loop of `render/index.js` (layers run concurrently with the player's own handling of the event, errors isolated), reset at book start/end/destroy.
5. `src/render/geo.js`: `setLayout/getLayout/toGeo/toPadded` (+ object forms, `hasCell`, `cellsOf`, `revealLength`, `isValidLayout`, `FLOOR_PLANS`); Mezzanine equals the v1 `row - 1` mapping. Golden fixtures in `tests/core/geo.test.mjs` for the four plans (30/26/24/36 cells).
6. `src/render/celebrate.js`: `level(R, C)` 0..3 (L0 `R <= C`, L1 `(C, 5C)`, L2 `[5C, 15C)`, L3 `>= 15C`), `isCelebratory`, `crossedCost`, `THRESHOLDS`; unit tests at cost 1 and 100.
7. `index.html`: `#btn-settings` (hidden, after `#btn-sound`), `#modal-settings` (hidden, empty box), `#heroine-slot` (hidden, after `#mascot-slot`), three empty stylesheets linked (`src/ui/ui.css`, `src/render/heroine/heroine.css`, `src/render/layers/layers.css`). `src/i18n/index.js` merges `en.js` + `en_ui.js` + `en_hero.js` + `en_layers.js` + `en_rules.js` (partials created empty); exports `EN`, `hasKey`; `render/index.js` now reads the merged table.
8. `docs/v2/INTERFACES.md` (every frozen signature, ownership table copied from SYNTHESIS section 9), this file.
9. Tests added to `tests/core` (registered in `tests/core/index.js`): geo, celebrate, settings (U2 to U5 style), layers dispatcher, audio API skeleton.

## Decisions

- "Identity for Mezzanine" is read as: the new mapping reproduces the v1 renderer exactly (`vis(row) = row - 1`, padded = compactIndex + 1). Out-of-plan rows return -1 (v1 filtered them with `inB`).
- Capabilities are positive (`turbo: true` = may be offered). One capability per flag; extra fields `minRoundMs`, `anticipation`, `ledgerLocked`. `minimumRoundDuration` is assumed to be milliseconds (RGS.md elides it), clamped to 0..60000.
- Settings model: tri-state `null` for reduce-flash and high-contrast ("follow the OS until the player decides"); derived keys are read-only and fire `on(...)`.
- audio.js keeps owning the audio keys (mute and volumes) so `tests/audio/harness.html` (imports only audio.js) keeps working and there is one source of truth for mute; settings.js only owns `am_settings`.
- Gear button, settings dialog and heroine slot are `hidden` in step 0 so v1 shows no dead control; WP1 removes `hidden` when each is wired.
- Layers run concurrently with the player's own handling of the same event (not before or after it): a layer that needs to hold the book returns a Promise.

## Gotchas found (everybody)

- `node --test tests/core tests/text` resolves each DIRECTORY to its `index.js`: a new test file runs only if the folder's `index.js` imports it.
- The guideline runner [275] turns AT RISK on any occurrence of the word "stake" in `frontend_mambo/src/**` (code comments and identifiers included; the sanitizer regex in `social.js` is whitelisted). First draft of this step tripped it with a comment and a function name; fixed (`crossedCost`).
- The guideline runner writes screenshots to `tests/shots` and the report to `tests/guidelines/REPORT.md` (tracked files). For a throw-away check run it from a copy of `frontend_mambo` (without `dist`, `tests/shots`) with `PORTS=<game>,<rgs> QA_REPORT=<scratch file>`.
- Another agent committed a snapshot of the working tree while this step was running (commit `118a5b1`): it contains intermediate versions of `audio.js`, `mascot.js`, `settings.js`, `layers/index.js`. Every intermediate state kept v1 working; the final commit of this step supersedes them.
- Chromium for Playwright is the file `/opt/pw-browsers/chromium` (not a folder with `chrome` inside).

## Left / handed over

- WP1: wire the gear and the dialog, call `audio.setVolume/onChange`, read `settings.capabilities` for the 12 flags, extend `settings.test.mjs` through a request to WP10 if needed.
- WP2: buses and taper behind `setVolume`, `settingsTest` cue and the other new ids.
- WP3: implement `react()` and the final `REACT_KINDS`, `heroine.css`, `en_hero.js`.
- WP4: use `geo.setLayout/toGeo` for event positions (the v1 `vis()` stays valid for Mezzanine), `celebrate.level` gate, `renderer.mascot.react`, extend `layerCtx`.
- WP6: fill `LAYERS`, `layers.css`, `en_layers.js`.

## Known flaws

- Volumes have no audible effect yet (by design, WP2).
- `settings.js` writes `data-motion`, `data-flash`, `data-contrast`, `data-text` on `<html>` but no CSS reads them yet (WP1/WP4/WP5).
- `REACT_KINDS` is a proposal made from SYNTHESIS section 5; WP3 finalises it.
