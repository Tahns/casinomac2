# Shell checks (WP1)

Generated 2026-10-30T16:29:45.699Z by `node tests/guidelines/shell.mjs`.

Totals: 14 PASS, 0 FAIL, 0 AT RISK.

| Id | Check | Verdict |
|---|---|---|
| G1 | settings dialog in every screen scan: 4 tabs, no keys / undefined / NaN, rules text present (lang en and zz) | **PASS** |
| G2 | settings dialog fits at 4 viewports on every tab: no page scroll, dialog inside the screen, internal scroll only | **PASS** |
| G3 | every control of the dialog, the gear and the replay gear is at least 24 x 24 CSS px (WCAG 2.5.8) | **PASS** |
| G4 | focus moves into the dialog, Tab stays inside, Escape / Close / backdrop return it to the opener (also from the compact menu) | **PASS** |
| G5 | no wallet call (or any RGS call) while the dialog is open: every control, Space, Enter; Space never spins; nothing starts behind it | **PASS** |
| G6 | replay: the settings gear is available at 4 viewports (also where the HUD column is hidden), opens the dialog, no wallet call | **PASS** |
| G7 | keyboard: gear by Enter, arrows / Home / End on tabs, Space toggles a switch (never a spin), arrows and Home / End on sliders, radios by arrows | **PASS** |
| G8 | social=true, currency XSC: dialog (all tabs), summary, door cards and gear have no restricted word and no "$" | **PASS** |
| FLAGS | all 12 jurisdiction flags honoured by the shell (each flag alone) | **PASS** |
| HERO | the heroine box stands LEFT of the grid and never overlaps the grid or a button at 1024x576, 800x450, 400x225, 425x812 | **PASS** |
| MOTION | Motion Auto follows prefers-reduced-motion live (emulateMedia); an explicit choice wins and persists | **PASS** |
| LEDGER | session summary: net position and time played follow the rounds (loss, win, Secret Entrance cost) and persist nothing | **PASS** |
| PICKER | Secret Entrance: one button, confirm shows the real cost, focus on Cancel, nothing pre-selected; three doors only when the data has them | **PASS** |
| PACE | minimumRoundDuration: autoplay and turbo never start a round earlier than t0 + minimum | **PASS** |

## Evidence

### [G1] settings dialog in every screen scan: 4 tabs, no keys / undefined / NaN, rules text present (lang en and zz) - PASS

- en: tabs=4 selected=1 dialog role/aria-modal/labelledby=["dialog","true",true] text length=8111
- zz: tabs=4 selected=1 dialog role/aria-modal/labelledby=["dialog","true",true] text length=8111

### [G2] settings dialog fits at 4 viewports on every tab: no page scroll, dialog inside the screen, internal scroll only - PASS

- 1024x576 sound: box [242,73,782,503] in 1024x576, doc 1024x576, internal scroll=false
- 1024x576 display: box [242,73,782,503] in 1024x576, doc 1024x576, internal scroll=false
- 1024x576 play: box [242,73,782,503] in 1024x576, doc 1024x576, internal scroll=false
- 1024x576 info: box [242,73,782,503] in 1024x576, doc 1024x576, internal scroll=true
- 400x225 sound: box [12,11,388,214] in 400x225, doc 400x225, internal scroll=true
- 400x225 display: box [12,11,388,214] in 400x225, doc 400x225, internal scroll=true
- 400x225 play: box [12,11,388,214] in 400x225, doc 400x225, internal scroll=false
- 400x225 info: box [12,11,388,214] in 400x225, doc 400x225, internal scroll=true
- 800x450 sound: box [130,21,670,429] in 800x450, doc 800x450, internal scroll=false
- 800x450 display: box [130,21,670,429] in 800x450, doc 800x450, internal scroll=false
- 800x450 play: box [130,21,670,429] in 800x450, doc 800x450, internal scroll=false
- 800x450 info: box [130,21,670,429] in 800x450, doc 800x450, internal scroll=true
- 425x812 sound: box [13,126,412,686] in 425x812, doc 425x812, internal scroll=false
- 425x812 display: box [13,126,412,686] in 425x812, doc 425x812, internal scroll=false
- 425x812 play: box [13,126,412,686] in 425x812, doc 425x812, internal scroll=false
- 425x812 info: box [13,126,412,686] in 425x812, doc 425x812, internal scroll=true

### [G3] every control of the dialog, the gear and the replay gear is at least 24 x 24 CSS px (WCAG 2.5.8) - PASS

- 1024x576 sound: 9 controls, smallest 28 px
- 1024x576 display: 12 controls, smallest 28 px
- 1024x576 play: 7 controls, smallest 28 px
- 1024x576 info: 10 controls, smallest 28 px
- 1024x576: gear [39,39] (menu open [39,39]) too small: []
- 400x225 sound: 9 controls, smallest 26 px
- 400x225 display: 12 controls, smallest 26 px
- 400x225 play: 7 controls, smallest 26 px
- 400x225 info: 10 controls, smallest 26 px
- 400x225: gear [0,0] (menu open [34,34]) too small: []
- 800x450 sound: 9 controls, smallest 28 px
- 800x450 display: 12 controls, smallest 28 px
- 800x450 play: 7 controls, smallest 28 px
- 800x450 info: 10 controls, smallest 28 px
- 800x450: gear [30,30] (menu open [30,30]) too small: []
- 425x812 sound: 9 controls, smallest 28 px
- 425x812 display: 12 controls, smallest 28 px
- 425x812 play: 7 controls, smallest 28 px
- 425x812 info: 10 controls, smallest 28 px
- 425x812: gear [45,45] (menu open [45,45]) too small: []

### [G4] focus moves into the dialog, Tab stays inside, Escape / Close / backdrop return it to the opener (also from the compact menu) - PASS

- 1024x576 close by Escape: focus in=true Tab trapped=true/true closed=true focus after=btn-settings (want btn-settings) inert left=false
- 1024x576 close by close: focus in=true Tab trapped=true/true closed=true focus after=btn-settings (want btn-settings) inert left=false
- 1024x576 close by backdrop: focus in=true Tab trapped=true/true closed=true focus after=btn-settings (want btn-settings) inert left=false
- 800x450 close by Escape: focus in=true Tab trapped=true/true closed=true focus after=btn-settings (want btn-settings) inert left=false
- 800x450 close by close: focus in=true Tab trapped=true/true closed=true focus after=btn-settings (want btn-settings) inert left=false
- 800x450 close by backdrop: focus in=true Tab trapped=true/true closed=true focus after=btn-settings (want btn-settings) inert left=false
- autoplay panel: focus in=true, Escape returns to btn-autoplay; Secret Entrance confirm: focus on confirm-cancel, Escape returns to btn-unleash

### [G5] no wallet call (or any RGS call) while the dialog is open: every control, Space, Enter; Space never spins; nothing starts behind it - PASS

- RGS calls while the dialog was used: 0 []
- state after: idle
- autoplay + dialog open: plays 1 -> 1 over 2.5 s (must not grow)

### [G6] replay: the settings gear is available at 4 viewports (also where the HUD column is hidden), opens the dialog, no wallet call - PASS

- 1024x576: gear 34x34 clickable=true label="SETTINGS" dialog opened=true tabs=3 mute works=true focus back=replay-settings wallet calls=0
- 400x225: gear 34x34 clickable=true label="SETTINGS" dialog opened=true tabs=3 mute works=true focus back=replay-settings wallet calls=0
- 800x450: gear 34x34 clickable=true label="SETTINGS" dialog opened=true tabs=3 mute works=true focus back=replay-settings wallet calls=0
- 425x812: gear 34x34 clickable=true label="SETTINGS" dialog opened=true tabs=3 mute works=true focus back=replay-settings wallet calls=0

### [G7] keyboard: gear by Enter, arrows / Home / End on tabs, Space toggles a switch (never a spin), arrows and Home / End on sliders, radios by arrows - PASS

- ok   Enter on the gear opens the dialog, focus on the selected tab
- ok   ArrowRight -> Display (automatic activation)
- ok   End -> Info
- ok   ArrowRight wraps to Sound
- ok   Home -> Sound
- ok   Space toggles the mute switch (and the sound button follows)
- ok   Enter toggles it back
- ok   slider ArrowRight x2 -> 77
- ok   PageDown lowers further (67)
- ok   End -> 100
- ok   Home -> 0
- ok   aria-valuetext at 0 is "Off"
- ok   radio group: ArrowRight picks Full
- ok   two more arrows -> Still (data-motion=still)
- ok   Tab reaches the display controls: st-panel-display,st-motion-still,st-flash,st-contrast,st-ledger,st-close,st-tab-display
- ok   Space with nothing focused inside the dialog starts no round
- ok   Escape closes, focus back on the gear
- ok   Space spins again once the dialog is closed (a round per press, no double)

### [G8] social=true, currency XSC: dialog (all tabs), summary, door cards and gear have no restricted word and no "$" - PASS

- restricted words: []; "$" present: false; SC amounts shown: true; three door cards scanned: true; text length 10461

### [FLAGS] all 12 jurisdiction flags honoured by the shell (each flag alone) - PASS

- ok   disabledFullscreen hides the fullscreen button only
- ok   disabledTurbo hides the turbo button
- ok   ... and the Turbo row of the Play tab only
- ok   disabledAutoplay hides the autoplay button
- ok   ... and the Autoplay row only
- ok   both shortcuts off: the Play tab disappears (3 tabs)
- ok   disabledBuyFeature hides and disables the Secret Entrance button (so no dialog, no doors)
- ok   disabledSlamstop -> capabilities.slamstop=false and body.no-slam (the event player, WP4, reads it)
- ok   disabledSuperTurbo -> capabilities.superTurbo=false
- ok   replay: SKIP shown=true; with disabledSuperTurbo SKIP=false, TURBO stays=true
- ok   disabledSpacebar: Space starts nothing (0, with SPIN focused 0), keydown prevented=true
- ok   disabledSpacebar: Enter on SPIN still works
- ok   displayNetPosition: summary shown even though the player switched it off (true), switch locked on (true), cannot be switched off (true)
- ok   displaySessionTimer: summary shown even though the player switched it off (true), switch locked on (true), cannot be switched off (true)
- ok   displayRTP: RTP line in the Info tab: Expected return (RTP): 96.00% in every mode.
- ok   no displayRTP: no RTP line (the Modes and RTP section is always there)
- ok   minimumRoundDuration 2500: next round possible after 2629 ms with turbo on
- ok   socialCasino: social wording without the URL parameter

### [HERO] the heroine box stands LEFT of the grid and never overlaps the grid or a button at 1024x576, 800x450, 400x225, 425x812 - PASS

- 1024x576: mode=left crop=full box 177x272 at (6,298) hidden=false v1 mascot box retired=true overlaps=[] left of the grid=true in view=true page scroll=false
- 400x225: mode=left crop=head box 70x57 at (2,166) hidden=false v1 mascot box retired=true overlaps=[] left of the grid=true in view=true page scroll=false
- 800x450: mode=left crop=full box 139x213 at (5,232) hidden=false v1 mascot box retired=true overlaps=[] left of the grid=true in view=true page scroll=false
- 425x812: mode=corner crop=bust box 69x99 at (4,601) hidden=false v1 mascot box retired=true overlaps=[] left of the grid=true in view=true page scroll=false

### [MOTION] Motion Auto follows prefers-reduced-motion live (emulateMedia); an explicit choice wins and persists - PASS

- ok   default: data-motion=full
- ok   OS reduce -> Auto becomes calm and flashes reduced, live
- ok   calm switches the idle bob off (animation-name none)
- ok   OS back to no-preference -> full
- ok   Auto stays selected while the OS changes
- ok   explicit Full beats the OS reduce
- ok   Full keeps the idle bob although the OS asks for reduced motion (bob)
- ok   Still persisted over a reload
- ok   prefers-contrast: more -> data-contrast=more

### [LEDGER] session summary: net position and time played follow the rounds (loss, win, Secret Entrance cost) and persist nothing - PASS

- ok   visible by default, net 0.00: $0.00
- ok   after a 0x round at 2.00 the net is -2.00: -$2.00
- ok   after a win of 2.1x the net is 0.20: shown "+$0.20"
- ok   time played runs (0:04 -> 0:06)
- ok   a reload starts a new session: net back to 0.00 (nothing stored)
- ok   storage keys are whitelisted only: []

### [PICKER] Secret Entrance: one button, confirm shows the real cost, focus on Cancel, nothing pre-selected; three doors only when the data has them - PASS

- ok   exactly one Secret Entrance button
- ok   focus on Cancel
- ok   today: only Stage Door (the math for the others does not exist): ["bonus"]
- ok   nothing pre-selected
- ok   real cost 100.00 shown: SECRET ENTRANCE Take the secret entrance? This starts the free spins right away and costs $100.00 for this round. Contin
- ok   no countdown or pressure wording
- ok   opening it sends no play
- ok   three doors in the data: 3 cards, none selected, Confirm off until a door is chosen, focus on Cancel
- ok   the chosen door is the mode played: ["entrance_blackout"]

### [PACE] minimumRoundDuration: autoplay and turbo never start a round earlier than t0 + minimum - PASS

- autoplay + turbo, minimum 2500 ms: 2 rounds in 8 s, gaps between /wallet/play calls [2648] ms

## Console

- console errors: []
- page errors: []
- external requests: []
