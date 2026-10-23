# NOTES_wiring (WIRING agent)

- index.html: `#mascot-slot` (aria-hidden, child of #app before #game); `<style id="mascot-slot-base">` gives a zero-specificity (`:where`) absolute, pointer-events:none default so STYLE's CSS overrides it; links src/render/mascot.css.
- render/index.js: mascot mounted by dynamic `import('./mascot.js')` inside createRenderer (silent fallback if missing). Helpers `pose(name, holdMs)` / `say(key, ms, force)` (speech rate-limited to 1 per 3.5 s unless forced). `api.mascot = {pose, say}` for the UI layer.
- Pose map: load idle; round playing think; cluster win happy; big/mega/.../max banner bigwin (+mascot.big); anticipation or 3+ scatters visible shock; free-spin trigger shock -> plunger at detonation -> dance after intro; free spins dance; retrigger happy; free-spin end total banner celebrate; 3 consecutive 0x rounds (outside free spins) shrug + mascot.lose. Reduced motion: dance maps to happy, `reduced:true` passed to createMascot.
- main.js onUnleash: after confirm, mascot plunger + mascot.fs.
- audio.setMood('freespins'|'base') feature-detected in setBonusMode (free spin start/end).
- i18n en.js: mascot.win/big/shock/fs/lose (no restricted words; no social overrides needed).
- rules.js unchanged (no new UI).
