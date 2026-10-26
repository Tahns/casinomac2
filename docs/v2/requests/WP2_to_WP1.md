# WP2 (AUDIO) to WP1 (SHELL): wire the speaker button and the sound tab to the new audio API

`src/audio.js` now has the buses, the taper, the preview and the zero handling (see `docs/v2/NOTES_WP2_AUDIO.md`). Nothing in WP1's files is required for the game to keep working, but three small changes make the UI honest. All of it is in your files (`src/main.js`, `src/ui/**`).

## 1. `#btn-sound` must call `audio.toggleMute()` (main.js, `bindUI`)

Today (v1):
```js
on('btn-sound', () => {
  S.muted = !S.muted; document.body.classList.toggle('muted', S.muted);
  const b = $('btn-sound'); if (b) b.setAttribute('aria-pressed', String(S.muted));
  if (S.audio && S.audio.setMuted) S.audio.setMuted(S.muted);
});
```
Why it must change: `audio.js` now sets `body.muted` and `#btn-sound[aria-pressed]` itself and they show **silent** (= muted, or Master at 0, or Music and Effects both at 0). The handler above keeps a second copy of the flag (`S.muted`) that drifts from `audio.muted` as soon as a slider can make the game silent, and it would write the icon state behind audio.js's back.

Replace with:
```js
on('btn-sound', () => { if (S.audio && S.audio.toggleMute) { S.audio.toggleMute(); S.muted = !!S.audio.muted; } });
```
`toggleMute()` unmutes, or (when the sliders made the game silent) raises Master / Music+Effects back to their last non-zero level, or mutes. Returns true when the game is silent afterwards. Also init `S.muted` from `audio.muted` only (it already does) and never write `body.muted` / `aria-pressed` for the sound button yourself: `audio.js` keeps them in sync (it calls its `syncUi()` on every change).

## 2. Sound tab (src/ui/settings_dialog.js)

| Control | Call |
|---|---|
| Mute all (switch, `role=switch`, mirrors `#btn-sound`) | `audio.setMuted(bool)`; read `audio.muted`; refresh from `audio.onChange` events with `type: 'mute'` |
| Master / Music / Effects (range 0-100, step 1) | on `input`: `audio.setVolume('master'|'music'|'sfx', Number(el.value))`; on `change` (not `input`): `audio.preview(kind)` with the same kind names. The preview is rate limited (1 per 250 ms), silent while muted or while that slider is 0, and never win-like; you do not need your own debounce |
| Readout and `aria-valuetext` | `audio.getVolume(kind)`; e.g. "75 percent", "Off" at 0 |
| Reset (if you add one) | `audio.resetVolumes()` (sets the three sliders to 75, leaves the mute flag alone) |
| Live refresh | `audio.onChange(fn)`: `fn({ type: 'volume'|'mute', kind?, value?, volumes, muted, silent })`; `silent` is the "speaker shows X" state (muted, Master 0, or both mixes 0) |

Storage is already done inside `audio.js` (`am_muted`, `am_vol_master`, `am_vol_music`, `am_vol_sfx`, through `settings.storage`). Do not write those keys yourself and do not add audio keys to `am_settings`. Invalid stored values are clamped/ignored by `audio.js`.

Wording reminder (social mode): the labels "Master", "Music", "Effects", "Mute sound", "Preview" contain none of the restricted words.

## 3. Replay

Replay uses the same renderer and the same `audio` singleton, so it is already covered by the mute and the Master slider (a test walks the real graph in replay mode and finds no source that bypasses `master`). The replay UI only needs a visible way to reach the gear / speaker button (your WP).
