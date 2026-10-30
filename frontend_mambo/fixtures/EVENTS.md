# Agent Mambo v2: event schema of the fixture books

The books in this folder are samples of the FINAL v2 published books (see `PICKS.md`, `SOURCE.json`). The full event contract, with examples
copied from these books, is `../CONTRACT.md` section 3. The v1 schema (still valid for every unchanged event, and for the `bonus` books, which
are the v1 books) is `v1/EVENTS.md`.

v2 additions in one list (details and examples in `../CONTRACT.md`):
* `layout` (base books only, index 0): floor plan `id`, `rows`, geometric `cells[r]`, `cellCount`. Absent = Mezzanine. Free spins are Mezzanine.
* `reveal.board[r]` has `len(cells[r]) + 2` symbols on a base spin.
* `missionAssigned` (after `freeSpinTrigger`, before the first `updateGlobalMult`): `mission` briefing | orders | blackout, `dialStart`, `dialStep`,
  `dialCap`, `payTiming` step | spinEnd, `lens` (blackout), `layout`, `fuseLen`. Absent in `bonus` books (= Briefing, step 8).
* Sealed Orders: `winInfo.wins[].meta.banked` (x1, never added to WIN), `updateTumbleWin` = running bank, `caseOpen {bank, mult, win, capped}` then
  `setWin` (or `wincap` when capped).
* Ballroom Blackout: `lightRoute {w, h, lensMult, route[]}` right after every free-spin `reveal`; `winInfo.wins[].meta.lit` / `lensMult`.
