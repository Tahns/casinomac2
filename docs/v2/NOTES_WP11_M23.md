# WP11 CONTENT-RELEASE, milestones 2 and 3: running log (resume from here)

Ports 5920-5929 (5920 static for verify_build, 5921 mock for verify_build, 5922 scratch mock, 5923-5925 guideline runner, 5926 key art).
Scratch scripts: /tmp/claude-0/scratch/wp11/.

## Done
1. **Fixtures** (`tools/build/make_fixtures.mjs`, new): `fixtures/` = small samples of the FINAL books from
   `math/games/agent_mambo/library/fixtures_out` (the math's own pick): index.json (4 modes, cost 1/100/100/100, identical to the published
   index.json, checked), books_<mode>_sample.jsonl (base 80 with all 4 plans and all 3 missions, bonus 24, orders 32, blackout 27; <= 3 ids per
   PICKS category + top-up so every mock-RGS category exists + 2 base wins <= 0.3x for guideline [273]), the published lookup rows of exactly
   those books (payout checked against the book), PICKS.md, SOURCE.json (sha256). v1 books moved (git mv) to `fixtures/v1/` with their
   PICKS/index/EVENTS. Mock RGS checked on 5922: bookSource fixtures, 4 modes, costs right.
2. **rules data** (`tools/gen_rules_data.mjs` rewritten for v2, `--check` mode): modes from publish_files/index.json + RTP / max recomputed
   from the lookup tables with BigInt (all 96.0000 %, 5000x, cross-checked against shares.json), door facts `shares` (median 65.6 / 66.8 /
   66.2, P(R > price) 0.31 each), `layouts` (cells from the real layout events, shares 50.2 / 21.4 / 13.8 / 14.6 %), `missions` (dial
   steps / lens from real missionAssigned events, shares 40 / 30 / 30 %), `base` (hit 23.32 %, P(R > stake) 12.52 %; cross-checked with analysis_v2.json).
3. **rules.js**: Clearance Dial (WP5 request), floor plans table with final shares + "cannot be chosen, RTP includes every plan" (no odds
   claim), missions table + plain-words rules per mission, door table (median, rounds above the cost) with an honest explanation, no "better"
   wording, SECRET ENTRANCE door picker in the controls, SETTINGS bullet merged with WP1's text (WP10's [235] lines kept), [185] verbatim
   (unchanged constant), social pass via socialize + text tests. Rules screen adopts `src/ui/tabs.js` (WP1 item 4). Section ids unchanged.
4. **CONTRACT.md** rewritten for v2 (every new event with examples copied from real FINAL fixture books, ids given); fixtures/EVENTS.md points to it.
5. Requests written: WP11_to_WP1 (doors.test "today no shares" now fails, exact replacement; drop info.controls.settings; tabs; version),
   WP11_to_WP4 (browser.mjs v1 suite -> fixtures/v1), WP11_to_WP10 (mock MOCK_FIXTURES, non-recursive scan).

6. **pack_math.mjs** retargeted to `math/games/agent_mambo` (was the mining game), output in `frontend_mambo/dist/math_upload/` +
   `dist/agent_mambo_math_v2.0.0.zip` (9 files: index.json + 4 books + 4 tables, books stored / text deflated, deterministic, read back and
   hash-checked). New `tools/build/sdk_verify.py` runs the SDK's own `verify_lookup_format` + the `books_<mode>.verification.json` sidecars
   (books sha256, payout hash, entries) with `python -B` and writes nothing (the SDK's execute_all_tests would rewrite library/stats_summary.json,
   so it is not called). Last run: 0 FAIL 0 WARN, all modes 96.0000 %, max 5000x, config.json hashes match, first 5000 books per mode match the CSV.
7. **Store art**: `tools/art/render_keyart.mjs` (port 5926) renders keyart.html (inspectrice, sober) to `tools/art/store_v2/`: tile 3:4
   1536x2048, cover 16:9 1920x1080, banner 2000x667, previews 150/300/320 px, STORE_RENDER.json; deterministic. Looked at: OK. `docs/v2/STORE.md`.
   `tools/art/bake_mambo.mjs` uses `createMascotV1` (WP3 item 2).
8. VERSION 2.0.0; INTERFACES.md sections 2 (WP2), 3 (WP3), 8 (WP1), 9 updated.
9. Rules screen looked at in the real game at 1280x720, 1024x576, 425x812, 400x225 (normal + social): tabs wrapped and never clipped
   (flex 0 0 auto, they were squeezed before), no horizontal scroll, ArrowRight moves the tab focus.
10. `npm run build` and `PORT=5920 MOCK_PORT=5921 npm run verify:build` green (desktop + mobile, 0 errors, 0 404).

## Known
* `node --test tests/core` has 1 failure owned by WP1 (`tests/shell/doors.test.mjs` "today (no shares data)") until WP11_to_WP1 item 1 is applied.

## Next
pack_math.mjs for agent_mambo + SDK sidecar check + math zip; store art sizes; INTERFACES.md updates (WP1/WP2/WP3 requests); tools/art
createMascotV1 (WP3 item 2); VERSION 2.0.0; build + verify:build on 5920/5921; guideline runner.

## Guideline runner (ports 5925/5927, report in /tmp/claude-0/scratch/wp11/REPORT_guidelines.md, WP10's REPORT.md untouched)
38 PASS / 8 FAIL / 1 AT RISK. `[172]` (replay of an unknown event id = mock list[0], which was a long book) fixed: make_fixtures puts the
shortest book first in each mode (rerun 172/173/188: PASS). The other 7 (`[31]`, `[UNL-MIN-*]`, `[WIN-bonus-*]`) come from the three doors now
being offered (nothing pre-selected by design, CONFIRM disabled until a door is chosen): runner fix in WP11_to_WP10 item 4, verified on a
scratch copy (`[31]`, `[WIN-bonus-bonus]` PASS). With `shares` stripped from the data they PASS unchanged, so the data is right.

## Review fix (BUILD-RED)
- WP1 shipped assets/fonts/LICENSE-LuckiestGuy-Apache-2.0.txt quoting apache.org URLs; build_front.mjs flagged them. HOST_ALLOW_FILES now exempts /^assets\/fonts\/LICENSE-[^:/]+\.txt:\d+$/ (licence texts ship verbatim, never fetched).
- npm run build rc=0, 0 problems; verify:build (5921/5922) green; core+text 115/115, heroine+render 88/88.
