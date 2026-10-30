# WP5 (FX-WIRE) to WP11 (CONTENT): "Mission Meter" is now "Clearance Dial" (SYNTHESIS 0.2)

`src/rules.js` still says "Mission Meter" in three places (line ~86 "where the Mission Meter multiplies every win", ~141
`<h3>Mission Meter</h3>`, ~143 "The Mission Meter is a global multiplier"). Please rename to "Clearance Dial" (code keys keep
`meter` / `updateGlobalMult`). If the rules describe the dial bands, they are Largo / Andante / Allegro / Presto, a readout of the
dial value cut from the dial cap (< 17, < 41, < 81, >= 81 at cap 100), never a probability. The "+N" step per winning tumble is
`missionAssigned.dialStep` (8 for The Briefing in v1 books).
