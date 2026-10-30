# NOTES WP1 SHELL (running log)

Owner: WP1. Ports 5820-5829 (static 5820, mock RGS 5821, runner copies 5822-5825). Files: `index.html`, `styles.css`, `src/main.js`, `src/settings.js` (unchanged), `src/ui/**`, `src/replay.js`, `src/bet.js`, `src/input.js`, `src/i18n/{index,en,social,en_ui}.js`. New tests: `tests/shell/**`, `tests/guidelines/shell.mjs`. Requests sent: `docs/v2/requests/WP1_to_WP{3,4,10,11}.md`. Requests received: `WP2_to_WP1.md` (done, see below).

## Done

- **Settings dialog** (`src/ui/settings_dialog.js`, built on first open into `#modal-settings`): role=dialog, aria-modal, labelled by its title, 4 tabs Sound / Display / Play / Info through ONE APG tabs helper (`src/ui/tabs.js`: automatic activation, arrows wrap, Home/End, hidden tabs skipped). Controls and storage exactly as SYNTHESIS 6:
  - Sound: Mute sound (switch, `audio.setMuted`, follows `audio.onChange`), Master / Music / Effects (range 0-100 step 1, readout, `aria-valuetext` "N percent" / "Off", `audio.setVolume` on input, `audio.preview(kind)` on change; WP2 owns buses and rate limit).
  - Display: Motion Auto/Full/Calm/Still (radios), Screen flash effects (switch, `reduceFlash = !on`), High contrast, Session summary (locked on and `aria-disabled` by `displayNetPosition` / `displaySessionTimer`). All through `settings.set` (`am_settings`, debounced, whitelisted).
  - Play: Turbo switch and Autoplay button (opens the existing autoplay panel; "Stop autoplay" while running; "available between rounds" otherwise). NOT stored. Hidden by `disabledTurbo` / `disabledAutoplay`; both off removes the tab.
  - Info: RTP line (only with `displayRTP`), this-session net position and time (live), the rules grouped from `rules.js buildRules` as `<details>` (Rules, Paytable / Win table, Controls + a SETTINGS paragraph, Modes and RTP, Legal with the [185] text), version.
- **Gear** `#btn-settings` (visible, after `#btn-sound`; inside the menu at height <= 360 px; the menu stays open on gear and sound so focus can return to it). Replay: the gear is `#replay-settings` in the replay bar at every size (portrait and compact had no sound control at all); the dialog has 3 tabs there (no Play tab).
- **Dialog behaviour for every modal** (main.js): inert background (`replay-bar` / `replay-ui` added), focus in, focus returns to the opener (last button activated, fallback `#btn-menu` then `#btn-bet`), Escape closes settings / autoplay / confirm, Tab wraps (`ui/dom.js trapTab`), backdrop click closes settings. Autoplay waits while any dialog is open.
- **Space** (`input.js spaceDecision`): never spins in a dialog or when `disabledSpacebar`; inside a dialog a focused control keeps the native Space (toggle); a focused SPIN button does not click on Space when the spacebar is disabled (keyup guard); replay and pre-auth leave the key alone.
- **All 12 flags** (capabilities from `settings.js`, applied by `main.js applyCaps`): socialCasino (existing flip + dialog rebuild), disabledFullscreen, disabledTurbo, disabledSuperTurbo (replay SKIP hidden; live game ships one turbo level), disabledAutoplay, disabledSlamstop (capability + `body.no-slam`; the event player honours it, request to WP4), disabledSpacebar, disabledBuyFeature (button hidden and disabled: no dialog, no doors), displayNetPosition / displaySessionTimer (summary locked on), displayRTP (RTP line), minimumRoundDuration (`createPacer`: next round never before t0 + ms, turbo and autoplay included; the wait happens after the result is on screen, state stays `settling`).
- **Session summary** `#ledger` in `#hud-info` (`src/ui/ledger.js`): net position (returned minus cost, per round, a resumed round is not counted) and time played; neutral colours, one slim row (two stacked rows at <= 360 px high, full-width strip in portrait). Not stored. Costs about 29 px of height in portrait.
- **Heroine box** (`src/ui/heroine_shell.js` + `ui.css` + `styles.css`): `#heroine-slot` is the grid area `mascot` of the LEFT column (landscape), full figure from 140 px of box height, waist-up crop under 140, face crop under 80 (publishes `data-crop`, `data-mode`, event `am:heroine-layout`). Portrait: a free corner at the left edge found against grid frame, logo strip, HUD plates and every visible button (`findCorner`, unit and fuzz tested): bust first, face when only a small gap is free, hidden when nothing fits. Shown only once the slot has a child (WP3's rig), `#mascot-slot` is retired then. Verified with the REAL rig at the 4 viewports (178x272, 139x213, 70x57, 69x99; no overlap with the grid, any button, any HUD plate; no page scroll). Clip: nothing leaves her column sideways or downwards (`clip-path: inset(-18% 0 0 0)`).
- **Entrance picker**: ONE Secret Entrance button; the confirm dialog shows the real cost (also on each card), focus on Cancel, nothing pre-selected, no countdown or pressure wording. Three door cards (Stage Door = `bonus`, Coat Check = `entrance_orders`, Service Stairs = `entrance_blackout`); a card appears only when `rules_data.json` lists the mode AND has `shares[mode]`; Stage Door always. One card: informational, Confirm enabled. Several: radio cards, Confirm off until one is chosen. Facts printed only from data (RTP, max win, median, share of rounds returning more than the cost).
- **Motion / flash / contrast CSS**: `html[data-motion=calm|still]` replaces the prefers-reduced-motion block (Full beats the OS; pseudo-elements written out, not inside `:is()`), `data-flash=reduced` hides `#flash` and the reel glow flicker, `data-contrast=more` removes halftone textures and heavies the ink.
- **Layout side effects** (styles.css): the four tools (sound, settings, info, fullscreen) share one row of their own (smaller buttons, landscape only); `:has(#mascot-slot)` selectors now read `:has(:is(#mascot-slot,#heroine-slot):not([hidden]))` (same relative specificity everywhere).
- **WP2's request** (`WP2_to_WP1.md`): `#btn-sound` now calls `audio.toggleMute()` and never writes `body.muted` itself; aria-valuetext "Off" at 0; `onChange` listeners tolerate the extra `silent` field. The optional "reset sound levels" button (`audio.resetVolumes()`) is NOT added (not in the SYNTHESIS table).

## Decisions

- Gear in replay lives in the replay bar, not the HUD column (hidden in portrait and compact, and the HUD gear is hidden in replay to avoid two gears).
- Info tab reuses `buildRules` instead of copying text: one source (WP11), `<details>` keep the dialog short.
- Display "Screen flash effects" is the inverse of `reduceFlash`; touching it ends "follow the OS" for that setting (null -> boolean), same for High contrast.
- Mute switch and speaker can differ: the speaker shows "silent" (muted, Master 0 or both mixes 0, WP2), the switch is the mute flag only.
- A card for a missing mode is not rendered at all (not greyed out): no "coming soon" (nothing to advertise before the math exists).
- Tests that need random books use `force: 'loss'` (the mock picks books per session; some animations take > 20 s).
- `MODE_COSTS` stays `{base, bonus}` (pinned by `tests/core/core.test.js`); the later doors cost 100x through `DOOR_MODE_COSTS`.
- Min-round wait is in `main.js playRound` after settle, so every path (button, Space, autoplay, turbo) is covered once.

## Left / ideas

- WP3: draw into `#heroine-slot` and read `data-crop` / `am:heroine-layout` (request sent). WP4: host lookup, slamstop, motion store. WP11: SETTINGS bullet in rules controls, `shares` data. WP10: import `tests/shell/index.js`, optional `qa:shell` script.
- Not built (cut candidates): break reminder (`remind` setting reserved), text size (`text` reserved), reset-to-defaults button, `disabledSuperTurbo` graded skip (needs `setSkip(factor)`).
- Display name `mode.bonus` stays `SECRET ENTRANCE` until the 3-door data exists (a test pins it).

## Flaws / watch list

- 400x225: the session summary plus three HUD plates leave only 70x57 px for the heroine (face crop). Acceptable for the smallest viewport, but a human should look.
- Info tab content is as wide as `rules.js` tables: they scroll inside the dialog only (checked at 4 viewports).
- Dialog height is fixed (430 px, 560 px portrait) so switching tabs never moves it; short tabs show empty space at the bottom.
- `html[data-motion=still]` also kills CSS transitions of the whole page (by design); JS-driven motion is WP4/WP5.
- Not tested on a real touch device (slider drag, iOS silent switch): human step.

## Verification (final state of this step)

- `cd frontend_mambo && node --test tests/core tests/text tests/shell`: 95 tests, 95 pass (60 existing + 35 new in `tests/shell`: tabs helper, ledger, door picker, Space guard and pacer, heroine-box finder with a 600-case fuzz, i18n and source hygiene, settings contract).
- `node tests/guidelines/shell.mjs` (own servers on 5824/5825): 14 PASS, 0 FAIL, 0 console errors, 0 page errors, 0 external requests: G1 to G8, FLAGS (12 flags), HERO, MOTION, LEDGER, PICKER, PACE. Reports: `/tmp/claude-0/scratch/wp1/shell_report3.md`; screenshots with `QA_SHOTS=<dir>`.
- Existing runner `tests/guidelines/run.mjs`, run from scratch copies (never in the tracked tree), own ports 5822/5823: first full pass 44 PASS, 2 FAIL, 1 AT RISK; after fixes the 38 affected checks give 37 PASS and ONE FAIL:
  - **[MODAL-INERT] is red and cannot be made green without dropping a stated requirement.** The Secret Entrance confirm now focuses CANCEL (brief: "focus on Cancel"); the check presses Enter after `focus('#btn-bet-plus')`, which is a no-op on an inert element, so the key activates the focused CANCEL button (correct: it closes the dialog), after which `focus('#btn-bet')` + Enter starts a round. Proposed rewrite (Tab wraps inside, everything behind is `[inert]`, Space starts nothing) is in `docs/v2/requests/WP1_to_WP10.md` item 7; G4, G5 and G7 assert the same properties.
  - [228] failed once in the first pass on a random long book (Space round that never ended within the check's 60 s in real time); passed 2 of 2 on a clean HEAD copy and 4 of 4 on my tree afterwards. Not caused by the shell (the mock picks books per session).
  - [275] AT RISK in the first pass was a comment of mine containing the forbidden word; fixed and re-run: PASS.
  - Static review: the new element-level arrow-key listener of the tabs helper was flagged ("Space must be on window"); the helper registers it through a constant, the Space shortcut stays a single window listener in `main.js`.
- Live with WP3's rig (the shared tree already redirects `createMascot(#mascot-slot)` into `#heroine-slot`): the box and the crop contract work as designed at 1024x576 (178x272, full), 800x450, 400x225 (70x57, face crop) and 425x812 (corner 69x99, bust); portrait replay finds a much larger free corner (170x243) because the HUD buttons are hidden there. Extra sizes checked with a stand-in rig: 360x640 and 390x844 (face crop corner), 320x568 (hidden, no room), 768x1024 (bust 182x260), 1280x720, 640x360, 1920x1080 (full, left column). No overlap, no page scroll in any.
- `html[data-contrast=more]`, `data-motion=still|calm`, `data-flash=reduced` screenshots viewed (textures off, plates solid, loops off).
- Every `localStorage` / `fetch` / external host / the word "stake": none in the files of this WP (asserted by `tests/shell/i18n.test.mjs`).

## Known issues / for a human

- MODAL-INERT as above (WP10 edit).
- Screen reader pass of the dialog (tabs, switches, sliders, the Info `<details>`), touch drag of the sliders and the iOS silent switch are human steps.
- 400x225 is tight: three HUD plates + the summary leave a 70x57 box; free spins hide the HUD free-spin plate there (the board chip shows the count).
- The Info tab prints `rules.js` text; the SETTINGS button is only explained there until WP11 adds it to the rules (request sent, Engine [235]).
- `settings.js` was not changed: all needs were met by the step-0 store.

## Fix pass (milestone 1 review: V1-GUIDELINE-MODAL-INERT)

- Reviewer finding: full `run.mjs` on HEAD = 45 PASS, 1 FAIL ([MODAL-INERT]), 1 AT RISK (same as baseline). The cause is the required focus-on-Cancel in the Secret Entrance confirm (SYNTHESIS line 74): the check's `focus('#btn-bet-plus')` is a no-op on an inert node, Enter activates CANCEL, then BET starts a round.
- Decision: no change to WP1 code (moving the focus would break [31] / the brief). The check lives in `tests/guidelines/run.mjs` (WP10). `docs/v2/requests/WP1_to_WP10.md` item 7 now has a **verified drop-in block** (Tab x12 stays inside `#modal-confirm`, BET/BET+/UNLEASH under `[inert]`, Space changes no bet and sends no play, Escape closes, no `[inert]` left).
- Verified on a clean `git archive HEAD` copy under /tmp/claude-0/scratch/wp1/fixv (patched there only), ports 5820/5821: `QA_ONLY=MODAL-INERT,31,UNL-PRICE` gives 3 PASS, 0 FAIL. Screenshot after 12 Tabs (/tmp/claude-0/scratch/wp1/fixv/confirm_focus.png, ports 5822/5823): focus ring on CANCEL, Stage Door card with cost $1,000.00, nothing pre-selected.
- `node --test tests/core tests/text tests/shell`: 95/95 pass.
- Still open: until WP10 applies item 7, the full v1 guideline runner shows this one FAIL.
