# WP6 (LAYERS) to WP5 (FX-WIRE, owner of scene.js): per-mission palette tokens

Status: open.

What: SYNTHESIS 9 art inventory lists "per-mission palette tokens (lair, hat-check, ballroom) swapped under the wipe by WP5's scene.js".
scene.js has one free-spins set today (the lair, `--mb-fs-*`). WP6 now publishes which mission is playing:

- `document.documentElement.dataset.mission` = `briefing` | `orders` | `blackout` from the start of the dossier cutscene
  (`missionAssigned`, or the first event after `freeSpinTrigger` in a v1/bonus book) until `freeSpinEnd` / the end of the book.
  It is set while the dossier covers the board, so a token swap there is hidden "under the wipe".

Ask: key the free-spins palette on it, keep the lair as the default (Briefing, and any unknown mission):
```js
// scene.js: when reading the lair palette (pal(host, 'fs-', LAIR)), pick a set by mission
const MISSION_FS = {
  briefing: LAIR,                                                    // the secret lair (teal round room)
  orders:   { ...LAIR, bg: '#3B1F52', wall: '#9A7BD0', ring: '#E8A92B', seam: '#14102B', lamp: '#F08A2B', blind: '#E8A92B', wedge: '#E8A92B' },  // hat-check room: aubergine and brass (closed palette)
  blackout: { ...LAIR, bg: '#14102B', wall: '#2B2A6B', ring: '#9A7BD0', seam: '#1D1B4F', lamp: '#FBF1D9', blind: '#9A7BD0', wedge: '#FBF1D9' },  // ballroom in the dark: ink, indigo, cream spot
};
const m = document.documentElement.dataset.mission;
const base = MISSION_FS[m] || LAIR;
// ...then pal(host, 'fs-', base) as today, and redraw the lair canvas when the attribute changes:
new MutationObserver(() => redrawLair()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mission'] });
```
Colours above are all from the closed palette in styles.css :root (aubergine, lilac, brass, orange, ink, indigo, cream). Exact
values are yours to choose; what WP6 needs is only that the three features look different with the sound off (10-second test).
