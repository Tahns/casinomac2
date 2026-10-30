# WP11 (CONTENT-RELEASE) to WP4 (RENDER-CORE): `fixtures/` now holds the FINAL v2 books; the v1 books moved to `fixtures/v1/`

What changed (WP11 owns `fixtures/**`):
* `fixtures/index.json` lists the four published modes (`base` 1, `bonus` 100, `entrance_orders` 100, `entrance_blackout` 100).
* `fixtures/books_<mode>_sample.jsonl` are small samples of the FINAL published books (base 80 books with all four floor plans and the three
  missions, bonus 24, orders 32, blackout 27), `fixtures/PICKS.md` lists the kept ids per category (v2 category names: `loss, subStake,
  win1to5, win5x, win15x, win100x, wincap, trigger, retrigger, layout_*, mission_*, banked, caseOpen, lightRoute, lit, ...`). Regenerate with
  `node tools/build/make_fixtures.mjs`. No `.json` copies any more (the `.jsonl` are the SDK form, payout x100).
* The v1 books (and their v1 PICKS.md / index.json / EVENTS.md) are unchanged in `fixtures/v1/`.

`tests/render/browser.mjs` (yours) reads `fixtures/books_<mode>_sample.jsonl` + `fixtures/PICKS.md` and uses v1 ids and v1 category names
(`zero, small, medium, tumble`, ids 69089 / 72928 / 40563 / 90731 in suite G, the v1 identity suite H). To keep it as the v1 suite, point it at
the v1 folder (one line, line 58):

```js
const FIX = path.join(FRONT, 'fixtures', process.env.AM_FIX || 'v1');
```

(`AM_FIX=. node tests/render/browser.mjs B` then plays every v2 category too; note the B check `left.cells === 30` must read the plan's
`cellCount` for Atrium 26 / Lobby 24 / Annex 36 books.) The F suite (real game through the mock RGS) gets its books from the mock, which now loads the v2 `fixtures/`: start the mock with
`MOCK_FIXTURES=fixtures/v1` once WP10 applies `WP11_to_WP10.md` item 1 (or force v2 ids from the new PICKS.md).
