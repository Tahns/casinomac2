# FIX shell -> store art (round 1): H4-F8 / I1, the 3:4 store tile has no title

Status: done (38df028)

Not in the shell's files (the tile is built by `frontend_mambo/tools/art/gen_store_art_mambo.mjs` / `render_store_art.mjs`, output
`tools/art/store_v2/agent_mambo_tile_3x4.png`), so the shell fixer did not touch it.

What: H4 viewed the v2 3:4 tile at lobby size (100 and 150 px wide, `/tmp/claude-0/scratch/H4_swot_perf/tiles_small.png`). It shows
only the heroine on a skyline: no AGENT MAMBO title, no symbol, nothing that reads as a slot. The tile is what most players see.

Ask:
1. Put the AGENT MAMBO title block on the 3:4 tile, the same lockup as the wide key art (the in-game logo SVG, `#logo` in
   `index.html`, built by `src/render` `prepareStatic`), across the top third, at least 70 % of the tile width so it still reads at
   100 px wide.
2. Heroine in the sober pose (base outfit, inspectrice; directives [217]: fully covered, no cleavage, no bare thighs), lower two thirds,
   facing the title.
3. Keep the closed palette and the ink outline weight of the game; no generative AI.
4. Check at 100, 150 and 600 px wide that the title is legible and that the tile differs from the v1 tile at a glance.

## Round 2 status (shell fixer): still open, handed to the store-art owner

The 3:4 tile is still built only by `frontend_mambo/tools/art/gen_store_art_mambo.mjs` / `render_store_art.mjs` (not shell files), so the
shell fixer cannot apply it. Owner of `tools/art/**`: please apply items 1-4 above (AGENT MAMBO lockup across the top third at >= 70 % of
the tile width, heroine in the base inspectrice outfit, fully covered per [217], closed palette, no generative AI) and re-render
`tools/art/store_v2/agent_mambo_tile_3x4.png`, then check it at 100, 150 and 600 px wide.
