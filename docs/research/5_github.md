# 5 - GitHub research: ideas for The Unleashed Mine

Method: public pages only (WebFetch/WebSearch). Commit dates were often not shown by the fetch tool; "unverified" marks that. Dates seen: issue #121 Oct 1 2026, so the official repo is active. Nothing below is legal/patent advice. Licence rule: MIT = code reusable with notice; AGPL/none/unknown = IDEAS ONLY.

## 1. Official Engine repos

- https://github.com/engineio/math-sdk (also StakeEngine/math-sdk). Python 3.12+, Rust/Cargo for optimizer. MIT. 124 stars, 229 forks, 314 commits, 5 open issues. Docs: engineio.github.io/math-sdk. Folders: docs, games, optimization_program, src, tests, uploads, utils. Example games: 0_0_cluster, 0_0_expwilds, 0_0_lines, 0_0_lines_feature_match, 0_0_scatter, 0_0_ways, fifty_fifty, template. Matters: 0_0_cluster is our base; 0_0_expwilds shows special-symbol state; template is the scaffold.
- https://github.com/engineio/web-sdk (StakeEngine/web-sdk). Svelte 5, PixiJS 8, TurboRepo/pnpm, xstate (bet state machine), Storybook, Node 22.16 / pnpm 10.5. 126 stars, 221 forks, 104 commits. Licence not shown on page (check LICENSE before copying; treat as unclear). Apps: cluster, lines, price, scatter, ways. Concepts: bookEvents, event emitters, "task breakdown", Svelte contexts. Matters: the intended front-end shape is "play books of events through an emitter -> animation tasks". Our tumble/cluster client should start from apps/cluster.
- Issues (titles only, fetched): #121 payoutMultiplier precision vs validator "increments of 10" (Oct 2026); #120 example games import missing ConstructFenceBias; #119 whether post-approval "minor updates for visual issues" may add cosmetic content (review policy ambiguity); #99 format_books_json.py breaks JSONL; #86 Optimization SDK. Lesson: payout values must be on the validator's integer grid (round all event/win amounts; keep book payout = lookup-table payout), books must be strict JSONL, and plan that post-approval changes are restricted. Discussions page was not fetchable.
- Third-party summary of approval rules (https://github.com/ReSkin-Games/stake-engine-skills, stake-math-sdk/SKILL.md; unofficial, verify against stake-engine.com/docs): RTP 90-98% per betmode; spread across betmodes <= 0.5%; max win obtainable, typically >= 1 in 10M frequency; BASE hit rate >= 1 in 20; 100k-1M sims; stateless; required outputs books_<mode>.jsonl, lookUpTable_<mode>.csv, lookUpTableIdToCriteria_<mode>.csv, config index.json, config_<mode>.json. Review-failure gotchas listed there: compute RTP from the lookup table, not config labels; keep max-win injection synced in books AND lookup table; snapshot/diff books before refactors; audit hardcoded UI labels (mode names, RTP, limits, max win) separately; non-Python simulators work but support references the Python SDK. Licence of that repo not checked (ideas only).
- Optimizer settings: official optimizer doc pages were 404 via fetch, so I could NOT verify recommended parameters. Action: read docs/math_docs/optimization_docs in the cloned SDK directly.

## 2. Community Stake Engine games

All tiny, all unlicensed or unverified. Quality signal: none are shipped-approved evidence.
- https://github.com/NikhilSiwach8/Slot - "Dumpster Duke": 6x5 pay-anywhere tumble, bottle-cap multipliers, free spins "Midnight Raid". math/dumpster_duke + Svelte/Pixi client forked from web-sdk scatter app, GDD in docs/GDD.md, AI-generated art pipeline with slicing/packing/bitmap font tools, math-to-client sync scripts, ~45 min check pipeline, reel feel config (speed, bounce, turbo). 0 stars, 55 commits, no licence. Closest to our format (6x5 tumble); ideas only.
- https://github.com/DavidCheng1/Stake - "Loan Shark" 7x7 cluster prototype in web-sdk/apps/cluster; Storybook runs without RGS using recorded sample books; spin button locked until the whole event sequence and animation end; wager deducted at start, payout credited once at end. 0 stars, 6 commits, no licence. Idea: develop the front end offline from recorded books.
- https://github.com/groverstech/stakegame - 3x5, React/Express + Python math + Pixi, "compatible" with Stake Engine (unverified, no details).
- https://github.com/Grantley/stake-web-sdk - fork of web-sdk. https://github.com/ReSkin-Games/stake-engine-skills - agent skills for bootstrapping SDK and approval checklists.
Takeaway: public evidence of what gets approved is essentially absent; use the numeric criteria above plus the SDK validator rather than copying community games.

## 3. Math / simulation tools

- https://github.com/slotopol/server - Go, MIT, 232 stars, 571 commits, updated Oct 2026. Reel scanner brute-forces RTP, reports volatility index VI[95%], std dev, convergence index CI[95%], suggested bankroll, RTP spread across spin counts, cascade metrics, per-symbol payout contribution; 353 games; supports reel sets at several RTPs; YAML custom reels. Best methods source: borrow VI/CI definitions and per-symbol contribution tables (re-implement; MIT permits code with notice).
- https://github.com/juritox/slot-machine - MIT, educational, configurable RTP; low value.
- Clockwork Labs RTP Analyzer (itch.io, $999) - commercial; only shows what a PAR-like report contains: RTP, hit rates, payout distribution, volatility. Not open source.
- No mature open-source PAR-sheet generator was found. Build our own PAR report from lookup table: RTP split by base/tumble/feature/UNLEASH, hit freq, win-size histogram, max-win frequency, CI on RTP, bust/session sims.
- Hugging Face dataset slot.report/slot-database (CC-BY-4.0, not GitHub): RTP, volatility, max win, grid, mechanics per slot. Useful for benchmarking market.

## 4. Front-end implementations

- https://github.com/schmooky/pixi-reels - MIT (per README), 38 stars, 216 commits, v2.2 recent. PixiJS 8 reel engine: cascades/tumble builder, win presenter/spotlight, speed profiles incl. TURBO, anticipation (slow selected reels), pins, big symbols, ~130 browser recipes, 6x5 cascade-tumble recipe. Great reference for tumble staging; dependency is optional (web-sdk is the supported path).
- https://github.com/johakr/html5-slot-machine - 633 stars, Web Animations API, plain JS (licence unverified). https://github.com/Danziger/slotjs - 374 stars, mobile-first CSS-variable layout (unverified licence). Mobile layout ideas only.
- https://github.com/almond-bongbong/react-slot-counter - 175 stars, animated number counter; count-up/rolling digit ideas (licence unverified).
- https://github.com/michaelkolesidis/cherry-charm - Three.js/React 3D slot, AGPL-3.0, no audio, weak mobile: ideas only; shows a 3D approach is costly.
- https://github.com/CadanoX/Godot-Slot-Machine - Godot, 67 stars, last Apr 2024; low value (Engine front end is web).
- Audio synthesis: nothing authoritative found on GitHub; use WebAudio oscillators/noise envelopes (Tone.js is MIT) for 1960s cartoon boings, whistles, xylophone stings - unverified, my suggestion.

## 5. Slot math design repos/blogs
Searches returned mostly commercial/affiliate pages; no strong GitHub blog on volatility shaping or bonus-buy pricing. Practitioner job ads stress seeded reproducible runs, versioned configs, analytic cross-checks against simulation on simplified known-answer configs. Cluster-pays multiplier ladders (x2 doubling to x128 / x1024) appear only in low-reliability blog posts. Use the Engine SDK's own docs for distribution/bonus-buy (fixed-entry mode) guidance.

## 6. Mechanic catalogs / prior art
- No GitHub slot-mechanic taxonomy found. Related: Game Mechanic Database (itch.io/katnamag, MIT, generic), a board-game mechanics OWL ontology, Liquid & Grit and Gameopedia taxonomies (commercial). slot.report dataset is the closest slot catalog. No patent/prior-art repos found; no conclusions drawn. Recommend counsel review of tumble/cluster/multiplier/Fuse-style features independent of this research.

## 7. Prioritised ideas (12)

1. Compute RTP from the lookup table only; one script asserts config RTP == table RTP, books payout == table payout, max win present in both. (Easy; top review risk.)
2. Quantise every payout to the validator grid (see issue #121); test in CI. (Easy.)
3. Hit-rate guard: base-mode hit rate comfortably > 1/20 (target ~25-30%) given tumbles; fail build below. (Easy.)
4. Keep UNLEASH 100x and base within 0.5% RTP of each other (e.g. all ~96.0%); optimizer targets per mode. (Medium; needs bonus-mode distribution tuning.)
5. Max win 5000x: ensure obtainable, injected in books and table, frequency inside validator threshold; add dedicated criteria bucket. (Medium.)
6. Build a PAR-style report tool (RTP by component, win histogram, VI/CI, per-symbol contribution) modelled on slotopol methods; MIT allows porting ideas/code with notice. (Medium.)
7. Session simulator: 1k/10k-spin bankroll curves, bust and big-win odds, for volatility tuning and responsible-gaming messaging. (Medium.)
8. Front end: develop in Storybook against recorded books (Loan Shark pattern); lock spin until the event queue and settlement complete; credit payout once. (Easy.)
9. Tumble staging: win spotlight between stages, drop stagger with squash bounce, per-stage count-up, skip/turbo that compresses (not removes) event playback, per pixi-reels recipes (ideas; MIT if code used). (Medium.)
10. Anticipation for scatter/Fuse Line triggers via slowing the last drops plus audio riser; Old Gus reaction states tied to book events. (Medium.)
11. Mobile-first layout using CSS variables / safe-area handling (slotjs ideas only); test portrait 360px and landscape. (Easy.)
12. Review-readiness: snapshot-diff books before any refactor, audit UI hardcodes (labels, RTP, limits, max win), strict JSONL formatter test (issue #99), and avoid reliance on post-approval cosmetic edits (issue #119). (Easy.)

Caveats: web-sdk licence unseen; commit dates mostly unseen; optimizer parameters unverified; approval numbers are from an unofficial summary.
