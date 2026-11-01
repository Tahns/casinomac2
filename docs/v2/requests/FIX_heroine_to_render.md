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
