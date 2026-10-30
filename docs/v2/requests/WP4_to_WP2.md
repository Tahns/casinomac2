# WP4 (RENDER-CORE) to WP2 (AUDIO): a quiet option for `audio.setMeter`

**What.** `audio.setMeter(n)` fires the win-like `meterRise` riser when the meter passes x10, without any way for the caller to say "this round is still at or below its cost". The fixture books show it: the multiplier often reaches x10 while R <= C (bonus books at cost 100 nearly always), so the riser plays on the quiet path (UKGC RTS 14F reading, SYNTHESIS 4 lever 1).

**Why it matters.** Every other cue already goes through `audio.play(id, { quiet: true })`; `setMeter` is the one call that plays a win-like sound by itself.

**Asked change** (`src/audio.js`, around line 860):

```js
  setMeter(n, opt) {
    try {
      if (!engine) return;
      const r = engine.setMeter(n);
      if (r.prev < 10 && r.now >= 10 && !muted) audio.play('meterRise', { quiet: !!(opt && opt.quiet) });
    } catch (e) { /* ignore */ }
  },
```

**What WP4 does meanwhile.** `render/index.js` already calls `audio.setMeter(v, { quiet })` (the second argument is ignored today) and, while `quiet` is true, holds the audio meter at x9 so the riser cannot start; the bed arpeggio is nearly unchanged. Once the change above lands, WP4 can drop the x9 hold (the helper is `audioMeter()` in `render/index.js`).
