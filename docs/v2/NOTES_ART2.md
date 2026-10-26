# NOTES_ART2 - Art pass 2 of the hand-drawn heroine (Agent Mambo v2)

Owner: ART2 agent. Scope: `docs/research2/art/**` only. Log kept so a restarted agent can resume.

## Brief (what the user asked)
The user judged rig v1 less elegant than the model sheet: torso nearly symmetrical, no 3/4 twist or S-curve, stiff hand-on-hip forearm,
chunky, five glove shapes with a thumb-flip pop. Redraw (pure hand-written Bezier SVG, no bitmaps, no tracing in shipped geometry):
torso/waist/hip/skirt with S-curve and slight 3/4 turn toward the grid (she faces right, stands LEFT of the grid), slimmer noodle arms/legs,
better hands (more glove shapes, blended thumb swap), more elegant head/neck proportion; keep the face (half-lidded lashes, raised brow,
glossy red smirk). Keep every API of `mambo_rig.mjs` and the 14,670-step soak test green. Regenerate `heroine_board.png` (pose vs model sheet),
iterate >= 3 times on base outfit + idle/point/smallwin/bigwin/shock/shrug, then apply the body to the 4 other outfits. Add a waist-up crop
variant for portrait mobile (readable at 120 px wide). Mirror only if cheap. [217] discipline: fully covered, no cleavage, sober.

## Dev tools added
* `art/compare.html` : model sheet | live rig | overlay in rig coordinates with a 10-unit grid (`?pose=&outfit=&vb=&mode=1|2|4`).
* scratch scripts live in /tmp/claude-0/scratch/art2 (not committed). Server on port 5810 (python http.server rooted at docs/research2).

## Baseline (before the pass)
`node rig_test.mjs --soak 1 --perf 1` : 14,670 steps, 0 non-finite, 0 console errors, 0.13 ms avg / 2.1 ms max.

## Log
* [start] read the spec/notes/code, built compare.html, measured the model (hip 83, waist ~48, bust ~73 rig units; closure line at about +12 right of the body centre line; arm total width ~16, leg ~18).
