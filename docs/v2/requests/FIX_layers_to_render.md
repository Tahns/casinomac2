# FIX layers -> render (round 1)

From the layers fixer (area `layers`, files src/render/layers/**, src/i18n/en_layers.js, tests/layers/**).

## 1. H4-F11 KEPT pill contrast and left inset of the dial badge (src/render/meter.css, not layers-owned)

The "KEPT" pill and the dial badge are drawn by the Clearance Dial (src/render/meter.js + meter.css), not by a layer.
`meter.css:20` draws the pill as cream text on lilac (`background:var(--lilac);color:var(--cream)`), low contrast at 9 px, and in the
portrait strip layout the badge touches the left screen edge. Snippet:

```css
/* meter.css:20 - ink on lemon (contrast ~ 13:1) instead of cream on lilac */
.mm-kept{position:absolute;left:50%;bottom:-7px;transform:translateX(-50%) rotate(-4deg);padding:1px 6px;background:var(--lemon);color:var(--ink);
  border:2px solid var(--ink);border-radius:999px;font:900 9px/1.1 "Futura","Century Gothic","Arial Black",sans-serif;letter-spacing:.08em;opacity:0;white-space:nowrap}
/* meter.css:51 portrait strip layout: keep the badge (and its KEPT pill) at least --gap from the left screen edge */
.mm[data-layout="strip"] .mm-badge{margin-top:-4px;margin-left:var(--gap,8px)}
```

The "+8" step chip (`.mm-chip`, positioned by meter.js next to the badge) then moves right with it, off the logo at 425x812.

## 2. K6 MISSION START banner at 425x812 and 400x225

The banner is drawn by render (`src/render/index.js` meter start burst / `fx.js` word with `opts.maxW`), already centred and clamped to
the board by render's H2-16 fix (commit d5aebc7). Nothing in layers draws it. The other half of K6 (the plan label covering a cell) is
fixed in layers: the blueprint name stamp now sits on a void cell of the plan (Atrium, Lobby) or on the frame's lower lip under the cell
area (Mezzanine, Annex), checked by tests/layers/browser.mjs section A ("A K6 ...").

## 3. Note for render: the layers now use the money format and sit under the win pops

- K3: the Sealed Orders plate / reveal use `ctx.fmt` (the HUD format: "$5.00", "¥250", "2.50 SC"). Keep `layerCtx.fmt` as is.
- H2-05: `.l-dark` is now `z-index:3` and `.l-x4` `z-index:4` inside `.board`, below `.outlines` (4, earlier in the DOM) and
  `.popups` (currently 6). Please keep `.popups` above 4.
- FIX_render_to_layers items 1 and 2 are in: `layers/index.js` exports `entrance(ctx, mission)` (door + keyhole iris, deadline-based,
  gone by about 1.0 s even at 6x CPU throttling), and `freeSpinEnd` no longer clears `<html data-mission>` (L.reset does).
