# SWOT 2 - Front end: UX, performance, juice, attractiveness

Method: own servers (static :5310, mock RGS :5311). The stock mock serves stale `books_*_sample.jsonl` with no fuse events, so for fuse and bonus I ran a copy of the mock (:5312) over the newer `.json` books, with payouts x100. Chromium headless, software GL. Shots: `frontend/tests/shots/swot2_*.png`.

## Strengths
- **First impression.** The 1960s print look holds together (halftone, ink outlines, Old Gus, hanging lantern). Symbols are clear down to 65 px cells on 425x812 and 40 px on 400x225 (`swot2_1024_idle.png`, `swot2_425_idle.png`). Layout holds at all four viewports.
- **Load.** 22 requests, 264 KB raw, about 77 KB gzipped (JS 59 KB, CSS 15 KB, HTML 2.4 KB). No images or fonts. Idle in 381 ms (local; 966 ms on the first cold run).
- **No leaks.** Over 50 forced spins, DOM stayed at 1143 nodes, JS heap flat at ~10 MB, and running animations stayed in the 71-105 range. Audio creates 130-1500 nodes per spin but the voice cap is 56 (`audio.js:7`) and nodes are fire-and-forget.
- **Big moments.** The free-spin intro "UNLEASHED MINE" (`swot2_trig_t05.png`) and the end banner with rays and "KA-CHING!" (`swot2_bonus1_t40.png`) have real drama. Banners can be tapped to skip (`render/index.js:450`).
- **Win clarity.** Winning clusters are outlined, losing symbols are dimmed, and a per-cluster amount plus a combo chip appear (`swot2_fuseblast_*`). The mascot bubble is rate-limited to one per 3.5 s (`index.js:72`).
- **Input and a11y basics.** Space spins, there is a focus ring (`styles.css:36`) and Tab order is sensible. `prefers-reduced-motion` cuts idle frame time from median 33 ms to 16.7 ms (68 to 2 infinite animations).
- **Audio (structure only).** All WebAudio, with a master gain, compressor and limiter. A swing bed for base play and a faster blues bed for free spins. It pauses when the tab is hidden.

## Weaknesses (fix -> file)
1. **UNLEASH celebrates losses.** Banner tiers use x of base bet (`render/index.js:431-438`). The UNLEASH round in `swot2_bonus1_t40.png` cost $100, paid $31.20, and the banner read "MEGA WIN" with KA-CHING. A 1.5x base trigger ran 49 s (22 s turbo) and ended with "Hold onto your hat!" (`index.js:591`). Fix: pass the real cost multiplier into the renderer. Tier by payout / cost, and show "$31.20 of $100.00" below the tier name. Only say "hold onto your hat" when the payout is at least the cost.
2. **WIN number contrast.** Brick on mustard measures 2.83:1 (`styles.css:79`). BET and UNLEASH text on teal and orange measures 3.0-3.3:1 at 9-12 px. Fix: use ink on mustard, and darken `--teal` and `--orange` or switch their text to ink.
3. **Tiny touch targets.** The bet -/+ buttons are 24 px on 1024x576, 20 px at 800x450 and 15 px at 400x225 (`styles.css:161`). HUD labels are 5.8 px at 400x225 and 8.9 px at 1024x576. Fix: use a 40 px hit area via padding or `::before` (keep the visual size); raise the label floor to 9-10 px and cut the label text instead of shrinking it.
4. **Mobile bubble covers the board.** At 425x812 "NICE ONE!" is ~330x60 px over the bottom row, and Gus is ~60 px tall (`swot2_425_spin5.png`). Fix: in `mascot.css` (bubble block, line 296) cap the bubble at ~40% of slot width and font-size at a 14 px floor; suppress base-game "Nice one" in portrait.
5. **Session expiry on a spin is generic.** `main.js:142` maps ERR_IS and ERR_ATE to "Something went wrong. Please try again.", so the player retries forever. Fix: send IS/ATE to `fatal()` with the existing `err.session` text and a Reload button.
6. **Fuse is not self-explanatory.** It is a plain rope with a spark. No label, bubble or tooltip appears the first time, and the explanation is only in Rules, Features tab (`rules.js:129`). It appears on about 29% of base spins. Fix: on a player's first three fuse spins, show a small caption ("Fuse burns 1 cell per win; 3+ burned = BOOM, wilds") and have the mascot say it once (`render/fuse.js`, `i18n/en.js`). Persist in localStorage.
7. **No slam-stop and no in-round skip.** Skip exists only on banners. A 12.4x tumble round took 16 s without turbo. SPIN is disabled while playing. Fix: let SPIN, Space or a board tap while playing set a "fast-forward" flag that sets turbo scale to 0.2 for the rest of the round (`main.js` + `renderer.setTurbo`).
8. **Idle GPU cost.** 30 cells run infinite `bob` animations at once (`styles.css:236`). Headless idle frames were median 33 ms with p95 150 ms, versus 16.7 ms with reduced motion. Spin frames were median 50 ms, p95 333 ms. A real GPU will do better, but mobile battery will not. Fix: animate only ~5 random cells, or pause bob while `state-playing`.
9. **Unpolished edges.** The loading overlay lingers ~0.9 s after idle (`styles.css:364`). The Rules panel and replay bar use a flat system-sans look unlike the 60s UI (`swot2_rules.png`). Only `en.js` exists although 16 languages are accepted. Mascot has 5 lines total. The UNLEASH button and Rules tabs have no title or aria-label, and `#game` is `aria-live=off`, so wins are not announced. Fix: use the `--disp` font for the rules heading and tabs, add aria-labels, and announce wins in a `role=status` node.
10. **Dev tooling.** `tools/mock-rgs/server.mjs:55` prefers stale `_sample.jsonl` over the newer `.json`. Fix: regenerate `*.jsonl` from the current books, otherwise QA never sees the fuse.

## Long bonus replay (5000x: 243 s, 106 s with turbo)
Turbo only scales sleeps by 0.42 (`render/index.js:58`), so fixed waits and banners dominate. Proposed fast-forward:
- Add 1x / 3x / skip-to-result in `replay.js`, with a skip button next to PLAY.
- Skip mode applies each free spin's `setTotalWin` and `updateFreeSpin` events without animation. It shows only the free-spin counter, the grid multipliers and the running total. Play the last spin, the cap and the final banner at normal speed.
- Not measured; expected well under the 106 s turbo time.

## Opportunities
- A volume slider and a music-off toggle separate from SFX.
- Ship a minified single bundle (14 module requests become 1).
- Mascot hint system: tap Gus to explain the fuse.

## Threats
- Reviewers and regulators reading "MEGA WIN" on a net loss (weakness 1).
- Low-end Android: 30 infinite animations plus a 56-voice synth. Needs a real-device profile.
- Contrast and touch-target failures are likely accessibility findings.
- Free spins at 22-62 s per bonus with no skip risks abandonment, as does a 243 s replay.

## Top 8 by impact per effort
1. Tier banners by payout / cost in UNLEASH (weakness 1)
2. WIN number contrast (weakness 2)
3. Session-expiry message (weakness 5)
4. Bet -/+ hit area and label floor (weakness 3)
5. Mascot bubble cap on mobile (weakness 4)
6. Slam-stop / fast-forward the round (weakness 7)
7. Fuse first-time caption (weakness 6)
8. Replay skip-to-result (long bonus replay)
