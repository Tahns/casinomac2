# Store submission images - The Unleashed Mine

Hand-authored vector art (procedural SVG paths, gradients, filters; no generative AI).

- `tile_3x4.svg` / `tile_3x4.png` - game tile, 3:4, 1536x2048
- `cover_16x9.svg` / `cover_16x9.png` - cover art, 16:9, 1920x1080

## Regenerate
```
node frontend/tools/art/gen_store_art.mjs frontend/assets/store     # writes the SVGs
npm i --no-save playwright-core   # in a temp dir outside the repo
cp frontend/tools/art/render_store_art.mjs <tmp>/ && cd <tmp> && node render_store_art.mjs <abs path to frontend/assets/store>
```
Rendering uses Playwright chromium (`CHROMIUM` env or /opt/pw-browsers/chromium). Title uses system serif fallbacks (Georgia, DejaVu Serif, Liberation Serif); PNGs are the canonical deliverable.
