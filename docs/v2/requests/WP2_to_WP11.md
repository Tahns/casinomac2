# WP2 (AUDIO) to WP11 (CONTENT-RELEASE): update docs/v2/INTERFACES.md section 2

Replace the "API skeleton" paragraph of section 2 with the real surface (the signatures that were frozen in step 0 did not change; everything below is additive):

```js
import { audio, createEngine, taper, taperDb, CUE_INFO, CUE_IDS, VOLUME_KINDS, DEFAULT_VOLUME, parseVolume } from './audio.js';
// frozen in step 0, now audible
audio.setVolume(kind, pct) / getVolume(kind) / volumes / onChange(fn) / setMuted(b) / muted / play(id, opt) / preview(kind)
// added by WP2
audio.play(id, { quiet: true })   // quiet-result path (R <= C): a cue with winLike true is refused (false, no node)
audio.toggleMute()                // the header speaker: unmute | restore last non-zero sliders when the sliders made it silent | mute; returns true when silent afterwards
audio.silent                      // muted, or Master 0, or Music and Effects both 0 (what body.muted and #btn-sound[aria-pressed] show); audio.muted stays the pure mute flag (am_muted)
audio.lastVolume(kind)            // last non-zero level (memory only); audio.resetVolumes()  // three sliders to 75
audio.cueInfo(id) -> { winLike, minGap? } | null;  audio.isWinLike(id) -> boolean | null
audio.duck = bool                 // -6 dB of the bed under the big stingers (default false: opt-in until a human ear check)
onChange payload: { type: 'volume'|'mute', kind?, value?, volumes, muted, silent }
```
Taper: `taper(s)`: 0 -> 0, 1..75: dB = -45*(75-s)/75, 76..100: dB = +3*(s-75)/25, gain = 10^(dB/20) (75 = unity = the v1 mix, 100 = +3 dB, 1 = -44.4 dB). Graph: sfx -> sfxBus and bed -> musicBus (own reverb return) -> duck -> master (mute + Master slider) -> compressor -> soft limiter. Zero handling: Master, Music or Effects at 0 (or mute) means nothing is queued on that bus. Preview: `settingsTest` cue on the bus being tested, 1 per 250 ms. New cue ids: `ledgerTick settingsTest caseSeal caseOpen lightsOut spotlightStep layoutDraw doorCreak dialStep` (+ `stamp` options); all `winLike: false`. Every sound has an explicit `winLike` flag in `CUE_INFO` (table in `src/audio.js`, notes in `docs/v2/NOTES_WP2_AUDIO.md`).

Also for the rules/Info text and the release notes (human items): the free-spins bed key moved from E dorian to F# dorian (research 09 section 5, avoid-list); NOT listened to, needs a human ear check against reference tracks together with the new cues and the duck.
