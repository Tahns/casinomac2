# Store submission images - Agent Mambo

1960s spy-jazz cartoon, hand-built SVG (flat fills with print offset, halftone, ink outlines) rendered to PNG. No generative AI. No RTP text, no logos, no alcohol imagery (Atomic Fizz not used).

- `tile_3x4.svg` / `tile_3x4.png` - 3:4, 1536x2048. Mambo in the baked `bigwin` pose, logo (AGENT over MAMBO), crescent, skyline with CLUB sign, venetian-blind light, Safe/Vinyl/Fedora/Dossier/Magnifier/Bongos, bomb-timer clock, KA-BOOM burst.
- `cover_16x9.svg` / `cover_16x9.png` - 16:9, 1920x1080. Logo + Mambo (`plunger`, DEFUSE box) left, partly filled 6x5 board right with lit Z wire, POW!/ZAP! blasts, x12 badge, bomb-timer clock, teal lair band.
- `_mining_old/` - previous mining-game tile/cover files (kept, not deleted).

Props are the real in-game symbols (`src/render/symbols.js` via `symbolMarkup`); mascot from `tools/art/mambo_poses.json`.

## Regenerate
```
cd frontend_mambo/tools/art
PW_DIR=/tmp/claude-0/pw node bake_mambo.mjs                        # only if mascot.js/css changed
node gen_store_art_mambo.mjs ../../assets/store                    # writes the SVGs
PW_DIR=/tmp/claude-0/pw node render_store_art_mambo.mjs $PWD/../../assets/store   # PNGs (Playwright chromium)
```
