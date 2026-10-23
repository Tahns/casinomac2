# Store submission images - The Unleashed Mine

1960s cartoon style, mascot "Old Gus" (adult miner). Hand-built SVG (flat fills with print offset, halftone dots, thick ink outlines), rendered to PNG. No generative AI.

- `tile_3x4.svg` / `tile_3x4.png` - game tile, 3:4, 1536x2048
- `cover_16x9.svg` / `cover_16x9.png` - cover art, 16:9, 1920x1080
- `*_v1_glossy.*` - previous realistic-style versions (kept for reference; generator at `frontend/tools/art/gen_store_art_v1_glossy.mjs`)

Gus is drawn inline in `frontend/tools/art/gen_store_art.mjs` (function `gus()`); src/render/mascot.js did not exist when this was made, so re-sync if the in-game mascot changes.

## Regenerate
```
node frontend/tools/art/gen_store_art.mjs frontend/assets/store     # writes the SVGs
npm i --no-save playwright-core   # in a temp dir outside the repo
cp frontend/tools/art/render_store_art.mjs <tmp>/ && cd <tmp> && node render_store_art.mjs <abs path to frontend/assets/store>
```
Rendering uses Playwright chromium (`CHROMIUM` env or /opt/pw-browsers/chromium). Title uses a slab-serif stack (Rockwell, Roboto Slab, DejaVu Serif, Georgia) with textLength so width is stable across fallbacks; the PNGs are canonical. No RTP text, logos or third-party branding.
