# 09 - Theme, lore and names: the "top secret" direction (Agent Mambo v2)

Date 2026-10-26. Angle: an ORIGINAL 1960s cartoon spy-jazz agency: lore, adult cast, mission names, symbol upgrades, UI vocabulary, sound motifs, rules voice, and a naming sheet with collision screening.

Screening aid only. NOT legal advice, NOT a trademark clearance. "Found nothing" never means free to use; a human IP attorney must search real registers (USPTO, EUIPO, WIPO, UKIPO; classes 9, 28 and 41 at least) before any name ships. Reddit was not reachable and is not cited. All art and sound stay hand-built in code, adult characters only, no deceptive design, no copied rival names, art or sound.

## 0. Method and limits
- Tools: WebSearch (US-only; returns a model-written summary of results) and WebFetch (small-model summary of one page). About 55 searches and 17 page fetches (4 failed: USPTO shell, TMview 503, Justia 403, SlotCatalog 404; the Mission: Impossible Wikipedia URL also 404ed) on 2026-10-26.
- Registers could NOT be searched. The USPTO search page returned only a heading [S30]; EUIPO TMview returned 503; Justia's own search returned 403; SlotCatalog search returned 404. The only registry-like hits are aggregator pages (Justia, Trademarkia, uspto.report) surfaced by web searches limited to those domains. They are incomplete and can be stale. There is no EUIPO, WIPO, UKIPO or INPI data in this file at all.
- Evidence: strong = page read, claim visible; medium = a specific page named in a search summary; weak = absence ("no result"). Every "found nothing" below is weak by construction.
- Other agents' working names are reused where useful: 03_multi_bonus.md (BRIEFING, DEMOLITION RUN, LOCKED CASE, SEARCHLIGHT, COVER BLOWN) and 02_variable_grids.md (layout names). Mechanics stay theirs; this file only names and dresses them.
- "Ultracode" in the brief is read here as "ultra-secret plus cipher". The word itself is taken (section 7, row 3).

## 1. Bottom line
1. Concept: Agent Mambo works for THE MEZZANINE BUREAU, a spy outfit that officially does not exist, run from an unlisted mezzanine floor above a jazz club in SAN SYNCOPA, 1962. Tone: deadpan paperwork swung to a 4/4 beat. Stamps, redaction bars, hat-check dead drops, cipher wheels. Props blow up, never people; no weapons, no minors.
2. "Spy" alone is thin but not empty (14 spy titles in the earlier scan, 07_competitive_scan.md). The ownable angle is bureaucracy-as-jazz, not tuxedos and martinis (07 lists those as clichés).
3. Hard rejects with evidence: Ultracode (barcode name marked with the registered symbol), Dead Air (firearm-silencer brand), Switchboard Shuffle (a 2026 Playdate game about a 1960s operator), Penthouse (adult-magazine brand), Baron von Static (DC "Static" plus Marvel's Baron Von Blitzschlag). See section 7.
4. Secret-HQ entrances are taken: tailor shop (U.N.C.L.E., Kingsman) and phone booth (Get Smart) [S6, S8, S3]. Ours is the hat-check hatch of the club. The cloakroom as a secret entrance was not found in the sources read; that is absence, not clearance.
5. Disguises as pay symbols are taken: Agent Jane Blonde (Microgaming, Stormcraft) shows four of her disguises as high-paying symbols [S20]. Mambo's mission outfits stay animation only.
6. Cast (all adults): Mambo (kept), The Registrar, Dr. Odile Brasswick, Cora Vestry, Professor Pianissimo. Section 2.
7. Seven missions named (five from 03 renamed in theme, two optional extras), plus symbol upgrades in four art-only layers. Section 3.
8. Clearance = the NAMED BANDS of the Mission Meter, read as tempo marks (Largo, Andante, Allegro, Presto). It is a readout of a result, never a promise or a mode that implies better odds. Section 4.
9. Every shortlisted string passes the Engine/social word screen (script run, section 7). Substring traps (stakeout, payload, alphabet, discredit) are listed so nobody adds them later.
10. Five existing mascot lines in `frontend_mambo/src/i18n/en.js` are soft nudges and should change (section 4.3).
11. Sound: motif list plus an avoid list (section 5). The free-spins bed (E dorian, tremolo guitar, brass stabs, per DESIGN.md) sits close to documented Bond-theme markers (E minor, surf-style guitar, big band [S1]); key and timbre are not what makes a theme protectable, but a human ear-check against the reference tracks is required. We cannot run audio similarity here.
12. "Mambo" has two meanings to respect: a Cuban dance and music form from the late 1930s, popularised by Perez Prado [S12], and, in Haitian Creole, a Vodou priestess title (translation note on a Justia record [S18], weak-medium). Keep to the music meaning: no religious imagery, no caricature.

## 2. Lore bible
### 2.1 World
- THE MEZZANINE BUREAU: public face is a frosted door lettered OFFICE OF POLITE INQUIRIES on the unlisted mezzanine of the Blue Octave jazz club. Motto (working): "Discretion, in four-four." Where the Bureau's budget comes from is never explained in game text (money words are on the social filter list).
- SAN SYNCOPA: the night-owl city. Skyline, rooftops and the club exterior are the base scene (DESIGN.md section 4.2).
- Villain plot, one line for the rules page: Professor Pianissimo wants the whole city quiet. Each mission foils one step.
- Everything the player sees is paperwork: DOSSIER (scatter), STAMP (result), REDACTION BAR (locked or loading), CIPHER WHEEL (a reveal that spins), DEAD DROP (collect-in-round token, never across rounds: the platform is stateless).

### 2.2 Cast (adult, original working names; none found as spy characters, weak)
| Character | Role in play | Look (flat shapes, 1962) | Voice and gag | Sound cue |
|---|---|---|---|---|
| Mambo (Mabel "Mambo" Fontaine) | Lead; unchanged. Base outfit per 00_USER_DIRECTIVES: tailored suit, gloves, sober glamour; beehive antenna stays | Beehive plus teal suit; no trench, no tux | Deadpan; stays calm while props pop | Periscope-up motif |
| The Registrar (signed "I. Plimsoll") | Gives the assignment: the cosmetic mission reveal (03 allows reveal only, never a pick) and the rules page | A silhouette behind frosted glass, a hand with a rubber stamp; never a face | Speaks only in telegram strips and stamps | Bass clarinet two-note plus stamp thud |
| Dr. Odile Brasswick | Gadget keeper: the symbol re-skins and gadget props | Round goggles pushed up, lab coat, sub-basement workshop | Cheerful, props explode, "that was supposed to do that" | Marimba run, spring boing |
| Cora Vestry | Hat-check keeper and dead-drop contact; host of the entrance hatch and Cloakroom Caper | Pillbox hat, ticket roll, brass bell | Knows every coat in the city | Desk-bell ding, paper slide |
| Professor Pianissimo | Villain (alt: Madame Sordina). Harmless, no weapons | Tall, thin, giant volume knob on a cane, hushes with a finger | Fussy, whispers; his music literally gets quieter | Fade-down motif |
- Not carried over from DESIGN.md: Barnaby Pluck (whiskers plus fuss, near Clouseau) and Tibby Stilts (suit plus cool, near Bond).
- Adult check: all five are adults by design (proportions, jobs, clothes). No sidekick kids, no teen agents (Spy Kids and Totally Spies are the genre's minor-led neighbours, from memory; avoid).

### 2.3 Gadgets and props (drawn in code)
- Beehive periscope antenna and lid (exists).
- The Compact: a powder compact that opens into a periscope and radio. Generic object, no named brand.
- A seltzer siphon replaces the cone cocktail glass; hat-box replaces the drum attache case. Reason: Mission X (Uppercut) shows a cocktail and a briefcase (07 section 4.3).
- Cipher wheel: brass desk toy, cosmetic reveal only.
- Hi-fi console: Dr. Brasswick's workshop; the mission-select backdrop.
- Rejected props: shoe phone, pen communicator, cone of silence, gadget cane, fedora with eyeholes (all named in S3, S4, S6).

### 2.4 Wardrobe per mission (follows 00_USER_DIRECTIVES; sober versions; fictional insignia)
| Mission | Outfit | Watch-out |
|---|---|---|
| Base game, tile, cover | Tailored suit (pencil skirt or high-waist trousers), narrow tie, gloves; pillbox or no hat (a fedora over a beehive reads badly) | Directive 4 in 00: sober version for tile and cover |
| Mission Briefing | Same suit, lair lighting | none |
| The Long Fuse | Teal coverall, work gloves, goggles | Loose cut; no catsuit (Mrs. Peel type) |
| Ballroom Blackout | Floor-length sheath gown, high neck, long sleeves | No slit, no low neckline (Engine [217]) |
| Cloakroom Caper | Hat-check uniform and pillbox hat | none |
| Cipher Salon | Glamorous lab coat over the suit | none |
| Sealed Orders | Belted raincoat and soft hat | Trench plus hat is the Clouseau/Gadget silhouette: pick a colour and cut that differ (teal belted raincoat, no collar-up) |
| Night Beat (optional) | 1960s patrol uniform: jacket, calot, whistle | Insignia is a brass staircase-and-rest glyph of the Bureau; never a real force, country or service |
- Outfit changes behind a curtain screen, no nudity. They are animation only (Jane Blonde point above).

## 3. Missions (bonus rounds): names, beats, hooks
Names are story nouns, with no price words and none of Rush, Boost, Super, Hyper, Intel (Engine [213], 07 section 6). Mechanics belong to 02/03; the "hook" column is the visible idea only.
| Name | Aligns with (03/02) | Story beat | Visible hook | Outfit |
|---|---|---|---|---|
| MISSION BRIEFING (exists; alt THE BRIEFING) | BRIEFING, plain ratchet | The Registrar assigns the case | Iris wipe to the lair, stamp MISSION START | suit |
| THE LONG FUSE | DEMOLITION RUN | Pianissimo planted a fuse under the club | Fuse crawls the whole board, plunger button | coverall |
| SEALED ORDERS | LOCKED CASE | The result stays in a sealed envelope until the file is opened | Envelope grows, stamp SEALED then OPENED | raincoat |
| BALLROOM BLACKOUT | SEARCHLIGHT | Lights out at the gala | A spotlight roams a dark ballroom | gown |
| COVER BLOWN (alt MIDNIGHT UNMASKING) | COVER BLOWN | The guests unmask at midnight | Masks lift off symbols one by one | gown |
| CLOAKROOM CAPER (optional) | collector idea, no math yet | Cora's tickets lead to the villain's coat | Numbered hooks fill with tickets (dead drops, in-round only) | pillbox hat |
| CIPHER SALON (optional) | wheel reveal, no math yet | A salon of cipher discs | Brass wheel clicks to a result already in the book | lab coat |
- Optional cameo: NIGHT BEAT (police outfit directive). Finale name pool, only if a rare top mission exists: OPERATION FADE-OUT.
- Board name pool (replaces "Penthouse"): Lobby, Mezzanine, Atrium, Annex, Ballroom, Rooftop, Sub-Basement. Mezzanine = the home 6x5 board.
- Entrance doors (modes in index.json; shown as written, so no forbidden words): SECRET ENTRANCE stays the umbrella; per-mission doors STAGE DOOR, SERVICE STAIRS, COAT CHECK, FREIGHT ELEVATOR. All pass the word screen. Never name a mode buy/bonus buy/super bet [225].
- The Registrar's "assignment" for a natural trigger is a reveal stamp of a result already in the book. Never a pick, never skill language (cipher wheel = animation).

### 3.1 Symbol upgrades (art and names only; set, weights and wins stay with the math)
| Layer | What changes | Rule |
|---|---|---|
| A. Shape retunes | H2 Atomic Fizz becomes SELTZER SIPHON (cone glass echoes Mission X's cocktail; "Atomic Fizz" is also a craft-soda trade name in local news [S39]); attache case becomes a HAT-BOX; keep Vault Safe, Hi-Fi Vinyl, Bongos, Fedora, Rotary Phone, Magnifier, Bow Tie | Keep silhouettes distinct at 40 px (DESIGN.md section 3) |
| B. Clearance skins | All ten symbols re-inked together by dial band: FILED (plain ink), STAMPED (corner stamp), EMBOSSED (foil edge), OFFSET PRINT (rainbow misregistration); a 300 ms stamp-down when the band changes | Same skin on every symbol so a low symbol never looks "golden"; win table shows base art with the line "The art changes with the dial. The wins do not." |
| C. Mission skins | Cloakroom Caper: symbols hang on hooks. Ballroom Blackout: dim silhouettes that light under the spotlight, but identity stays readable at rest so wins are verifiable. Cipher Salon: engraved discs. Sealed Orders: envelope-corner stamp. The Long Fuse: scorch marks along the burnt path | Art only unless 03 gives a rule; each skin explained on the Features tab [26] |
| D. Wild and scatter | Mambo Star: antenna ping ring when it joins a win. Classified Dossier: flap lifts on the third | Cues follow the book events only; never on a non-triggering board as a tease |
- Win-table captions (Index voice, all pass the word screen): Vault Safe "Contents: classified."; Seltzer Siphon "Handle with seltzer."; Hi-Fi Vinyl "Side B holds the cipher."; Bongos "Rhythm section, on call."; Fedora "Brim down, cover up."; Rotary Phone "Party line, private matters."; Magnifier "Small print, large clues."; Bow Tie "Dressed to file."; Mambo Star "Wild. Substitutes for everything but dossiers." The wins themselves are generated from the math, never typed [24].
- Caption rule: no "shaken, not stirred" echo, no gun, no money, cash or coin words.

## 4. UI vocabulary
Rule: factual sentence first, flavour second. Functional labels stay plain (Balance, Play/Bet, Win, Autoplay, Turbo, Sound) so [26], [235] and social review stay easy. Voice lives in banners, stamps, tooltips and subtitles.
### 4.1 Terms
| Term | Where | Standard copy | Social note and rule |
|---|---|---|---|
| Briefing | Free-spin intro | MISSION BRIEFING, "{n} free spins" on a telegram strip | none |
| Clearance (meter bands) | Mission Meter dial | LARGO, ANDANTE, ALLEGRO, PRESTO printed as tempo marks around the dial; band edges come from the math | Readout of the current multiplier only. Never "unlocked better odds" |
| Dossier | Scatter, info pages | CLASSIFIED DOSSIER; info subtitle "The Index" under the plain tab "Win table" | "Paytable" is forbidden in social; keep "Win table" |
| Stamp: DECLASSIFIED | Round returns MORE than the total play | Thump plus cream starburst | Only when win > total play (UKGC RTS 14F in 04/06) |
| Stamp: FILED | Return > 0 but <= total play | Quiet tap, amount plain, no confetti, no fanfare | Not a celebration. Not a win banner |
| Stamp: SEALED / OPENED | Sealed Orders | Envelope stamp | none |
| Redaction bar | Loading, locked Secret Entrance | Black bars over text, "unlocks from {min}" | Never over a win amount, odds, RTP or rules text. Never a "so close" tease |
| Cipher wheel | Reveal animation | "Decoding..." then result, auto-runs, skippable | No input, no pick. Same result whatever the player taps |
| Dead drop | Cloakroom Caper | "Ticket {n} filed" | In-round counter only (stateless) |
| Telegram | Retrigger, notices | INCOMING TELEGRAM, "+{n} FREE SPINS" | none |
| Debrief | End of feature | MISSION COMPLETE: total, spins played, peak meter | Plain figures only |
| File number | Replay id | "File No. {id}" next to the replay badge | Replay must still show the play amount [172] |
- Banned echoes: "Eyes Only" and "For Your Eyes Only" (Bond title, memory, unverified), "This message will self-destruct" (Mission: Impossible, the self-destruct clock opened each episode [S2]), "Cone of Silence", "Shaken", "Agent 99/86" numbering, CONTROL/KAOS/THRUSH/SPECTRE/ISIS-style acronym agencies [S3, S6, S9].

### 4.2 Big-win flavour lines (subtitle under the standard word; headline words stay BIG, MEGA, SUPER, EPIC, MAX)
DESIGN.md has "Smooth Operator" (Sade, 1984 song title [S36], phrase also generic), "Mission Accomplished" and "Atomic Score". Replace with: BIG "Filed Under Fabulous"; MEGA "Cleared for Applause"; SUPER "Top Drawer"; EPIC "Stamped and Sealed"; MAX "File Closed, Mambo Style". All pass the word screen. Each line only appears when the standard banner does, i.e. above the return thresholds.

### 4.3 Audit of current `en.js` voice lines (read-only)
| Key | Line | Issue | Suggested |
|---|---|---|---|
| mascot.lose.1 | "Next one's the one." | Implies a win is due (gambler's fallacy), a nudge | "Cover intact." |
| mascot.fsEnd.5 | "Same time tomorrow?" | Return-visit nudge | "Debrief done." |
| mascot.fsEnd.3 | "Case closed." | Common idiom; also an anime title (memory, unverified) | "File closed." |
| mascot.big.2 | "Mission: fabulous!" | Faint echo of "Mission: Impossible" | "Fabulous, darling." |
| mascot.wire.2 | "Press and pray." | Religious aside; mild | "Press and hum." |
- Fine as is: "Cover intact.", "A small setback.", "Tidy work.", "x{n}, darling.", "Hold onto your hat!". Confirm with the Engine text tests (`tests/text`) after edits.

## 5. Sound motifs (WebAudio, synthesized, no samples, no AI)
| Motif | Where | Build | Notes |
|---|---|---|---|
| Periscope Up (Mambo) | Idle to win, mascot cue | Vibraphone plus muted-trumpet synth, rising fourth then a step, swung eighths, one rest | Candidate melody, NOT checked against any melody database |
| The Registrar | Assignment, info page | Bass-clarinet synth (filtered square plus breath noise), two low notes, stamp thud, paper rustle | Avoid a muted-trombone "wah" for adult voices (Peanuts trope, memory) |
| Pianissimo fade | Villain beats, bad-news cues | Soft celesta plus pizzicato, music ducks to 30 percent of the user's mix | Duck is relative to the sliders; Mute stays absolute [107] |
| Cipher decode | Cipher wheel | Marimba cascade plus teletype ticks; seeded from book ids so replays sound identical | none |
| Dead drop | Cloakroom Caper | Desk-bell ding, envelope slide (filtered noise) | Avoid coin sounds in non-win moments |
| Clearance step | Meter band change | Stamp thud, then bed key rises a semitone (existing mult cue) | Band change, not a tease |
| Fuse | Wire | Relay click plus beep, tempo rises (existing) | none |
| Redaction | Locked entrance, loading | Marker squeak plus soft thud | none |
- Avoid list, documented markers of famous spy music: the Bond theme is E minor with a surf-style guitar figure and big-band brass [S1]; the Mission: Impossible theme is in 5/4 (Morse-code derived) [S2]; the Pink Panther theme is a tenor-sax lead in E minor with a jazz big band [S5]; Peter Gunn is a bass-register ostinato, 4/4 [S11]. So: no 5/4 or 3+2 accent pattern, no repeated low riff under a twangy lead, no creeping solo tenor sax, and no Mambo No. 5 or Tequila brass riffs (Mambo No. 5 dates from 1950 [S12]).
- Free-spins bed: move off E-tonic plus tremolo twang plus brass stabs (suggest F# or A dorian, clean-tone guitar or vibraphone lead). Verify by ear with a human.
- Slider cross-reference: the audio buses and sliders are specified in 06_menu_audio_settings.md; this file adds only the names of cues.

## 6. Rules and win-table voice (sample copy)
Factual sentence first. `{...}` are runtime fills from the math, never shipped as text [239]. Words work in both normal and social mode unless marked.
```
HOW WINS WORK
Clusters of {minCluster} or more matching symbols touching side by side win. Bigger clusters win more. See the Win table.
Winning symbols are filed away and new ones drop in. Keep tumbling until nothing matches.
THE FUSE
A fuse burns along the board with each winning step. When nothing more matches and enough of it has burnt, Mambo
presses the plunger and the burnt cells are blasted away. Scatters stay. The fuse never makes a wild.
THE MISSION METER
Each winning step turns the dial by {step}, up to x{cap}. In a mission it never goes back down.
Clearance bands (Largo, Andante, Allegro, Presto) name the dial's range. They change the look, not the odds.
CLASSIFIED DOSSIERS (scatters)
{n} or more Classified Dossiers anywhere open a Mission Briefing: {spins} free spins. {r} or more during the feature add more.
SECRET ENTRANCE (not in social: "get the feature")
Take the secret entrance? This starts the mission right away and uses {cost} for this round. Continue?
Unlocks from {min}. Raise the {bet|play} amount to unlock it.
STAMPS
A stamp or banner appears only when a round returns more than the amount played. Every round is independent.
BUTTONS
GO starts a round. AUTO opens a settings panel and starts nothing by itself. TURBO shortens animations only.
SOUND mutes everything. SETTINGS holds volume sliders and display choices.
```
- Social swaps (from the Engine list in 00_ENGINE_SELFCHECK_PROMPT.md): bet to play, total bet to total play, pays to wins, paytable to Win table, cost of to can be played for. The `unleash.confirm` line already follows this.
- The [185] general warning text goes in verbatim; the voice never rewrites it.
- RTP, max win and cost per mode come from the final lookup tables [25][27][266]. Do not hand-type them.

## 7. NAMING SHEET
Status: S = safe-ish shortlist (nothing found, weak), C = caution (keep only after counsel), R = reject (evidence or rule). "Web" = WebSearch on the exact name; "Agg" = search limited to trademark aggregator sites. Neither replaces a register search.
| # | Name | Role | Searched | Found | Status | Ev. |
|---|---|---|---|---|---|---|
| 1 | Agent Mambo | Title (keep) | Web x3, Agg x3 | No slot or mark with the exact words. Near: "Mambo" 1989 spy game by Positive [S19]; "Mambo Madness", a Bally 2004 three-reel slot (search summary); JAMBO MAMBO, an XP Foundry application covering downloadable games and online entertainment, listed active [S16]; PARROT MAMBO (drones, classes 9 and 28) and MAMBO SPEAKERS (class 9, pending) [S17]. Rockstar's "Agent" mark: renewed 2013 and 2017, then abandoned by Nov 2018 per Wikipedia, dates conflict [S23] | C | medium |
| 2 | Mambo (word, as a brand family) | Wild, logo | Agg x2 | Many unrelated MAMBO marks (flowers, tyres, clothing); see row 1 for class 9/41 neighbours | C | weak |
| 3 | Ultracode | Brief word | Web x1 | Registered-style name of a colour 2D barcode symbology; ISO/IEC CD 25449 [S13] | R | medium |
| 4 | Dead Air | Villain plan | Web x2, Agg x1 | DEAD AIR SILENCERS, Reg. 5988660 (firearm silencers) [S15]; weapon link clashes with "no weapons" | R | medium |
| 5 | The Mezzanine Bureau | Agency #1 | Web x1, Agg x2 | Nothing exact. Near: "Le Bureau des Legendes" (TV "The Bureau") [S26]; MEZZANINE marks for clothing (cancelled) and finance | S | weak |
| 6 | Office of Polite Inquiries | Door lettering | Web x1 | Nothing | S | weak |
| 7 | Bureau of Syncopation | Agency alt | Web x1 | Nothing (a 1942 film "Syncopation" exists) | S | weak |
| 8 | Bureau of Quiet Affairs | Agency alt | Web x1 | Nothing. Near: "Bureau of Special Affairs" (Pathfinder, fictional) [S26]. Clashes with the "quiet" villain | C | weak |
| 9 | San Syncopa | City | Web x1 | Nothing | S | weak |
| 10 | Mabel "Mambo" Fontaine | Lead's full name | Web x1 | Nothing. Near: children's book "Mabel Opal Pear and the Rules for Spying" (minor lead) | S | weak |
| 11 | The Registrar (I. Plimsoll) | Boss | Web x2 | No spy by that name; generic title | S | weak |
| 12 | Dr. Odile Brasswick | Gadgets | Web x1 | Nothing | S | weak |
| 13 | Cora Vestry | Hat-check | Web x1 | Nothing (only the word "vestry") | S | weak |
| 14 | Professor Pianissimo | Villain | Web x1, Agg x1 | Nothing as a character. PIANISSIMO marks cover music technology (Acoustica piano software, cancelled; Steinway silent-piano system) [S25] | S | weak |
| 15 | Madame Sordina | Villain alt | Web x1, Agg x1 | Nothing | S | weak |
| 16 | Baron von Static | Villain | Web x1 | No exact hit, but concept neighbours: DC's "Static" and Marvel's Baron Von Blitzschlag (electric villain) [S27] | R | medium |
| 17 | The Flat Notes | Villain org | Web x1 | Nothing; not needed | C | weak |
| 18 | Mission Briefing | Free spins (exists) | Web x1, Agg x1 | No slot title. Low-quality pages tie "Mission Briefing Document" to the scatter of "Mission Uncrossable" (unreliable). "Mission" prefix is in rival vocabulary (Mission X, 07) | C | weak |
| 19 | The Briefing (alt, drops "Mission") | Free spins alt | none | Not searched | C | none |
| 20 | Mission Meter | Meter (exists) | Web x1 | No title. Patent families for "multiplier meter" exist (US11735009) [S38], a mechanic question for 01, not a name one | C | weak |
| 21 | Clearance Dial | Meter alt name | Web x1 | Nothing | S | weak |
| 22 | Clearance Largo / Andante / Allegro / Presto | Meter bands | none (generic tempo terms) | Common music words; weak as marks, so nothing exclusive either | S | none |
| 23 | Classified Dossier | Scatter (exists) | Web x1, Agg x1 | Nothing. DOSSIER is a registered mark for lubricants (unrelated) | S | weak |
| 24 | Secret Entrance | Entry mode (exists) | Web x1, Agg x1 | No title. Mikohn patents on slot bonuses with no on-screen indicator (US6929545) differ from a priced, confirmed door [S37] | C | weak |
| 25 | Stage Door / Service Stairs / Coat Check / Freight Elevator | Door mode names | Web x1 | Nothing as slot modes (generic building words) | S | weak |
| 26 | Mambo Star | Wild (exists) | Web x1, Agg x1 | Nothing; "Mambo Madness" neighbour (row 1) | S | weak |
| 27 | The Fuse / Fuse Line | Wire feature | Web x1 | No slot. Realistic Games' "Fireworks" has a fuse that burns under the reels [S32] | S | weak |
| 28 | The Long Fuse | Mission | Web x1 | Nothing | S | weak |
| 29 | Sealed Orders | Mission | Web x1, Agg x1 | Nothing as a slot (generic phrase) | S | weak |
| 30 | Ballroom Blackout | Mission | Web x1, Agg x1 | Nothing | S | weak |
| 31 | Cover Blown | Mission | Web x1 | No slot found; idiom. Jane Blonde and Spy Girls surfaced as spy neighbours | S | weak |
| 32 | Cloakroom Caper | Mission | Web x1, Agg x1 | Nothing; itch.io puzzle "Cloakroom" is a different title [S33] | S | weak |
| 33 | Cipher Salon | Mission | Web x1, Agg x1 | Nothing; CIPHER marks exist for security services, class 45 | S | weak |
| 34 | Night Beat | Police mission | Web x1 | Nothing (Beat Cop, CCTV Rush Hour are other titles) | S | weak |
| 35 | Operation Fade-Out | Finale pool | Web x1 | Nothing | S | weak |
| 36 | Demolition Run | Old 03 name | Web x1 | Nothing exact; NetEnt "Demolition Squad" (2012) [S34] | C | weak |
| 37 | Switchboard Shuffle | Operator mission | Web x2 | Playdate puzzle, 1960s telephone operator, first published 2026-04-14 [S14] | R | medium |
| 38 | Midnight Switchboard | Operator alt | Web x1 | Nothing | S | weak |
| 39 | Penthouse | Old 02 board name | Web x1 | Adult-magazine brand, enforced by Penthouse Global Media [S24] | R | medium |
| 40 | "Vault 7" style safe numbering | Old safe idea | Fetch x1 | WikiLeaks "Vault 7" CIA document series, March 2017 [S22]; avoid "Vault" plus a digit | R | strong |
| 41 | Smooth Operator | Old big-win line | Web x1 | Sade song, 1984 [S36] | C | medium |
| 42 | Mission Accomplished, Case Closed | Old lines | none | Common idioms; both carry brand or political baggage (memory, unverified) | C | none |
| 43 | Tailor-shop or phone-booth HQ entrance | Lore | Fetch x3 | U.N.C.L.E. (Del Floria's tailor shop), Kingsman (tailor), Get Smart (S6, S8, S3) | R | strong |
| 44 | Intel, Rush, Boost, Super, Hyper | Vocabulary | rules | Mission X names (07); Engine [213] title bans | R | strong |
| 45 | Blue Octave | Club name in lore | Web x1 | Nothing under that name (other Blue-named jazz clubs exist: Blue Note, Blue Room, Blue Jazz Club). Endorphina's "IN JAZZ" is a jazz slot, different name | S | weak |
| 46 | "Discretion, in four-four." | Motto (working) | Web x1 | No page uses the phrase | S | weak |
| 47 | Atomic Fizz | Old H2 name | Web x1 | "Atomic Fizz Soda Pop", a craft-soda business [S39]; no slot | C (rename) | medium |
| 48 | Seltzer Siphon, Hat-box, Vault Safe, Hi-Fi Vinyl | Symbol names | Web x1 | Nothing under these names; "The Vault" slots exist (Realistic Games and others) | S | weak |
- Word screen: `python3 -I docs/research2/09_wordscreen.py` (whole-word match against the social list in 00_ENGINE_SELFCHECK_PROMPT.md, substring traps flagged, plus the title bans and Mission X vocabulary). All 104 strings in the script (names, doors, stamps, symbol captions, flavour lines) pass except the five deliberate traps: Stakeout (stake), Payload (pay), Alphabet and Better (bet), Discredit (credit). Penthouse, Dead Air and Ultracode pass the word screen and are rejected for other reasons. The screen is a regex, not the Stake review.
- Collision hits of record are listed in this sheet; absence from these searches is not clearance. The three biggest unknowns are class 9/41 MAMBO neighbours (row 1), any EUIPO/UKIPO marks, and Spanish- or French-market meanings.

## 8. Originality guard rails (what the neighbours own, as seen)
| Neighbour | Seen (source) | Our distance | Rule |
|---|---|---|---|
| James Bond | E minor theme, surf-style guitar, 1962 big band [S1] | Female deadpan lead, no tux, no gun barrel | No twang riff; no "double"-numbered agents |
| Mission: Impossible | 5/4 theme; self-destruct clock [S2] | Fuse is a plunger gag, not a tape | No 5/4; no self-destruct line |
| Get Smart | CONTROL, KAOS, Agent 99, the Chief, shoe phone, Cone of Silence [S3] | Registrar, Bureau, compact | None of those words or props |
| Secret Squirrel | 1965 Hanna-Barbera; "International Sneaky Service"; fez sidekick Morocco Mole; purple fedora with eyeholes [S4] | Adult woman, no animal | No "Sneaky", no mole, no eyehole hat |
| Spy vs Spy | 1961 MAD strip; black and white beaked pair [S7] | Single lead | No paired black/white spies |
| U.N.C.L.E. | Tailor-shop entrance; pen communicator; THRUSH [S6] | Hat-check hatch | No tailor, no pen radio |
| Kingsman | Tailor cover; Arthurian codenames [S8] | Suit is Mambo's own outfit, not a cover | No tailor shop; no code-name theme |
| Archer | ISIS; "phrasing" gag [S9] | Not parody-of-parody | No "phrasing" gag |
| Austin Powers | Dr. Evil, Mini-Me, 1960s styling [S10] | Flat cartoon, no innuendo | No innuendo names |
| Pink Panther | Mancini theme, sax [S5] | Mambo/jazz | No creeping sax |
| Agent Jane Blonde | Disguises as top symbols [S20] | Outfits animation-only | Do not pay for disguises |
| Agent Destiny | 1950s-60s pulp pin-up spy slot, 5,000x cap [S21] | Cartoon, deadpan | Keep the look flat and cartoonish |
| Mission X (Uppercut) | Cocktail, watch, briefcase, Intel Rush (07) | Siphon, hat-box, no "Intel" | Keep "Mission" out of title and logo |
- Not searched (named from general knowledge only): Danger Mouse, Inspector Gadget, OSS 117, Modesty Blaise, Mrs. Peel, Honey West, Johnny English, Charlie's Angels. Carmen Sandiego (red coat, wide hat, from memory) was fetched but the page did not confirm the costume. Ask the attorney to review the character sheet against these.
- Real-world: no real agency names or seals (CIA, MI6, KGB, Stasi, NSA, Bletchley, Enigma), no real operations, no real people's or jazz musicians' surnames for characters.

## 9. Open questions and human steps
1. IP attorney: real searches of rows 1, 2, 5, 14, 18, 24 in classes 9, 28, 41 across USPTO, EUIPO, WIPO and UKIPO; character-likeness review (section 8); the music ear-check.
2. Engine/Stake review of the Mambo wardrobe against [217] and [253]; tile and cover use the sober base outfit.
3. Decide: keep "Mission Meter" and "Mission Briefing" or move to "Clearance Dial" and "The Briefing" (lower overlap with Mission X, 07).
4. Cloakroom Caper and Cipher Salon need math sponsors (03). Without them they remain skins for existing missions.
5. Native-speaker read of the names in French and Spanish. Not done.
6. Bands of the dial (where Largo ends and Presto starts) must come from the final meter ladder; do not invent them.
7. Which mascot lines to change in `en.js` is a front-end decision; this file only flags.

## Sources
S1 https://en.wikipedia.org/wiki/James_Bond_Theme (fetched; "Bond chord" not confirmed there, only E minor, guitar figure, big band)
S2 https://faroutmagazine.co.uk/mission-impossible-countdown-to-action/ (search summary: 5/4 from Morse; self-destruct clock; the Wikipedia page 404ed)
S3 https://en.wikipedia.org/wiki/Get_Smart (fetched)
S4 https://en.wikipedia.org/wiki/Secret_Squirrel (fetched)
S5 https://en.wikipedia.org/wiki/The_Pink_Panther_Theme (fetched; no chromatic bass line confirmed)
S6 https://en.wikipedia.org/wiki/The_Man_from_U.N.C.L.E. (fetched, first 100k characters)
S7 https://en.wikipedia.org/wiki/Spy_vs._Spy (fetched)
S8 https://en.wikipedia.org/wiki/Kingsman_(franchise) (fetched, first 100k characters)
S9 https://en.wikipedia.org/wiki/Archer_(TV_series) (fetched, first 100k characters)
S10 https://en.wikipedia.org/wiki/Austin_Powers (fetched)
S11 https://en.wikipedia.org/wiki/Peter_Gunn_(song) and https://faroutmagazine.co.uk/peter-gunn-tv-crime-guitar-riff/ (search summaries)
S12 https://en.wikipedia.org/wiki/Mambo_(music) (fetched)
S13 https://www.mhlnews.com/transportation-distribution/article/22041199/just-when-everyone-said-bar-codes-were-dead and https://www.iso.org/standard/90433.html (search summaries)
S14 https://play.date/games/switchboard-shuffle/ (search summary)
S15 https://trademarks.justia.com/885/04/dead-air-88504432.html (aggregator, may be stale)
S16 https://trademarks.justia.com/973/41/jambo-97341764.html (aggregator, may be stale)
S17 https://uspto.report/TM/98118231 ; https://trademarks.justia.com/791/91/parrot-79191280.html (aggregators)
S18 https://trademarks.justia.com/858/07/mambo-85807069.html (aggregator; translation note, cancelled mark)
S19 https://archive.org/details/msdos_Mambo_1989
S20 https://casinobeats.com/2018/07/18/launch-agent-jane-blonde-returns-microgaming/ (search summary)
S21 https://europeangaming.eu/portal/press-releases/2020/05/07/70135/set-a-date-with-destiny-in-the-brand-new-playn-go-slot-agent-destiny
S22 https://en.wikipedia.org/wiki/Vault_7 (fetched)
S23 https://www.thesixthaxis.com/2013/07/23/take-two-renews-agent-trademark/ ; https://en.wikipedia.org/wiki/Agent_(video_game)
S24 https://www.prnewswire.co.uk/news-releases/penthouse-global-media-acquires-penthouse-magazine-and-all-trademarked-assets-569615821.html
S25 https://trademarks.justia.com/777/41/pianissimo-77741557.html (aggregator)
S26 https://pathfinderwiki.com/wiki/Bureau_of_Special_Affairs ; https://en.wikipedia.org/wiki/List_of_The_Bureau_episodes
S27 https://en.wikipedia.org/wiki/Baron_Von_Blitzschlag ; https://www.dc.com/characters/static
S30 https://tmsearch.uspto.gov/search/search-information (returned only a heading: tool cannot search)
S32 https://www.intergameonline.com/igaming/products/fireworks-realistic-games
S33 https://garrit-video-game-dev.itch.io/cloakroom
S34 https://www.prnewswire.co.uk/news-releases/net-entertainment-launches-demolition-squad-video-slot-146229265.html
S36 https://en.wikipedia.org/wiki/Smooth_Operator
S37 https://patents.google.com/patent/US6929545 (Mikohn hidden-bonus family, summary only)
S38 https://patents.justia.com/patent/11735009 (multiplier meter, summary only)
S39 https://www.kshb.com/entertainment/kcl/lifestyle-kcl/interview-with-the-founders-of-atomic-fizz (search summary)
Script: docs/research2/09_wordscreen.py (word screen, reproducible)
Repo files read: docs/research2/00_USER_DIRECTIVES.md, 00_ENGINE_SELFCHECK_PROMPT.md, 02_variable_grids.md, 03_multi_bonus.md, 06_menu_audio_settings.md, 07_competitive_scan.md; docs/mambo/DESIGN.md; frontend_mambo/src/i18n/en.js and social.js.
