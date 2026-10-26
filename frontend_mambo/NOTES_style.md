# NOTES_style (STYLE agent) - 1960s cartoon restyle

Owned/rewritten: `src/render/symbols.js`, `scene.js`, `logo.js`, `fx.js`, `styles.css`, `dev.html` (unchanged), `tests/shots/style_*.png`.
No generative AI: everything is SVG / canvas / CSS drawn in code. No external fonts or hosts (system font stacks with fallbacks; data-URI SVG starbursts only).
All exported names/signatures are unchanged (`ensureSprite, symbolMarkup, SYM_COLOR, SYMBOLS`, `createScene` (+`.redraw/.shakeTargets/.destroy`), `createFx` (shards, sparks, embers, coins, coinRain, smoke, ring, glow, clear, resize, count), `buildLogo`). All ids/classes used by index.html / index.js / main.js / rules.js are kept.

## Look
- Palette (CSS vars on `:root`): paper #F4E8C8, mustard #E8A92B, orange #D9622B, brick #B8352A, teal #2E8C8C, night #1E2F4A, ink #2B1A12, olive #7A8B3A, plum #6A3D6E.
- Symbols: flat fills drawn 2.8/2.2 px (at 100 px) off their 3.6 px #2B1A12 outline (screen-print misregistration), halftone dots on shade faces, one white highlight stroke each. H1 ruby = shield cut, H2 sapphire = hexagon, H3 emerald = step-cut octagon, H4 topaz = drop, L1 amethyst cluster, L2 pickaxe, L3 teal lantern, L4 orange hard hat, W gold nugget with a hand-drawn "W" (path, no font), S dynamite with lit fuse. Readable at 40 px (checked in the preview strip).
- Idle (limited animation, `steps()`): `.twk` gem twinkle star (staggered by `--c/--r`), `.fl1/.fl2` lantern flame flip, `.spk` fuse spark star + `.puff` smoke dots, `.wink` nugget sparkle blinks, cell `bob` squash steps. Win: `.cell.win .sym-svg` squash & stretch pop. Losing symbols: fx `shards()` now emits cartoon dust puffs + stars (called by index.js on tumble), `.dim` = desaturated.
- Scene (`scene.js`): 3 parallax flat layers (far rocks, mid rocks + crystals + atomic sparkles, foreground side masses/stalactites/rubble), flat wooden beams with drawn grain, flat lantern glow, canvas twinkles at ~7 fps, hot-mode embers as flat diamonds. No gradients-as-light, fog, shafts or vignette. Layers read their colours from `--sc-*` CSS vars; `body.fs-mode` swaps them (orange/brick/plum) and the scene repaints once via a MutationObserver. The old `.shafts/.fog/.warm/.heat/.vig/.fstint/.glint` elements no longer exist.
- Logo: SVG starburst + double outline (dark + cream) + offset shadow; `textLength` pins word widths so UNLEASHED / MINE never merge (stacked layout on landscape, one row with clear gaps on portrait; verified at 425x812).
- UI: stats = comic caption boxes with offset shadow; tool buttons = chunky outlined rounded squares (mustard/teal/orange); spin = round dial with tick ring and brick cap, steps rotation; unleash = orange outlined button; modals = cream cards with brick ribbon titles. Win popups `.pop` / `.pop.big` and banners `.banner` use data-URI comic starbursts (`--burst-*`, `--pop-*` vars). Banner tiers set `--burst/--amt` via `data-tier`.
- fx particles: puffs, 4-point stars, flat coins (stepped spin), diamonds, spiky comic rings/bursts. MAX 240 live particles, per-call counts capped (coins 14, rain 24, puffs 5), 12 fps stepped progress.

## Mascot hooks (WIRING creates `<div id="mascot-slot">` inside `#app`)
- CSS is conditional on `#app:has(#mascot-slot)`: desktop/landscape = new grid row `mascot` in the left column under logo + stats (side width 33vh clamp 72..236 px = about 18% of 1024); `#hud-ctrl` then spans 3 rows.
- Portrait (`max-aspect-ratio:11/10`) REVISED: no extra row. Slot overlays the bottom-left of the game area (height clamp 64..100px), the board is top-aligned at ~96% of the width, the bubble goes to Gus's right (mascot.css). Lanterns shrunk and logo padded so they never touch.
- `max-height:360px` landscape (400x225): same left-column row, small (about 70x90 px).
- Slot styling: `position:relative; z-index:4; pointer-events:none; container-type:size` so the mascot can size with `cqw/cqh`.

## Text keys requested for the lead (not added; i18n untouched)
Onomatopoeia bubbles exist as CSS only: `.sfx` (+ `.teal/.brick/.mustard`). WIRING may show them if keys are added (English only, no restricted words): `fx.kaching` "KA-CHING!", `fx.pow` "POW!", `fx.boom` "BOOM!", `fx.wow` "WOW!". Current visible win text still comes from existing keys (`win.big/mega/super/epic/max`, `fs.*`).

## Known / for others
- MASCOT speech bubble ("NICE ONE!") overflows the left edge of the screen at 800x450 and 400x225 (mascot.css, not mine).
- `index.html` still has inline red/gold gem colours in the loading screen and favicon; CSS overrides the loader gem fill/stroke.
- `index.js` still toggles `.sweep` and sets inline `stroke:#ffe27a` on outline paths (CSS overrides with `!important`); `.sw` is hidden.

## Review round 2
- Bubbles: fixed a selector clash (`.pop` styled the speech bubble); bubbles now clamp inside the left column (desktop), sit right of Gus (portrait) or over his body (400x225); never over BALANCE/BET/WIN, grid or buttons. Gus is sized to the column (`--gh` in `#mascot-slot`; index.html's base `max-height:28%` is overridden).
- Non-winning symbols: `.dim/.adim` = opacity .7, no desaturation.
- Currency: real page shows `$1,000.00 / $1.00 / $0.00` (verified with the URL from the brief). dev.html shows bare numbers because it sets text directly; not a bug.
- KA-CHING!/POW!/WOW!/BOOM!: fx.js watches `.banner-layer` and shows `.sfx-pop` (keys fx.kaching, fx.pow, fx.wow, fx.boom via t(), verified present in en.js). big=KA-CHING, mega=POW, super=WOW, epic/max and free-spin trigger=BOOM.
