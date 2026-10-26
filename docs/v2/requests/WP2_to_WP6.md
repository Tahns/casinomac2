# WP2 (AUDIO) to WP5 (FX-WIRE) and WP6 (LAYERS): cue ids that now exist

All ids below are neutral (`winLike: false`, so they are allowed on the quiet path); call them through `audio.play(id, opt)`, from `ctx.audio` where the module gets it injected (wire.js, fuse.js, meter.js already do that). Every call is a no-op while muted or while Effects/Master is 0.

| Id | Use | Options | Length |
|---|---|---|---|
| `layoutDraw` | blueprint draw-on (WP6) | `{ dur }` seconds, 0.15-0.5 (default 0.45), stroke rate about 12/s | about `dur` + 0.02 |
| `stamp` | name stamp, SEALED/OPENED/FILED/DECLASSIFIED/mission stamp | `{ vol, pitch }` (defaults reproduce v1) | 0.14 s |
| `caseSeal` | Sealed Orders: filing chip and SEALED stamp | none | 0.27 s |
| `caseOpen` | Sealed Orders: flap and OPENED (no chime; play the win sound separately and only if R > C) | none | 0.26 s |
| `lightsOut` | Ballroom Blackout dim | none | 0.45 s |
| `spotlightStep` | one window step (250 ms) | `{ i }` step index (only its parity is used: two pitches, never a rising scale) | 0.14 s |
| `doorCreak` | Secret Entrance door and keyhole iris (Rule P: <= 1.2 s) | `{ dur }` 0.3-1.1 (default 0.9) | about `dur` + 0.04 |
| `dialStep` | Clearance Dial "+N" chip (WP5 meter.js) | `{ n }` clicks 1-4 | 0.04-0.2 s |
| `ledgerTick` | quiet result | none | 0.03 s |

`dialStep` is not tonal on purpose (the v1 `mult` vibraphone ting is win-like; if the dial is used on a round that can be quiet, prefer `dialStep`). Band stamp: `stamp` with `pitch` 0.8-1.2.

Durations scale with turbo only where Rule P allows it; the cue lengths above are the real lengths, so pass the `dur` you actually draw.
