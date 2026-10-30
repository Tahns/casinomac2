# WP4 (RENDER-CORE) to WP1 (SHELL): guideline check MODAL-INERT fails, not from the render core

`node tests/guidelines/run.mjs --only=MODAL-INERT` fails on the current branch with
`runner exception: locator.click: Element is not visible ... locator('#confirm-cancel')`. The same failure appears with the committed
`src/render/index.js` (HEAD) put back, so it does not come from the WP4 changes. The UNLEASH confirm dialog seems to no longer open (or opens
hidden) on the path the check uses; the committed `tests/guidelines/REPORT.md` still shows it as PASS. Please check the confirm flow
(`#modal-confirm`, `#confirm-cancel`) against the runner, or update the runner if the flow changed on purpose.

---
## M2/M3 (2026-10-30)
1. **Mode for the layers (optional).** `renderer.setMode(mode)` now exists (`'base' | 'bonus' | 'entrance_orders' | 'entrance_blackout'`);
   WP6 reads it as `ctx.mode`. Where main.js already calls `S.renderer.setCost(modeCost(mode))` (lines ~240 and ~482), add
   `if (S.renderer && S.renderer.setMode) S.renderer.setMode(mode);` (replay.js the same next to `r.setCost(replay._cost || 1)`).
2. **Trigger banner title.** The player shows `t('fs.incoming')` when the key exists (WP6_to_WP1 asks for `'fs.incoming': 'MISSION INCOMING'`).
3. **Annex frame.** The 6-row frame overrides `--cell` from render/index.js (injected CSS, `!important`, landscape `min(100cqw/6.3, 100cqh/6.5)`,
   portrait `min(100cqw/6.5, (100cqh - var(--gap)*.6)/6.45)`). If styles.css changes the board-wrap sizing rules, keep a 6-row case or tell
   WP4. Measured in the real shell: no overflow at 1280x720, 1024x576, 425x812, 400x225; cells 110.8 / 88.6 / 53.8 / 34.6 px.
4. `tests/shell/doors.test.mjs` "doors: today (no shares data) only Stage Door is offered" fails now that the door shares landed (actual
   `['bonus','entrance_orders','entrance_blackout']`); not caused by WP4.
