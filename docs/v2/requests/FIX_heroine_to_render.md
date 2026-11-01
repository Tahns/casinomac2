# FIX heroine -> render (round 1)

## H2-11 / I7: one entry line and one exit line per mission

The heroine keys exist now (src/i18n/en_hero.js, merged after en.js): `mascot.fs.briefing`, `mascot.fs.orders` ('Sealed orders. Hush.'),
`mascot.fs.blackout` ('Lights out, darling.'), `mascot.fsEnd.briefing`, `mascot.fsEnd.orders`, `mascot.fsEnd.blackout`.

In `src/render/index.js` `fsTrigger()`, replace

```js
    if (mid === 'briefing') say('mascot.fs', 2400, true);
```

with

```js
    // H2-11: each mission has its own line ('mascot.fs' and its variants stay the Briefing line)
    if (mid === 'briefing') say('mascot.fs', 2400, true);
    else say(hasKey('mascot.fs.' + mid) ? 'mascot.fs.' + mid : 'mascot.fs', 2400, true);
```

In `fsEnd()`, the non-filed, non-capped branch, replace

```js
say(hasKey('mascot.fsEnd') ? 'mascot.fsEnd' : 'mascot.big', 2400, true);
```

with

```js
const mEnd = S.mission && S.mission.id && S.mission.id !== 'briefing' && hasKey('mascot.fsEnd.' + S.mission.id) ? 'mascot.fsEnd.' + S.mission.id : 'mascot.fsEnd';
say(hasKey(mEnd) ? mEnd : 'mascot.big', 2400, true);
```

(`say()` picks `key + '.' + n` variants only when they exist, so `mascot.fs.orders` is said as is.)

## H2-08: nothing to do on the render side

Done in the heroine director (src/render/heroine/director.js): `react('end')`, which fsEnd() already sends, now swaps the costume back to the
inspectrice at once, under the end card, before the bow; no folding screen plays after the bow any more. The layers fallback
(dossier.js backToBase at finalWin + 3.2 s) becomes a no-op because the outfit is already the base one.

# FIX heroine -> render (round 2): H2-11 still open, plus main.js (shell)

Status 2026-11-01: render/index.js:1090 and :1140 still say only the generic keys, and main.js:336 says the generic `'mascot.fs'` pool on every
door confirm. Seen live: the Coat Check round at 425x812 said "LIGHTS, DOSSIER, ACTION." (verify1/shots/orders_425x812_t300.png).

## What the heroine did on her side (round 2)

`src/i18n/en_hero.js` now overrides the generic pool `mascot.fs`, `mascot.fs.1` .. `mascot.fs.5` with mission-neutral lines ("Into the lair!",
"Let's mambo.", "New file, new rules.", "On the case.", "Showtime, darling."). So a door confirm never names the wrong mission even before the
change below. "Briefing time." now lives only in `mascot.fs.briefing`. The mission lines are `mascot.fs.{briefing,orders,blackout}` and
`mascot.fsEnd.{briefing,orders,blackout}`.

## 1. render/index.js fsTrigger() (line ~1090). Every mission says its own line

Replace

```js
    if (mid === 'briefing') say('mascot.fs', 2400, true);
```

with

```js
    // H2-11: each mission has its own entry line (en_hero.js); the generic pool is mission-neutral
    say(hasKey('mascot.fs.' + mid) ? 'mascot.fs.' + mid : 'mascot.fs', 2400, true);
```

## 2. render/index.js fsEnd() (line ~1140). One exit line per mission

Replace

```js
say(hasKey('mascot.fsEnd') ? 'mascot.fsEnd' : 'mascot.big', 2400, true);
```

with

```js
const mEnd = S.mission && S.mission.id && hasKey('mascot.fsEnd.' + S.mission.id) ? 'mascot.fsEnd.' + S.mission.id : 'mascot.fsEnd';
say(hasKey(mEnd) ? mEnd : 'mascot.big', 2400, true);
```

## 3. src/main.js:336 (shell owner). The door confirm

fsTrigger speaks with `force` a moment later, so the door-confirm line is a duplicate. Keep the plunger pose and drop the line:

```js
  try { if (S.renderer && S.renderer.mascot) S.renderer.mascot.pose('plunger', 1600); } catch (e) { /* ignore */ }
```

Or, to keep a line at the click, say the chosen door's mission:

```js
  const DOOR_MISSION = { bonus: 'briefing', entrance_orders: 'orders', entrance_blackout: 'blackout' };
  try { if (S.renderer && S.renderer.mascot) { S.renderer.mascot.pose('plunger', 1600); S.renderer.mascot.say('mascot.fs.' + (DOOR_MISSION[mode] || 'briefing'), 2000, true); } } catch (e) { /* ignore */ }
```

## 4. Note (no change needed): wire.js pose('plunger') during the blast

`wire.js blast()` calls `pose('shock')` then `pose('plunger')` right after `react('blast')`. The legacy 'plunger' maps to the mission trigger
(prio 4), so the BOOM used to play the free-spin salute and wink, with the saluting arm across her eye (NEW-glove-over-face-boom). The heroine director now
ignores a legacy pose while a real reaction (the blast) plays. Removing the two `pose()` calls from wire.js would be cleaner but is not
required.
