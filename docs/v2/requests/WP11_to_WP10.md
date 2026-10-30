# WP11 (CONTENT-RELEASE) to WP10 (QA): mock RGS and the new fixtures

`fixtures/` now holds small samples of the FINAL v2 books for the four modes (`node tools/build/make_fixtures.mjs`, see `fixtures/PICKS.md` and
`fixtures/SOURCE.json`); the v1 books moved to `fixtures/v1/`. The mock already loads them through `index.json` (`_sample.jsonl` candidate):
`/__mock/state` shows `bookSource: fixtures`, costs `{ base: 1, bonus: 100, entrance_orders: 100, entrance_blackout: 100 }` and 80 / 24 / 32 / 27
books. Every mock category has books in every mode (base: loss, win, bonus, retrigger, maxwin; doors: bonus, retrigger, maxwin) EXCEPT base
`bigwin` (>= 15x without a trigger): the math sample has no such base book. Base wins of at most 0.3x exist for guideline [273].

Two small things in `tools/mock-rgs/server.mjs` (yours):
1. Let a suite pick the v1 folder (WP4's v1 identity suite needs it):
   ```js
   const FIX = path.resolve(process.env.MOCK_FIXTURES || path.resolve(HERE, '../../fixtures'));
   ```
2. The fallback scan is recursive and its regex stops at `_`, so `books_entrance_blackout_sample.jsonl` also registers a phantom mode `entrance`
   and `v1/books_*` could fill a missing mode with v1 books. Suggested:
   ```js
   for (const f of fs.readdirSync(FIX)) {               // not recursive: fixtures/v1 is a separate set
     const m = /^books_([a-z_]+?)(?:_sample)?\.(jsonl(\.zst)?|json)$/i.exec(String(f));
   ```
3. `tests/core` is red by one test until WP1 applies `WP11_to_WP1.md` item 1 (`tests/shell/doors.test.mjs` asserted "no shares data today";
   the FINAL shares are now in `data/rules_data.json`).
