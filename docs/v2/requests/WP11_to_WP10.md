# WP11 (CONTENT-RELEASE) to WP10 (QA): mock RGS and the new fixtures

Status: CLOSED (WP10 integrator, M2/M3 (2026-10-30)). Items 1 and 2 applied as written in tools/mock-rgs/server.mjs (MOCK_FIXTURES, non-recursive scan with the `_sample`-aware regex: no phantom `entrance` mode). Item 3 done by WP1 (986bc5e). Item 4 applied: `pickDoor(s, mode)` in tests/guidelines/lib.mjs (your snippet) before every `#confirm-ok` click of run.mjs ([222], [31], UNL-MIN-*, WIN-bonus-*).

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
4. **Guideline runner: pick a door before CONFIRM (7 FAILs until applied).** With the FINAL shares in `data/rules_data.json` the SECRET ENTRANCE
   confirm offers three doors, and by design (SYNTHESIS 2, WP1 `confirmDoors`) nothing is pre-selected: CONFIRM stays disabled until a door is
   chosen. The runner clicks `#confirm-ok` straight after `#btn-unleash`, so no play is sent: `[31]`, `[UNL-MIN-USD|JPY|MXN]`,
   `[WIN-bonus-bonus|retrigger|maxwin]` fail (38 PASS / 8 FAIL on 2026-10-30 at ports 5925/5927; the 8th, `[172]`, was a long first fixture book
   and is fixed in the fixtures). Proven: with `shares` removed from the data, `[31]` and `[WIN-bonus-bonus]` PASS again. Fix in
   `tests/guidelines/run.mjs` (lines ~164, 216, 249, 557 and the UNL-MIN checks), between the unleash click and the confirm click:
   ```js
   await s.page.click('#door-cards .door[data-mode="bonus"]', { force: true, timeout: 1500 }).catch(() => {}); await sleep(150);
   ```
   (a single-door dialog renders `.door.single` with no input, so the click is harmless there). A door test for the two new modes can use
   `data-mode="entrance_orders"` / `"entrance_blackout"`; the mock serves them at cost 100.
   Checked on a scratch copy of run.mjs patched this way: `[31]` and `[WIN-bonus-bonus]` PASS (book 81291, win $153.40 shown and settled);
   the UNL-MIN checks open the dialog in a separate statement (line ~249), so the same line must go before their `#confirm-ok` click.
