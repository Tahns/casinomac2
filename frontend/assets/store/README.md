# Store submission images - The Unleashed Mine

1960s cartoon style, mascot "Old Gus" (adult miner). Hand-built SVG (flat fills with print offset, halftone dots, thick ink outlines), rendered to PNG. No generative AI.

- `tile_3x4.svg` / `tile_3x4.png` - game tile, 3:4, 1536x2048 (Gus in the in-game `bigwin` pose)
- `cover_16x9.svg` / `cover_16x9.png` - cover art, 16:9, 1920x1080 (Gus in the in-game `celebrate` pose, ~85 px left margin)
- `*_v2_oldgus.*` - previous version with the old, separately drawn rounder Gus (generator: `frontend/tools/art/gen_store_art_v2_oldgus.mjs`)
- `*_v1_glossy.*` - earlier realistic-style versions (generator `gen_store_art_v1_glossy.mjs`)

Gus is now the in-game mascot: `frontend/tools/art/bake_gus.mjs` loads `src/render/mascot.js` + `mascot.css` in Playwright, sets a pose, resolves the CSS transforms/visibility into inline attributes and writes static SVG fragments to `frontend/tools/art/gus_poses.json` (bigwin, plunger, happy, celebrate; the mascot's own starburst is stripped). `gen_store_art.mjs` inlines those fragments. Re-run the bake whenever mascot.js/css change.

## Regenerate
```
npm i --no-save playwright-core   # in a temp dir outside the repo (or reuse /tmp/claude-0/pw)
PW_DIR=<tmp> node frontend/tools/art/bake_gus.mjs                   # mascot -> gus_poses.json
node frontend/tools/art/gen_store_art.mjs frontend/assets/store     # writes the SVGs
cp frontend/tools/art/render_store_art.mjs <tmp>/ && cd <tmp> && node render_store_art.mjs <abs path to frontend/assets/store>
```
Rendering uses Playwright chromium (`CHROMIUM` env or /opt/pw-browsers/chromium). Title uses a slab-serif stack with textLength so width is stable across fallbacks; the PNGs are canonical. The TNT label on the dynamite now fits inside its band. No RTP text, logos or third-party branding.
