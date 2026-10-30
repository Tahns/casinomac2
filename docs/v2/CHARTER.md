# Agent Mambo v2: visual charter (style rules for every screen, symbol, layer and the heroine)

Owner WP1 (shell) with WP3 (heroine). Binding sources: `docs/research2/00_USER_DIRECTIVES.md` (retro 1960s rubber-hose cartoon, heroine
LEFT of the grid, glamour never sexual, Engine [217]), `docs/research2/SYNTHESIS.md`. All art is drawn in code (SVG, CSS, canvas); no
generative AI, no bitmap images in the game (checked by `tests/heroine/visual.mjs` R1/R2; the only data URIs are inline SVG).

## 1. Palette (closed: nothing outside these tokens without a charter change)

Game UI (`frontend_mambo/styles.css`, `:root`):

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#14102B` | every outline, hard shadows, text on light plates |
| `--indigo` | `#2B2A6B` | frame (base game) |
| `--bg` / `--sc-bg` | `#181640` | page and night sky |
| `--board` | `#1D1B4F` | board well |
| `--tile` | `#E4DDF2` | symbol tiles |
| `--cream` | `#FBF1D9` | plates, panels, cream text on fills |
| `--lemon` | `#FFD23F` | accent, SECRET ENTRANCE, "in the black" chip, the moon window |
| `--coral` | `#F0472F` | win amounts, hot edge, neon |
| `--coral-dk` | `#C2321E` | coral text on cream (>= 4.5:1) |
| `--teal` | `#1FB5A3` | buttons, pipes |
| `--teal-dk` | `#0B6B61` | teal text on cream |
| `--flamingo` | `#F5799F` | turbo button, tertiary |
| `--steel` | `#6FA7D9` | autoplay button, secondary |
| `--lilac` | `#9A7BD0` | decor |
| `--lime` | `#A5D63B` | decor |
| `--brass` | `#E8A92B` | dial, rivets |
| `--aubergine` | `#3B1F52` | free-spins frame (the lair) |
| `--orange` | `#F08A2B` | decor |
| `--ink-dim` | `#4A4470` | secondary text on cream |

Mission palettes are swapped under the wipe by `scene.js` (WP5): lair (free spins, `body.fs-mode`: `#0B4A47 #12665F #1FB5A3 #0A2F36`),
hat-check and ballroom (WP6_to_WP5). Flash colours: cream and lemon only (`flash.js`), red counts as saturated.

Heroine (`docs/research2/art/mambo_art.mjs` `PAL`, a warmer print family so she reads as a printed character over the cool board):
ink `#2B1A12`, cream `#F4E8C8`, mustard `#E8A92B`, orange `#D9622B`, brick `#B8352A`, turquoise `#2E8C8C`, navy `#1E2F4A`, plum `#6A3D6E`,
gloves and shoes white `#FFFBF0`, lips `#C4271E`, hair `#4A2216`. Costumes: inspectrice (navy, base, tile and cover), lab (cream coat,
teal), trench (camel), casino (brick gown, gold collar), vault (reserved).

## 2. Fonts (at most 2 embedded; we ship 1)

| Use | Family | File | Licence |
|---|---|---|---|
| Display: titles, buttons, tabs, banners, stamps (`--disp`) | Luckiest Guy | `frontend_mambo/assets/fonts/LuckiestGuy-Regular.ttf` | Apache-2.0, `LICENSE-LuckiestGuy-Apache-2.0.txt` next to it |
| Text and numbers (`--ui`, `--num`) | system stack (Trebuchet MS, Segoe UI, Arial Rounded MT Bold, DejaVu Sans ...) | none | n/a |

`@font-face` in `styles.css`, `font-display: swap`, one face declared for weights 400-900 (no faux bold), preloaded from `index.html`,
no external host. Numbers stay in the system stack with `tabular-nums` (Luckiest Guy has no tabular figures). No text in an embedded
font smaller than 11 px.

## 3. Outlines

| Element | Weight | Colour |
|---|---|---|
| Heroine | uniform `OL = 5` viewBox units (on a 600-unit figure), round joins and caps | heroine ink `#2B1A12` |
| Symbols | 4 units on a 100-unit box (`sw` default), detail lines 2.4 | `--ink` |
| Plates, buttons, dialogs | 3 px border + hard offset shadow `3px 4px 0 var(--ink)` | `--ink` |
| Chips, popups, small text plates | 2-3 px | `--ink` |

Rules: one outline weight per object family; never a gradient outline; outlines never thinner than 1.5 CSS px at 400x225 (the heroine's
crop scales with her box, the symbols keep >= 1.5 px at the smallest cell, 34.6 px on Annex).

## 4. Sticker outline rule

Anything drawn straight onto a busy or dark background (stamps, chips, win popups, a symbol that leaves its tile, the WILD burst,
mission props over the board) gets a thick cream/white "sticker" contour outside the ink line, as in the user's reference. Order from
outside in: cream sticker (about 1.6x the ink weight) -> ink outline -> misregistered fill. On the board the pale `--tile` plate under
each symbol is the sticker backing, so symbols at rest keep only their ink outline (a second contour would crowd a 35 px cell). The heroine never gets a sticker contour by default (`rim: false`, cost 0.3 ms/frame); her ink outline and the warm
palette separate her from the night scene.

## 5. Halftone

Shadow faces only, never on faces or skin highlights: ink dots on a rotated grid (`patternTransform="rotate(32)"`), 4-5 unit pitch,
dot opacity 0.28-0.40 (`symbols.js` `mb-ht`, `mb-ht2`; the heroine's own pattern in `mambo_art.mjs`). Off with high contrast and on
low-end devices (`hardwareConcurrency <= 2` or `deviceMemory <= 2`).

## 6. Misregistration

The flat fill is shifted against its outline, as in cheap 1960s screen print: heroine `MIS = [2.8, 2.4]` units (small parts `MIS_T =
[1.4, 1.2]`), symbols `MX 2.6, MY 2.2` on a 100-unit box, the moon's thin ink ring offset in `scene.js`. Always down-right, always the same
offset inside one object family, never animated (a jittering offset reads as flicker).

## 7. Motion

Limited animation: primary poses on a 12 fps step (heroine `limited: 12`, at rest the whole figure is drawn on the 12 fps grid,
`idleHz: 12`), symbol loops on one stepped 12 fps clock (`symbols.js`), squash and stretch, an 83 ms wind-up before every reaction.
Every animation honours turbo `T()`, skip and the motion store: Full / Calm (no jumps, spins, shakes or heavy particles) / Still (no motion:
static poses, instant swaps). No element may toggle its visibility more than twice in 100 ms during idle (`visual.mjs` K). At most 2
flashes per second, peak <= 0.5.

## 8. Do and do not

Do:
- flat colour from the tokens above, thick ink outlines, hard offset shadows, halftone on shadow faces, a small print offset;
- the heroine on the LEFT of the grid, facing right, full figure on desktop, waist-up or head in the portrait corner, never over the grid or a button;
- glamour through style and attitude: raised eyebrow, side glance, wink, half smile, hand on the hip, elegant fitted costumes, long gloves;
- the sober base costume (inspectrice) on the tile, the cover and every store image;
- costume changes behind an opaque folding screen with a puff, never a silhouette;
- celebrate (sparkles, pose, chime) only when a round returns more than it cost; a quiet ledger tick otherwise.

Do not:
- realism, 3D, pixel art, gradients that imitate light, glossy plastic, drop shadows with blur;
- bitmap images, external fonts or hosts, emoji, generative AI;
- cleavage, bare thighs, lingerie, a visible corset, arched or suggestive poses, close-ups on the body, lips in close-up, a blown kiss,
  a glove or garment taken off, a finger on the lips, hair flips (blocked clips: `hairFlip`, `impatient`, `laugh`);
- any resemblance to a real person or a famous rubber-hose character (no black ringlets, no garter, no hoop earrings, no round mouse ears),
  any real police badge, flag or agency insignia (the badge is the fictional agency star);
- a shock or win pose without the real event; a near-miss tease; any wording from the social-casino restricted list in social mode.
