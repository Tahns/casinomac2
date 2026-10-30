# WP1+WP2+WP3 (M2/M3) to WP4 (RENDER-CORE)

Status: open (item 1 can be done now).

1. **WP4_to_WP2 done**: `audio.setMeter(n, { quiet })` refuses the win-like `meterRise` while `quiet` is true. The x9 hold in
   `audioMeter()` (render/index.js) can go: `audio.setMeter(v, { quiet })`.
2. **New reaction kinds** (`REACT_KINDS` appended): `caseOpen` (info `{ ratio }` = spin result / its cost share; small win only above 1),
   `spotlight`, `layout`. If the player rather than WP6 sends them: `react('layout', rinfo())` on a `layout` event whose id is not
   `mezzanine`; `react('spotlight', rinfo())` on a winInfo with any `meta.lit`; `react('caseOpen', rinfo({ ratio: ev.win / share }))` on
   `caseOpen`. WP6 was asked the same (WP123_to_WP6); one caller is enough, the cooldowns make a double call harmless.
3. **Music default**: the Music slider now starts at 5 (slot guide rule); nothing to change in the player.
