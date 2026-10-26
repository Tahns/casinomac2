# NOTES_audio (AUDIO agent) - Agent Mambo

Spy-jazz, 100% WebAudio synthesis (no samples/files/AI). `src/audio.js` exports `audio` (default too) and `createEngine(ctx, {muted, noLimit, bedVol})` (same synthesis renders offline in tests). Mute key in localStorage: `am_muted` (not the mining game's `tum_muted`). I could not listen to it: levels/timbres are verified by numbers only (peak, RMS, seam), not by ear.

## API (all previous names kept)
`audio.play(id, opt)`, `setMuted`, `muted`, `unlock`, `setBonus(b)`, `setMood('base'|'freespins'|'off')`, `mood`, `ready`, `bonus`, `_stop`, `_sounds`, `_engine`.
New optional: `audio.setMeter(level)` (Mission Meter: free-spins vibraphone arpeggio +1 semitone per 5 levels, cap +5; riser plays when passing x10). `play('mult')` pitch follows the meter (or `{level}`).

## Sound ids
Old: click error nearmiss wahwah spin whoosh land pop win xylo scatter antic fuse explosion mult fsStart retrigger fsEnd tada bigwin kaching coin count heart rumble crack shower stinger tick drip mascot_hop mascot_gasp.
New: dossier (=scatter) wire{i} (relay click + beep, +1 semitone/node, auto-steps if no i; `fuse` = wire) tick{p|burn,total} (tick/tock) ticks{burn,total,dur} (accelerating run) defuse snip blast(=explosion) stamp metermax meterTick/meter(=mult) meterRise/riser vault phone shutter.

## Design
- Base bed 118 bpm D dorian, 8 bars, 16.27 s; free spins 132 bpm E dorian, 14.55 s (DESIGN 6.1/6.2 note by note): walking triangle bass, bongos (pitch-drop sine + noise click, panned) + conga, brush hat, vibraphone (sine + detuned 4th partial, bar-locked tremolo), surf guitar (saw through 1.2 kHz band-pass, 7 Hz vibrato, feedback-delay spring), brass stabs (detuned saws).
- Lookahead scheduler (80 ms wake, 350 ms lookahead, audio-clock timing); stops when muted/hidden/not running; tab hidden also suspends the context.
- One master -> compressor -> soft limiter (<= 0.97). Mute: master 0, all live voices and bus springs stopped, nothing queued. Voice cap 56 (bed exempt), shared noise buffer, 0.35 s shared room reverb.

## Tests
`PORT=5405 node frontend_mambo/tests/audio/audio.test.mjs` (spawns serve.mjs if needed): every id rendered offline (not silent, no NaN, peak < 0 dBFS), win length scales, pop climbs, clock accelerates, voice cap, both beds (periodicity, seam, tail), live mute (graph introspection, am_muted, body.muted, aria-pressed).
