# NOTES_audio (AUDIO agent)

1960s cartoon sound, 100% WebAudio synthesis (no samples/files/AI). `src/audio.js` exports `audio` (default too) and `createEngine(ctx, {muted, noLimit, bedVol})` (same synthesis renders offline in tests).

## API (all previous names kept)
`audio.play(id, opt)`, `setMuted`, `muted` (get/set), `unlock`, `setBonus(b)` (legacy: switches bed base/freespins), `ready`, `bonus`, `_stop`, `_sounds`.
New: `audio.setMood('base'|'freespins'|'off')`, `audio.mood`, `audio._engine`.
WIRING: call `audio.setMood('freespins')` when free spins start (under the explosion flash), `setMood('base')` at free-spins end, `setMood('off')` only if the bed must stop. Optional: `play('nearmiss')` (short sad trombone), `play('kaching')`, `play('tada')`, `play('mascot_hop'|'mascot_gasp')`, `play('win', {combo, size})` (size = cluster symbols; longer xylophone gliss).

## Sound ids
click error nearmiss(wahwah) spin whoosh land pop win(xylo) scatter antic fuse explosion mult fsStart retrigger fsEnd tada bigwin kaching coin count heart rumble crack shower stinger tick drip mascot_hop mascot_gasp.

## Design
- Bed: lookahead scheduler (setTimeout wakes every 80 ms, all timing from the audio clock, 350 ms lookahead; paused when muted/hidden/not running; restarts on a bar line). Base = 110 bpm swing, 8-bar loop (17.45 s): walking upright bass, brush swish/ride/foot hat/feathered kick, vibes comp with beat-locked tremolo, muted trumpet stabs. Free spins = 125 bpm, 12-bar blues (23.04 s), brass stabs, xylophone runs. One bus per mood, faded on change.
- One master gain -> compressor -> transparent soft limiter (<= 0.97). Mute: master 0 and every live voice is stopped, nothing is queued; unmute restarts the bed. Voice cap 56 (bed exempt). Shared deterministic noise buffer, 1.3 s shared reverb.

## Tests
`PORT=5204 PW_DIR=<dir with node_modules/playwright-core> node frontend/tests/audio/audio.test.mjs` (spawns serve.mjs if needed): offline render of every sound (not silent, no NaN, pre-limiter peak < 0 dBFS), win length scales, pop pitch climbs, voice cap, both beds (loop periodicity, seam step, clean tail), live mute (graph introspection like guideline 107, localStorage, body.muted, aria-pressed). Guideline 107 still PASSES.
