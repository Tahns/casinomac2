# FIX heroine -> shell (round 1)

## 1. The head crop window changed (H3-04): update the corner candidate ratio

`CROPS.head` in docs/research2/art/mambo_rig.mjs (and `CROP_VB.head` in src/render/heroine/index.js) is now `[88, 52, 180, 214]`
(was `[96, 60, 160, 176]`): wide and tall enough for the chin, both cheeks and the collar, and the window follows the head in every pose.
In `src/ui/heroine_shell.js`:

```js
export const CORNER_CANDIDATES = Object.freeze([
  Object.freeze({ crop: 'bust', ratio: 226 / 322, hMin: 96 }),
  Object.freeze({ crop: 'head', ratio: 180 / 214, hMin: 72 }),
]);
```

(and the comment above it: "head 180x214"). Any shell test that hard-codes 160/176 needs the same number.

## 2. H2-17: waist-up at 400x225 instead of the face

At 400x225 the landscape slot is about 70x57 px, so `layout()` publishes `crop: 'head'`. With the new head window the whole face, the
hat or cap and the collar show (checked: /tmp/claude-0/scratch/fix_heroine/shots/a400_hero.png), but the costume itself, which is the
mission cue, needs the waist-up crop. Suggested change in `layout()` (landscape branch), so the bust is used whenever the box is at
least 48 px wide; it then reads at about 57 px high, scaled to the free height under the HUD column:

```js
      const r = slot.getBoundingClientRect();
      const crop = r.height > 0 && r.height < BUST_H ? (r.width >= 48 && r.height >= 52 ? 'bust' : 'head') : 'full';
      publish('left', crop, null);
```

If 57 px is judged too small for the bust, keep 'head' (it is now complete) and close H2-17 as "face + costume headgear".

## 3. H4-F9 (portrait size): no change needed from the heroine side

Viewed /tmp/claude-0/scratch/fix_heroine/game/modes_425x812_base_mezzanine_mid.png and modes_425x812_door_stage_feature.png: after
the shell commit 74ef684 the portrait bust is about 170 px tall in the band beside the controls, waist-up, clear of the board and buttons.
