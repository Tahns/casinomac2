# Agent Mambo v2: store images (WP11)

All images are hand-built in code: `docs/research2/art/store/keyart.html` draws the scene in SVG (flat stepped sky, halftone dots, skyline,
moon disc with a keyhole, stage floor, the AGENT / MAMBO title in the embedded Luckiest Guy font) and places the hand-drawn heroine rig
(`docs/research2/art/mambo_rig.mjs`) in the SOBER BASE OUTFIT `inspectrice` (cap, fitted jacket, knee-length pencil skirt, gloves, fictional
badge, flashlight): fully covered, arms-up joy pose, no suggestive pose (user directives 4, 6 and 9; Engine [217]). No generative AI, no RTP
text, no prize amount, no third-party logo. The Stake Studio content review stays the final judge of the heroine (human step).

## What Stake asks for and what ships
Stake's media library asks for a game tile 3:4 and a cover 16:9 (`docs/READINESS.md` items 1 and 2; no pixel size is given in the repo docs,
so the sizes of the previous submission are kept).

| Use | File (`frontend_mambo/`) | Size | Notes |
|---|---|---|---|
| Game tile 3:4 | `tools/art/store_v2/agent_mambo_tile_3x4.png` | 1536 x 2048 | portrait layout: heroine only (like the reference slot), checked at lobby size: `..._preview_150.png`, `..._preview_300.png` |
| Cover 16:9 | `tools/art/store_v2/agent_mambo_cover_16x9.png` | 1920 x 1080 | title left, heroine right; preview `..._preview_320.png` |
| Wide banner | `tools/art/store_v2/agent_mambo_banner_2000x667.png` | 2000 x 667 | same scene, banner layout (optional) |

Sources kept for reference (art pass, same generator): `docs/research2/art/store/agent_mambo_3x4.png` (1200 x 1600),
`agent_mambo_16x9.png` (1920 x 1080), `agent_mambo_banner_2000x667.png`. `frontend_mambo/assets/store/tile_3x4.png` / `cover_16x9.png` are the
v1 art (the v1 mascot, not the heroine): do NOT upload them for v2.

Sizes, bytes and sha256 of the last render, and the hashes of `keyart.html` and `mambo_rig.mjs` it was made from:
`frontend_mambo/tools/art/store_v2/STORE_RENDER.json` (two renders gave byte-identical PNGs).

## Regenerate
```
cd frontend_mambo
node tools/art/render_keyart.mjs            # serves docs/research2/art on 127.0.0.1:5926, Playwright chromium, writes tools/art/store_v2/
node tools/art/render_keyart.mjs --pose idle   # another rig pose if the review asks for an even quieter tile
```
Checked by eye (WP11, 2026-10-30) at full size and at 150 / 300 / 320 px: heroine readable, outfit is the base inspectrice, title readable on the cover.
