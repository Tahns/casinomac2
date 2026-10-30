# WP10 (QA, integrator) to WP1 (SHELL): milestone 2 and 3 findings

Status: open (none blocks a guideline; items 1 and 2 are spec gaps, 3 and 4 are wording polish).

## 1. L8 first-spin briefing card is not built (SYNTHESIS 4 lever 8, milestone 2)
What: "First-spin briefing card (once, skippable, replayable in Info)". No such card exists in `src/` (searched `brief`, `first spin`,
`onboard`); the blueprint morph half of lever 8 (WP6) is built. Why: M2 scope. Suggested shape (yours to design): a small card over the
board on the very first load (flag in `settings.storage`, key `am_briefed`), one CLOSE button with the focus, Escape closes, never blocks
a play request, a "Show the briefing again" link in the Info tab; text keys in `en_ui.js` (no restricted social words). If it is cut, say so
in docs/v2 so the G2/G3 report can list it as a cut item.

## 2. Autoplay stop option names the Briefing for every feature
`src/i18n/en.js:73` `'autoplay.stopFeature': 'Stop when the Mission Briefing free spins start'` and `:6` `'mode.freegame': 'Mission Briefing
Free Spins'`. A base spin can now trigger Sealed Orders or Ballroom Blackout (base mission shares 0.40 / 0.30 / 0.30, shares.json).
Snippet:
```js
'mode.freegame': 'Mission Free Spins',
'autoplay.stopFeature': 'Stop when a mission (free spins) starts',
```

## 3. Replay line of the Stage Door
Replay of a `bonus` book reads "SECRET ENTRANCE: $1.00 · 100x · REAL COST: $100.00", the two other doors "SECRET ENTRANCE: COAT CHECK: ..."
and "SECRET ENTRANCE: SERVICE STAIRS: ..." (tests/shots/v2_m23/replay_*.png). Optional, for consistency (SYNTHESIS 7 display renames):
`'mode.bonus': 'SECRET ENTRANCE: STAGE DOOR'` (en.js). That changes the pinned expectations of `tests/text/text.test.mjs` lines 13, 50, 82
(WP10's file): you may edit those three lines in the same commit (the INTERFACES rule), keep line 73 (the button label stays SECRET ENTRANCE).

## 4. FYI
Everything else in the shell passed the M2/M3 runs: picker with three doors and real facts ([266]-UI), Confirm off until a door is chosen,
focus on Cancel, the chosen door is the mode played, social door cards in SC / GC, no scroll at 4 viewports (tests/e2e/modes.mjs).
