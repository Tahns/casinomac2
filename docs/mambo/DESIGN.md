# AGENT MAMBO - design bible (frontend_mambo + math/games/agent_mambo)

Status: design only. Nothing here is legal advice; every "nothing found" below means exactly that. All art is SVG/CSS, all sound is WebAudio. No generative AI.

## 1. Premise and tone

1. 1962, a jazz-lounge city that never sleeps. Agent Mambo, a deadpan adult spy with a hair-do full of gadgets, cracks classified dossiers by clearing symbol clusters.
2. Every winning tumble turns the dial on the MISSION METER; it never drops during the free spins.
3. A bomb-timer WIRE runs across the board. If the board goes dead with enough wire burnt, Mambo presses the button and the burnt cells are BLASTED out of the grid.
4. Tone: cool, dry, cut-paper cartoon. Comedy comes from Mambo staying calm while everything pops. No weapons, no violence, no one gets hurt; props blow up, never people.
5. Look: indigo night city, hot coral and lemon accents, mid-century cut-paper shapes, bouncy rounded forms, not the angular Pink Panther titles.

## 2. The mascot

### 2.1 Three original adults
- A. **Mambo (Mabel "Mambo" Fontaine)**: stacked-shape hourglass (tall beehive oval, small head, A-line skirt triangle, kitten heels). Big white oval eyes, winged liner, red lips, atom earrings. Vermilion swing dress, mustard belt, cream opera gloves. Props: hair hides a periscope antenna, lid and speaker; drum-shaped attache case. Deadpan, unflappable, taps her heel to a beat.
- B. **Barnaby Pluck**: egg body on stubby legs, bowler, ginger mutton chops, round spectacles, mustard check jacket, vibraphone mallets. Fussy and flustered.
- C. **Tibby Stilts**: beanpole, tiny head, pork-pie hat, grey lounge suit, upright-bass case with a hidden compartment. Sleepy, ultra-cool.
- Differentiation: A has no trench or moustache (Clouseau), no tuxedo (Bond), no teeth, glasses or velvet (Powers), no animal, eyepatch or turtleneck (Danger Mouse, Archer), no shoe phone (Get Smart), no racer (Pitstop), no beaked black/white pair (Spy vs Spy), no bald head or pinky (Dr. Evil), no bungling-fool gag (English). B's whiskers plus fuss sit near Clouseau; C's suit plus cool sits near Bond.

### 2.2 Pick: A, "Mambo" (Mabel "Mambo" Fontaine)
Why: the beehive plus skirt triangle is a unique silhouette readable at 80 px (none of the ten references has it); the hair gives a gadget gag per pose (antenna, lid, smoke puff); an adult woman lead is rare among slot mascots; her name is the title. Name check: no slot, app or mascot found for "Agent Mambo" or "Mabel Mambo" (web search; SlotCatalog cannot be queried by phrase). Mambo is an Afro-Cuban dance genre: no ethnic caricature (no sombrero, no maracas gag).

### 2.3 Drawing spec (SVG viewBox 200x233, same 6:7 box as Old Gus so layout code is unchanged)
Outline ink #14102B, 4 px (small variant 5.5), round joins; fills offset 2 px up-left (misregistration); lilac #9A7BD0 halftone dots only on the shadow side of dress and hair; highlight = one white stroke. Separate groups: hair, antenna, lid, head, eyes, brows, mouth, armL, armR, dress, legs, prop.
- Beehive: M64,94 C54,58 70,12 100,8 C130,12 146,58 136,94 Z, aubergine #3B1F52, three cream curved stripes (y 30/48/66), teal hairband y 88. Antenna: ink tube from (100,10) up 16 px, lemon ball r 5, extends to 34 px in think/shock. Hinged lid at (130,50).
- Head: circle (100,108) r 26, skin #D9A074. Eyes: white ovals rx 8 ry 10 at x 91/109, y 104, ink pupils r 4, 8 px liner flicks. Thin 3 px brows, one-arc nose, coral lips 18 px wide, beauty mark, lemon atom earrings.
- Body: shoulders y 134 (x 76..124), waist y 160 (x 86..114), skirt hem y 206 (x 50..150), vermilion #F0472F with cream dots r 3, lemon belt with 8-point buckle. Arms 9 px tubes pivoting at (78,138)/(122,138), cream gloves. Legs: cream stockings y 206..226, teal kitten heels 14x8.
- Prop: drum-shaped case (indigo body, lemon clasps, pink lid) in the right hand in idle/happy.

### 2.4 Nine poses mapped to events (names unchanged so render hooks keep working)
| Pose | Event | Drawing / motion |
|---|---|---|
| idle | rest | Weight on left heel, blink every 3 s, heel tap on the 118 bpm beat, antenna wobble +-3 deg |
| think | spinning/tumbling | Glove on chin, eyes up-left, brow raised, antenna extends 10 px with a lemon "?" star |
| happy | small win | 8 px hop with squash, wink, case raised, pink music note |
| bigwin | big to epic win | Arms up, mouth "O", beehive bounces 1.06 steps(2), antenna spins, lid launches confetti, cream starburst behind |
| shock | scatter near-miss, 4th scatter, board dead with wire armed | Round eyes, tiny pupils, beehive stretches 8%, antenna springs to 34 px, three steel-blue sweat drops, hands up |
| plunger | free-spins entry, wire blast ("press the button / defuse") | Lean toward a cream button-box (red mushroom button r 12, label DEFUSE); glove slams it on beat 1, box squashes, spark star, 6-frame recoil |
| shrug | dead round, wire fizzle | Palms up, shoulders up, flat mouth, lid pops and a grey puff leaves, one heel kick |
| dance | free-spins loop | Mambo step at 132 bpm: skirt skewX +-6, alternate arms, hair counter-sway, case played like a bongo, steps(4) |
| celebrate | free-spins end, max win | 360 degree heel spin, then raised seltzer glass (lime fizz), starburst and confetti, hold 2 s |

Sizes: full detail from 160 px; 100-140 px small variant (no halftone, no earrings, thicker outline). Desktop: left gutter beside the meter, 30-40% of grid height; portrait: 110-130 px bottom-left above controls; 400x225: 80-90 px bottom-right over the frame edge.

## 3. The ten symbols

All 40 px legible: 1 dominant colour + 1 accent + ink outline 4 px at 100 px cell (5 px small), a single white highlight stroke, one cast-shadow offset. Silhouette is different for every symbol. No weapons.

| ID | Name | Silhouette / colour | Drawing notes |
|---|---|---|---|
| H1 | Vault Safe | Square, mustard-gold #FFD23F + brass #E8A92B | Rounded square door, 8-point-star dial coral #F0472F in the centre, two hinge bars, lock handle cream |
| H2 | Atomic Fizz | Inverted triangle, teal #1FB5A3 | Cone glass with lime #A5D63B fizz, orange-lemon slice on rim, one atom-orbit swizzle; no cherry |
| H3 | Hi-Fi Vinyl | Perfect circle, aubergine #3B1F52 + flamingo #F5799F label | 3 concentric groove rings (lilac), pink label with ink star, square sleeve corner peeking behind (cream) |
| H4 | Bongos | Two joined lobes, orange #F08A2B | Two drum bodies, cream skins (ellipse tops), three lemon tuning lugs each, crossed sticks NOT shown |
| L1 | Fedora | Dome plus wide brim, navy #2B2A6B | Brim ellipse, crown, coral band with a small feather |
| L2 | Rotary Phone | Rounded box plus handset arch, coral-red #F0472F | Cream dial disc with 5 holes, handset on top as an arch |
| L3 | Magnifier | Circle plus diagonal handle, steel blue #6FA7D9 | Brass ring, pale lens with one white arc, ink handle with brass ferrule |
| L4 | Bow Tie | Butterfly, flamingo pink #F5799F | Two triangles plus knot, cream polka dots, ink outline |
| W | Mambo Star (Wild) | 12-point starburst, lemon #FFD23F | Lilac inner disc with Mambo's winged eyes and red lips in cut-paper style; banner "WILD" below; cream rim; gentle pulse |
| S | Classified Dossier (Scatter) | Tilted manila folder with tab, vellum #FBF1D9 + tan | Red circle stamp with a white star (no readable lettering at cell scale), paper clip lilac, 6 degrees tilt, flap corner curled |

## 4. World and UI skin

### 4.1 Palette (hex; none of the mining browns/mustards remain as dominant)
Ink #14102B, Midnight indigo #2B2A6B, Neon teal #1FB5A3, Hot coral #F0472F, Flamingo #F5799F, Atomic lemon #FFD23F, Vellum cream #FBF1D9, Lilac #9A7BD0, Lime #A5D63B, Steel blue #6FA7D9. Background base #181640. Meter hues: teal, lemon, coral, flamingo as the level rises.

### 4.2 Scene layers (flat shapes only, parallax by CSS translate, slow)
1. Sky #181640, pale-lemon crescent, Sputnik-style satellite drifting over 40 s.
2. Atomic sparkles: 18 four-point stars, boomerangs, amoeba blobs (lilac/lemon), blink with steps(2).
3. Far skyline: indigo polygons, random lemon windows, coral neon "CLUB" sign.
4. Rooftop: parapet, water tower, turning radar dish.
5. Venetian-blind light: 8 diagonal cream bands (opacity 0.10) drifting 6 px/s.
6. Free spins = SECRET LAIR: riveted teal round room, map-screen, radar sweep wedge, coral alarm lamp, blind light turns coral; iris-wipe (circle clip) transition.
7. Foreground cut-paper silhouettes (palm leaf, bongo stack) in #14102B.

### 4.3 Frame and panels
Board panel #2B2A6B with a 10 px teal piping, 6 px ink outer outline, lemon rivets at corners and every 8th cell; corner "dossier clips" in lilac. Panels (balance, win, bet): vellum #FBF1D9 with ink outline and a 3 px offset coral shadow; labels in ink on vellum. Buttons: pill, coral (primary spin) / teal (secondary) / lemon (UNLEASH-entry), ink outline, offset shadow, press = translate(2px,2px) and shadow removed. Local fonts only: display "Futura","Century Gothic","Arial Black",sans-serif; numerals "Arial Rounded MT Bold","Trebuchet MS".

### 4.4 Logo
Two lines: "AGENT" (small caps, 36% of height, tilted -4 deg, lemon with ink double outline: 6 px ink then 3 px cream inside) over "MAMBO" (large, coral fill, ink outline, cream inner line, 8 px indigo drop shadow offset). Behind: a 14-point lemon starburst misregistered 3 px, a small bomb-clock dot over the "O" (clock hands as the dot). Words are drawn as SEPARATE `<text>` elements in the SVG with at least 0.3 em gap between words and no letter-spacing reliance; the accessible name is the single string "Agent Mambo". Each word sits on its own line, so no words run together on portrait (a small word like "THE" would be its own element). Test at 425x812 and 400x225.
Loading screen: indigo background, logo, a thin wire that "burns" left to right as the progress bar (8 nodes light in order), text "Preparing the mission..." and Mambo in `think`.

## 5. Mechanics to presentation

### 5.1 Global multiplier meter - "MISSION METER"
- Look: vibraphone ladder of bars growing in width, current bar lit lemon, plus a starburst badge `x7`. Free spins only; hidden in the base game.
- Placement: desktop 1024x576: vertical, left side of the grid, flush against the frame, height = grid height, Mambo stands in the left gutter beside it. Portrait 425x812: horizontal strip (full grid width, 26 px) directly above the grid, badge at its left end. 400x225: only the badge (starburst ~34 px) pinned top-left over the frame corner plus a 4 px bar under the frame.
- Growth: on each winning tumble step +1: the new bar pops (scale 1.3, steps(3)), badge digits flip vertically in 120 ms, one starburst flash, vibraphone note stepping up a pentatonic scale (pitch = level mod 10, octave every 10), a "+1" chip flies from the winning cluster to the badge. Levels 5/10/20/50 shift hue and add a star ring. At cap: "MAX" stamp.
- Carry-over: each free spin starts with the badge pulsing and a "KEPT" tag. Bars shown = min(cap, 20); beyond 20 the ladder scrolls. Whether a step pays at the old or the new value comes from math/agent_mambo and goes verbatim into the rules text.

### 5.2 Bomb-timer WIRE
- Art: a braided cable (indigo #2B2A6B, lilac highlight, 7 px at 100 px cell) runs through 8 cell centres with an 8-lug terminal at each cell; unlit = dull, lit = a hot cream-lemon cable with a coral glowing LED lug. A cartoon alarm-clock bomb (round, two bells, red dial) sits at the path end.
- Timer: LED readout `3/8` on the clock, hand advances per lit node. Reveal: node 1 lit with a click; each winning step lights the next lug with a spark star and a relay beep.
- Board dead and >=3 burnt: "DEFUSE!" tag, Mambo `plunger`, ticks speed up for 600 ms, then BLAST: each burnt non-scatter cell gets an 80 ms white flash, a cream burst star ("POW!/BAM!/BOOM!"), the symbol breaks into 3 cut-paper pieces that fly out, a dust cloud on the REMOVED (empty) cell, 6 px screen shake for 250 ms. Scatters flash a shield and stay. New symbols then drop into the holes as a tumble step; the wire resets.
- Fewer than 3 burnt: fizzle: lugs go dark one by one, a small smoke puff, "tsss", Mambo `shrug`.
- No wild is ever created by the wire.
- Mascot flow: think (spin) -> happy (tumble win) -> shock (board dead, wire armed) -> plunger (button) -> happy (blast drop) or shrug (fizzle).

### 5.3 Scatter, wild, free spins
- Scatter "Classified Dossier": lands with a typewriter clack; 3 on screen trigger anticipation (ticking, guitar tremolo); 4+ fly to centre, the front one opens, stamp "ACCEPTED" thumps.
- Wild "Mambo Star": substitutes for all pays except the scatter; pulses; when part of a win it flashes coral rim.
- Free-spins intro "MISSION BRIEFING": iris wipe to the lair, banner "N FREE SPINS" on a telegram strip, Mambo plunger then dance, meter appears at x1 with a stamp "MISSION START".
- Retrigger (3+): "INCOMING TELEGRAM" slide-in, banner "+N FREE SPINS", brass stab, Mambo happy.
- Free-spins end: "MISSION COMPLETE" stamp, total in a starburst, celebrate pose.
- Big-win banners: headline stays the standard word, flavour line underneath: BIG WIN - "Smooth Operator"; MEGA WIN - "Top Secret Score"; SUPER WIN - "Agent of Groove"; EPIC WIN - "Atomic Score"; MAX WIN - "Mission Accomplished".

### 5.4 UNLEASH renamed - the story choice
Five options (none contains buy, bet, pay, cash, stake, wager, credit, purchase, bonus buy or win feature):
1. SECRET ENTRANCE (recommended; "Take the secret entrance")
2. SKIP TO THE LAIR
3. DEEP COVER
4. FAST LANE MISSION
5. BACKSTAGE PASS
Social check: all five pass the social filter unchanged. Confirm dialog (required at 100x): "Take the secret entrance? This starts the free spins right away and uses {cost} for this round. Continue?" Minimum-price text: "SECRET ENTRANCE unlocks from {min}. Raise the amount to unlock it." Hint: "Start the free spins directly for {mult}x the bet." (social: "play amount"). Button colour lemon, icon = a door with a keyhole.

## 6. Sound identity (WebAudio, no samples)

Shared chain: master 0.8, short spring reverb (convolver from a 0.35 s decaying noise burst, 12% wet), tremolo locked to the beat. Keep the existing `BEDS` shape (bpm, key, prog).

### 6.1 Base bed, 118 bpm, D dorian, 8 bars
Chords: Dm9 | Dm9 | G13 | G13 | Em7b5 A7b9 | Dm9 | Bb7#11 A7alt | Dm9.
- Walking bass (triangle + lowpass 600 Hz, quarters): bar1 D2 F2 A2 C3; bar2 D3 C3 A2 F2; bar3 G2 B2 D3 E3; bar4 F3 E3 D3 B2; bar5 E2 G2 A2 C#3; bar6 D2 A2 F2 A2; bar7 Bb2 D3 A2 C#3; bar8 D2 then rest.
- Vibraphone (sine + 4th partial at 0.2, decay 1.1 s, tremolo 5.5 Hz): off-beat comping, bar1 F4 A4 C5 E5, bar3 B3 F4 A4 E5, bar5 G4 Bb4 D5 F5, bar6 F4 A4 C5 E5.
- Surf guitar (sawtooth, bandpass 1.2 kHz Q 3, vibrato 7 Hz, spring reverb): bars 1-4 eighths D5 . F5 A5 . G5 F5 . / E5 D5 . C5 A4 -, tremolo-picked 16th holds, gliss D4 to D5 at end of bar 4.
- Bongos: high 420->330 Hz pitch-drop plus noise click, low 300->240 Hz; 16ths per bar H . H L . H L . H . H L . H L H, panned apart. Conga accent on beat 4.
- Brush hat: highpassed noise on off-beat eighths, gain 0.08, no kick.
- Brass stabs (two detuned saws, lowpass 1.6 kHz, 120 ms): D4 F4 A4 C5 on bar4 and bar8 beat 4.

### 6.2 Free-spins bed, 132 bpm, E dorian
Same chords a tone up (Em9, A13, F#m7b5 B7b9, C7#11 B7alt). 16th hat, doubled bongos, constant guitar tremolo at 0.1 gain, eighth-note bass in bars 7-8, brass stab every bar on beat 4-and. Riser (noise upsweep) when the meter passes x10. A vibraphone arpeggio steps up 1 semitone per 5 meter levels (cap +5).

### 6.3 SFX (existing names kept; new ones marked)
click (woodblock), spin (whoosh + hat), land (soft bongo tap), pop (pizzicato removal), win (vibraphone pentatonic run, pitch by combo), scatter (typewriter clack + telegraph ding), antic (snare roll under tremolo guitar), wire (new: relay click + beep, +1 semitone per node), tick (new: clock tick/tock, speeds up), defuse (new: snip + chime), explosion (noise burst, sine drop 200->40 Hz, cymbal, boing), stamp (new: thump + paper snap), mult (vibraphone ting, pitch by level), metermax (new), fsStart (brass fanfare + guitar gliss), retrigger (telegraph + brass), fsEnd (gliss + tada), bigwin (surf gliss + brass), kaching (rotary-phone bell), mascot_hop (boing), mascot_gasp (swanee whistle).

## 7. Title validation

Method: WebSearch only (weak on exact phrases). "Nothing found" is never "clear".
- **Agent Mambo**: CAUTION, low. No slot, app or trademark found. Near hits: "Mambo" (1989 Positive game for MS-DOS/Spectrum whose hero is a secret agent), "Mambo" (2016 shooter), Konami "Mambo a Go Go", Sega "Gacha Mambo!". Rockstar's "Agent" mark: sources conflict (abandoned 2018 vs renewal reports). Adjacent spy slots: Agent Destiny, Mission Cash (Play'n GO), Spy Girls (AGames). From memory, unverified: "Mambo" is also an Australian clothing brand and an old CMS name.
- Bongo Bureau: nothing found (Kongo Bongo, Tom Horn, shares a word).
- Velvet Cipher: nothing found (Velvet Bingo differs).
- Mambo Dossier and Atomic Mambo: nothing found, but carry the same "Mambo" echoes.
- Top Secret Tango: nothing found; "Operation: Tango" (Xbox spy game) is close, CAUTION.

Recommendation: keep Agent Mambo as the working title (CAUTION, low; the "Mambo" echo from a 1989 spy game is a real but old and obscure neighbour). Fallback with fewer echoes: Bongo Bureau. Human trademark search (classes 9, 28, 41; EUIPO/USPTO) still required.
Banned-terms check for the title and for all copy: Megaways, Boosted, Enhanced, RTP, Rush, Bonanza, Gates of, Olympus, Kraken, plus restricted social words and any "Stake Engine" branding: none present. Also banned from art and text: 007, Bond, Pink, Panther, Clouseau, Austin, Powers, English, Danger Mouse, Archer, Get Smart, Cone of Silence, shoe phone, Spy vs Spy, Evil, License to.

## 8. Store art concepts
- Tile 3:4 (768x1024): midnight indigo, huge pale-lemon crescent top-right, logo in the top third, Mambo waist-up in `bigwin` pose with the red DEFUSE button, beehive overlapping the crescent, skyline at the bottom with the bomb clock at 4/8, Safe, Bongos and Vinyl tilted in the corners, cream starburst behind her. Text: logo only.
- Cover 16:9 (1280x720): left 40% logo and Mambo (`happy`); right 60% a partly filled 6x5 board, a lit Z-shaped wire, two cells mid-blast with POW! stars, the lemon `x12` meter badge on the board edge, teal lair band on top. No RTP, no claims.

## 9. Player-facing copy (English; social-safe unless marked)

- Title: `game.title` "Agent Mambo". Loading: "Preparing the mission..." Connecting: "Checking your pass...".
- Modes: `mode.base` "Base Game"; `mode.bonus` "SECRET ENTRANCE"; `mode.freegame` "Mission Briefing Free Spins".
- Symbols: Vault Safe, Atomic Fizz, Hi-Fi Vinyl, Bongos, Fedora, Rotary Phone, Magnifier, Bow Tie, Mambo Star (Wild), Classified Dossier (Scatter).
- Free spins: `fs.trigger` "MISSION BRIEFING"; `fs.start` "{n} FREE SPINS"; `fs.retrigger` "INCOMING TELEGRAM: +{n} FREE SPINS"; `fs.end` "MISSION COMPLETE"; `fs.press` "Press to continue".
- Wire: `fx.fuse` -> `fx.wire` "WIRE!"; blast "DEFUSE!"; fizzle "TSSS..."; rule text: "A bomb-timer wire lights one cell at the start of a round and one more cell after each winning step. When no more wins are possible and 3 or more wire cells are lit, the lit cells (except scatters) are blasted out of the grid and new symbols drop in. No wild is created." (Math to confirm the counting rule.)
- Meter: "Mission Meter. During free spins it starts at x1. After each winning step it rises by 1 and it stays for the whole feature. Wins are multiplied by the current meter value. Highest level: x{cap}."
- Scatter rule: "4 or more Classified Dossiers start the free spins. 3 or more during the feature add more free spins."
- Wild rule: "The Mambo Star replaces all symbols except the Classified Dossier."
- Mode confirm and minimum text: see 5.4.
- Speech lines (5 per event, short, no restricted words):
  - idle: "Cool as a cucumber." / "Nobody saw me." / "Not even a ripple." / "Tick, tock, tap." / "Let's keep it groovy."
  - win: "Smooth!" / "That's the spirit." / "Right on cue." / "Tidy work." / "Nicely done."
  - bigwin: "Hold onto your hat!" / "Mission: fabulous!" / "Top secret, top score." / "Call the band!" / "Now THAT is a score."
  - shock: "Uh-oh." / "Is that a bomb?" / "My antenna!" / "Nobody panic." / "Tick tick..."
  - fsStart: "Briefing time." / "Into the lair!" / "Let's mambo." / "New file, new rules." / "Lights, dossier, action."
  - fsEnd: "Mission complete!" / "Debrief time." / "Case closed." / "That's a wrap." / "Same time tomorrow?"
  - lose/shrug: "Next one's the one." / "A small setback." / "Fizzled out." / "I'll reroute." / "Cover intact."
  - blast: "Defusing!" / "Press and pray." / "Clear the grid!" / "Boom, groove." / "Cutting the wire!"
  - meter: "Rising nicely." / "Dial's turning." / "Another notch." / "x{n}, darling." / "The needle likes me."

## 10. Task list per file (frontend_mambo)

Ownership rule: one agent per file; new CSS goes in the owner's own file, only the STYLES agent edits styles.css; only INTEGRATION edits render/index.js and main.js.

| Agent | Files | Tasks |
|---|---|---|
| MASCOT | src/render/mascot.js, mascot.css, mascot-dev.html, tools/art/bake_mambo.mjs, mambo_poses.json | Redraw per 2.3-2.4, keep POSES and `createMascot` API, small variant |
| SYMBOLS | src/render/symbols.js, dev.html | 10 new symbols (ids unchanged), SYM_COLOR from 4.1, keep `symbolMarkup`/`ensureSprite` |
| SCENE | src/render/scene.js, logo.js, index.html (title, loading markup only) | Layers 4.2, lair variant, logo 4.4, wire loading bar, `<title>` |
| FX | src/render/fx.js | New-palette stars, POW bubbles, confetti, `breakCell` pieces, dust, iris wipe, shake |
| WIRE | src/render/fuse.js -> wire.js, fuse.css -> wire.css, new meter.js + meter.css | Cable, lugs, clock readout, blast that REMOVES cells, fizzle; meter per 5.1 in three layouts; API `wire.path/burn/blast/fizzle`, `meter.set/pulse/max` |
| INTEGRATION | src/render/index.js, src/main.js, devbooks.js | Replace vein code with meter, map new math events (names from math/games/agent_mambo/game_events.py), pose mapping 2.4, holes for removed cells, game id `agent_mambo` |
| AUDIO | src/audio.js | BEDS 118/D dorian and 132/E dorian, voices 6.1-6.2, SFX 6.3, keep `audio.play`/mood API |
| STYLES | styles.css | Tokens 4.1, frame, panels, buttons, meter grid area, 4 viewports |
| TEXT | src/i18n/en.js, social.js, rules.js, replay.js, data/rules_data.json via tools/gen_rules_data.mjs, tests/text | Copy per 9, rules with meter and wire, restricted-word checks, point generator at agent_mambo |
| STORE | assets/store/*, tools/art/gen_store_art_mambo.mjs, render_store_art.mjs | Tile and cover per 8, PNG render, ART_PROVENANCE note |
| QA | tests/*, tools/mock-rgs, tools/build, fixtures | Fixtures from agent_mambo, word lists, shots at 4 viewports, no leftover "Gus", "mine", "fuse", "vein" |
| LEAD | frontend_mambo/CONTRACT.md | Rewrite for meter, wire and 100x Secret Entrance |

Open items for the math agent: wire event names and burnt-count reset rule, meter cap, whether meter applies before or after the +1, whether pay multiplier applies to a cluster or to the step, and hole/refill ordering in the blast tumble event.
