# NOTES_fuse (FUSE-FRONT agent)
Files: `src/render/fuse.js`, `src/render/fuse.css` (linked at runtime by fuse.js), event block "FUSE LINE" + 4 `case`s in `src/render/index.js`, fuse books in `src/render/devbooks.js`, test page `fuse-dev.html` (`?book=fuseBlast&turbo=1` autoruns).

## Event schema as implemented (docs/ORIGINAL_FEATURES.md)
- `fusePath {cells:[{reel,row}], burned}`: draws the rope (8 cells), match at the start cell, spark at cell index `burned-1`, burnt cells below `burned`.
- `fuseBurn {burned, newCells}`: spark crawls from the old head to `burned-1` (burnt rope turns charcoal, smoke wisps). If `burned` is missing it uses `burned + newCells.length`.
- `fuseBlast {cells:[{reel,row,replaced}]}`: Gus `shock`, sizzle pause, starburst + `t('fx.boom')`, shake, flash, then each listed cell flashes, swaps to `W` and pops (squash/stretch), rope fades. Next `winInfo`/`tumbleBoard` play as usual.
- `fuseFizzle {burned}`: limp smoke puffs, spark dies, rope fades, Gus `shrug`.
- Row convention: visible rows 0..4. If any row is >= 5 the event is taken as padded (1..5) and shifted by -1 (`normCells`). Math agent: confirm.
- State is cleared on the next `reveal` and at the end of `playBook`. Books without fuse events: no change.

## Behaviour
Audio: `audio.play('fuse')` at path, each burn step, and at the blast sizzle; `explosion` on blast. Turbo: no travel, short pauses. Reduced motion: no travel/spin/shake/flash, static scorch tiles, BOOM fades only. Caps: <=14 SVG smoke puffs, <=6 cells with fx particles. Gus calls are feature-detected through the renderer `pose`.
Cells are swapped in `S.grid` (name `W`), so later tumbles drop them like any wild.

## Assumptions / todo
- Burnt cells = path index < `burned` (spark at `burned-1`). Cells with `replaced:'S'` are not expected in the blast list (the rope just skips them).
- No rules text yet (TEXT agent), no "KA-BLOOM" (uses existing `fx.boom`).
- Dev books: fuseBlast, fuseBlastDry (no pay after), fuseBlastAdv2, fuseFizzle, fuseFizzleNoWin, fuseFree (free spin, veins).
