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

## Known
* `node --test tests/core` has 1 failure owned by WP1 (`tests/shell/doors.test.mjs` "today (no shares data)") until WP11_to_WP1 item 1 is applied.

## Next
pack_math.mjs for agent_mambo + SDK sidecar check + math zip; store art sizes; INTERFACES.md updates (WP1/WP2/WP3 requests); tools/art
createMascotV1 (WP3 item 2); VERSION 2.0.0; build + verify:build on 5920/5921; guideline runner.
