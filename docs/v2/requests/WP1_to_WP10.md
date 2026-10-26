# WP1 (SHELL) to WP10 (QA)

1. **Register the shell unit tests** in `tests/core/index.js` (yours): one line imports everything (tabs helper, ledger, door picker, Space guard and pacer, heroine-box finder, i18n and source hygiene, shell contract of the settings store; 35 tests, no browser):
```js
import '../shell/index.js';
```
   They also run alone: `cd frontend_mambo && node --test tests/shell`. The step-0 `tests/core/settings.test.mjs` (U2 to U5) stays as it is and is green with the shell.
2. **Guideline checks G1-G8 + extras**: `tests/guidelines/shell.mjs` (new file, uses `lib.mjs` read-only). `node tests/guidelines/shell.mjs [--only=G1,G3,FLAGS]` starts its own servers (`PORTS="game,rgs"` to choose), writes `tests/guidelines/REPORT_shell.md` (or `QA_REPORT=`) and exits non-zero on any FAIL, console error, page error or external request. Ids: G1 dialog in every screen scan (en and zz), G2 four viewports, G3 targets >= 24 px, G4 focus in / out, G5 no wallet call while open (also with autoplay running), G6 replay gear, G7 keyboard, G8 social scan with XSC (also the three door cards); extras FLAGS (all 12 flags), HERO (heroine box), MOTION (Auto follows `emulateMedia`), LEDGER, PICKER, PACE. `runShellChecks()` is exported; to run it inside `run.mjs` call it after the browser is launched (it keeps its own `results`; `import { runShellChecks } from './shell.mjs'`). `QA_SHOTS=<dir>` saves screenshots (default none).
3. **`package.json`** (yours): suggested script `"qa:shell": "node tests/guidelines/shell.mjs"`.
4. **Existing checks I touched knowingly.** [228] still sees `preventDefault` on every Space keydown of the main screen; inside a dialog Space is deliberately left to the focused control (native toggle), which is the SYNTHESIS 6 rule. [31] / UNL-* / WIN-bonus keep working: with a single door the confirm dialog has one informational Stage Door card, Confirm is enabled, focus is on Cancel. `MODE_COSTS` is untouched (the two later doors live in `DOOR_MODE_COSTS`).
5. **`tests/text`**: `t.mode('bonus')` is still `SECRET ENTRANCE` (the test pins it). The display renames of SYNTHESIS 7 ("Secret Entrance: Stage Door" ...) wait for the shares data; when they land the pinned expectation in `text.test.mjs` must change in the same commit.
6. **Settings in the existing screen scan (`run.mjs collectScreens`, yours).** Add the dialog next to autoplay / confirm / info so [239] [240] [77] [225] [78] scan it too (the dialog tabs are `[role=tab]`, so the existing tab-click loop works when the condition also accepts `settings`):
```js
await tryOpen('settings', '#btn-settings');                       // after the 'info' line
// and in tryOpen: if (name === 'info' || name === 'settings') { ...same tab loop... }
// the gear is inside the menu popup at height <= 360: click '#btn-menu' first in that case (else the screen is reported "missing")
```
   `closeOverlays()` already closes it (Escape). `tests/guidelines/shell.mjs` G1 and G8 do this scan today with the Info `<details>` opened.
7. **[MODAL-INERT] needs a small rewrite (it is the one existing check my change turns red).** The Secret Entrance confirm now puts the focus on CANCEL, as the v2 brief requires ([31]: the safe answer has the focus). The check presses Enter / Space after `focus('#btn-bet-plus')` / `focus('#btn-bet')`; inert elements cannot take the focus, so the key goes to the focused CANCEL button, which closes the dialog (correct behaviour), after which `focus('#btn-bet')` works and Enter starts a round: `playsBehind` becomes 1 and the final `#confirm-cancel` click finds nothing visible. The property the check wants (nothing behind an open dialog reacts to the keyboard) can be probed without that assumption:
```js
// after opening the confirm dialog, with the focus where it is (on CANCEL):
for (let i = 0; i < 12; i++) await s.page.keyboard.press('Tab');                // Tab must wrap inside the dialog
const inside = await s.page.evaluate(() => !!document.activeElement.closest('#modal-confirm'));
const behind = await s.page.evaluate(() => ['btn-bet', 'btn-bet-plus', 'btn-unleash'].map((id) => document.getElementById(id).closest('[inert]') !== null));
await s.page.keyboard.press('Space');                                             // focus on a dialog control or body: no round starts
// expect: inside === true, behind all true, bet text unchanged, plays === 0; then Escape closes the dialog
```
   G4 / G5 / G7 in `shell.mjs` already assert these properties.
