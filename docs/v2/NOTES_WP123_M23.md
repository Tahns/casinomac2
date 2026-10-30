# NOTES WP1 SHELL + WP2 AUDIO + WP3 HEROINE, milestones 2 and 3 (running log, resume from here)

Ports 5930-5939 (5930 static, 5931 mock RGS, 5932-5935 guideline runner / browser suites, 5936-5939 scratch). Scratch scripts:
/tmp/claude-0/scratch/wp123/. Commit only owned paths (SYNTHESIS 9: WP1 + WP2 + WP3 files, docs/research2/art/**, docs/v2/CHARTER.md,
this file, request files).

## Plan
1. Shell: open requests (WP11_to_WP1 1/2/4, WP6_to_WP1 fs.incoming, WP4_to_WP1 setMode, WP5_to_WP1 strings).
2. Audio: music default 5 %, caseOpen win-like only above the spin's cost share, setMeter quiet (WP4_to_WP2), gesture gate test.
3. Heroine: mission reactions (caseOpen, spotlight, layout), setOutfit(name, {hidden}), back to inspectrice, idle on 12 fps (WP5_to_WP3),
   visual check of 4 outfits x poses, fixes in docs/research2/art + sync.
4. Fonts + charter: Luckiest Guy embedded (assets/fonts, Apache-2.0 licence next to it), system text stack, docs/v2/CHARTER.md.
5. Tests: no-raster, DPR 1/2/3, flicker, music 5 %, press-to-play.
6. Suites + guideline runner, screenshots at 4 viewports, commit.

## Log
1. **Shell (986bc5e)**: doors test split (no-shares copy -> Stage Door only; real FINAL data -> three doors), Info tab SETTINGS paragraph
   dropped (rules.js has it), version 2.0.0, `fs.incoming` = MISSION INCOMING, `label.meter` = CLEARANCE DIAL + meter.title / bands / fx.bam
   (en_ui.js), `renderer.setMode(mode)` next to every setCost (main.js x2, replay.js with params.replayMode). WP5_to_WP1 item 1 / 4a were
   already applied by WP10 (kept).
2. **Audio + heroine (41de077)**: `DEFAULT_VOLUMES = { master 75, music 5, sfx 75 }` (engine default stays unity so the A4 renders do not
   move), `resetVolumes` / `defaultVolume(kind)`; `caseOpen` has `winLikeIf: 'aboveCostShare'` (`cueWinLike(id, {win, costShare})`, the
   vibraphone lift only when win > costShare and never with `quiet`); `setMeter(n, {quiet})`. Nothing is audible before the first gesture
   (AudioContext created on the first pointer/key event; no overlay needed, authenticate is never blocked: gesture.mjs G1).
   Heroine: kinds `caseOpen` (ratio > 1 -> small win, else neutral point), `spotlight`, `layout` (neutral points with their own cooldowns),
   `setOutfit(k, { hidden: true })` + replay when called before the rig is ready, `outfit` getter, Calm under `html[data-quality=calm]`
   (MutationObserver), rig source `idleHz: 12` (at rest the SVG is written on the 12 fps grid), frameGuard patch re-anchored, sync ok.
   tests/core/audio_api.test.mjs (WP10) one line changed in the same commit (INTERFACES rule), WP123_to_WP10 says so.
3. **Art check**: rig_test (static server 5936 on docs/research2, killed by PID) contact sheets of inspectrice / lab / trench / casino in
   idle point smallwin bigwin shock shrug salute curtsy think + winSmall (kick) and lose clips: legs leave from the hem, feet below it,
   gown feet under the flare, gloves, shoes and faces clean, all covered and sober. No defect found, no art change needed.
4. **Fonts + charter (d5e67a3)**: Luckiest Guy in `assets/fonts` (+ Apache-2.0 text, README), `@font-face` weight 400 900 swap, preload,
   `--disp` first family; text stays on the system stack. `docs/v2/CHARTER.md`. Screens viewed with the font: game at 4 viewports,
   settings at 400x225 / 1280x720, door confirm at 425x812: nothing clipped.
5. **Browser checks**: `tests/heroine/visual.mjs` 17/17 (R no raster, F fonts, D dpr 1/2/3, K flicker worst 2 toggles / 100 ms on .mb-glint,
   S 4 viewports); `tests/audio/gesture.mjs` 6/6; `tests/audio/audio.test.mjs` ALL PASSED (161); `tests/heroine/browser.mjs` 41/41.
6. **Guideline runner** (5932/5933, report in /tmp/claude-0/scratch/wp123/REPORT_guidelines.md, WP10's REPORT.md and tests/shots untouched /
   restored): 39 PASS, 7 FAIL, 1 AT RISK. The 7 FAILs ([31], UNL-MIN-USD/JPY/MXN, WIN-bonus-*) are the known door-selection gap of the runner
   (WP11_to_WP10 item 4: the FINAL shares offer three doors, nothing pre-selected, the runner clicks CONFIRM without picking a door); [275]
   AT RISK = `pGtStake` in WP11's data/rules_data.json. None comes from this package. shell.mjs (5934/5935): 13 PASS, 1 FAIL = PICKER's
   stale "only Stage Door today" line (request WP123_to_WP10 item 4). menu.test.mjs ALL PASSED after its default-slider line follows Music 5.

## Open / for a human
- Music at 5 % on the taper is -42 dB under the v1 mix: very quiet by design (slot guide rule); ear check wanted.
- caseOpen win layer and the new cues not listened to (ear check). WP6 must pass { win, costShare } for the win layer (WP123_to_WP6).
- The mission reactions need a caller (WP6 or WP4, requests written).

## Review fix round (BUILD-LICENCE-URL)
- Reviewer: release build exited 1 on the apache.org URLs inside the shipped font licence. build_front.mjs is WP11's; WP11 had already
  exempted `assets/fonts/LICENSE-*.txt` (2b745e3). Re-verified on /tmp/claude-0/scratch/wp123/fm: build exit 0, licence shipped,
  verify:build clean. Recorded in docs/v2/requests/WP123_to_WP11.md (closed). Licence link in index.html kept.
