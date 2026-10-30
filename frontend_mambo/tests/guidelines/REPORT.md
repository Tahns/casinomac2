# Engine guideline QA report

Generated 2026-10-30T22:47:47.048Z by `node tests/guidelines/run.mjs`. Mock RGS books: see mock state.

Totals: 46 PASS, 0 FAIL, 1 AT RISK, 0 NEEDS A HUMAN.

## Verdicts

| Id | Check | Verdict |
|---|---|---|
| 31 | unleash: one press sends no play, dialog shows cost; cancel safe; confirm plays bonus | **PASS** |
| 77 | social=true: no restricted words in any visible text | **PASS** |
| 78 | XSC/XGC never show "$" | **PASS** |
| 104 | autoplay: one press sends no play, opens settings | **PASS** |
| 107 | sound toggle mutes everything | **PASS** |
| 171 | replay: no wallet calls, GET /bet/replay/{game}/{version}/{mode}/{event} | **PASS** |
| 172 | replay: Play button, no betting UI, replay-again after finish | **PASS** |
| 173 | replay: bet amount shown; cost>1x shows multiplier and real cost (bonus: 100x, 100.00) | **PASS** |
| 174 | replay at 400x225 fits without scroll | **PASS** |
| 181 | authenticate on load hits rgs_url with sessionID | **PASS** |
| 183 | /wallet/play {sessionID,amount,mode} | **PASS** |
| 187 | active round restores bet = round.amount after reload | **PASS** |
| 188 | replay fetch failure shows a message | **PASS** |
| 219 | currencies USD/EUR/CAD/MXN/JPY/XSC/XGC/XEC | **PASS** |
| 221 | no end-round after 0x, end-round after win | **PASS** |
| 222 | zero balance -> no /wallet/play (button, space, autoplay, unleash) + visible message | **PASS** |
| 223 | viewport meta + touch-action | **PASS** |
| 225 | social=true: rules/info/autoplay/confirm/settings wording (restricted words, same scan, rules screen only) | **PASS** |
| 227 | no scrollbars/scroll at 4 viewports (idle + after bet + rules open) | **PASS** |
| 228 | space bar places a bet, no page scroll, no double fire | **PASS** |
| 239 | lang=en: no keys/undefined/NaN/{...} (all screens) | **PASS** |
| 240 | lang=zz: no keys/undefined/NaN/{...} (all screens) | **PASS** |
| 242 | dynamic bet config (1.00-2.00, 4 levels, default in middle) | **PASS** |
| 243 | replay social=true: social wording, XSC amounts, no "$" | **PASS** |
| 273 | sub-cent payouts (bet 0.01 x 0.1x win = 0.001) are not shown as 0.00 | **PASS** |
| 274 | rgs_url=example.com (and bare host) -> error, no RGS call elsewhere | **PASS** |
| 275 | no "stake engine" text/branding in DOM/network/source | **AT RISK** |
| UNL-MIN-USD | UNLEASH below minimum (USD 50): disabled + "from" text + no play; at minimum: confirm dialog and bonus play | **PASS** |
| UNL-MIN-JPY | UNLEASH below minimum (JPY 7500): disabled + "from" text + no play; at minimum: confirm dialog and bonus play | **PASS** |
| UNL-MIN-MXN | UNLEASH below minimum (MXN 1000): disabled + "from" text + no play; at minimum: confirm dialog and bonus play | **PASS** |
| UNL-PRICE | UNLEASH cost label and confirm dialog show round values (bet x100) for every bet in the round ladder | **PASS** |
| CLICK-AFTER-FEATURE | after a free-spins round no overlay covers the controls (bet, sound, info stay clickable) | **PASS** |
| MENU-400x225 | compact landscape (400x225): MENU opens SOUND / INFO / FULLSCREEN and they work | **PASS** |
| MODAL-INERT | keyboard cannot act behind an open dialog (Tab stays inside the UNLEASH confirm, BET / BET+ / UNLEASH are inert, Space starts nothing) | **PASS** |
| 219b | CA$/MX$/XSC/JPY with large balance: no clipping of balance/bet/win at 4 viewports | **PASS** |
| RULES | rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer | **PASS** |
| REPLAY-LONG | replay of the longest bonus book in the fixtures finishes (seconds measured, >60 s flagged); speed control present? | **PASS** |
| WIN-base-loss | base mode, forced loss book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-base-win | base mode, forced win book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-base-bonus | base mode, forced bonus book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-base-retrigger | base mode, forced retrigger book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-base-maxwin | base mode, forced maxwin book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-bonus-bonus | bonus mode, forced bonus book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-bonus-retrigger | bonus mode, forced retrigger book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-bonus-maxwin | bonus mode, forced maxwin book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| EXT | no requests to external hosts (all sessions) | **PASS** |
| CONSOLE | no console errors / page errors during launch/play/replay | **PASS** |

## Evidence

### [31] unleash: one press sends no play, dialog shows cost; cancel safe; confirm plays bonus - PASS

- dialog visible=true text="SECRET ENTRANCE Take the secret entrance? This starts the free spins right away and costs $100.00 for this round. Continue? Stage Door Cost: $100.00 R"
- plays before confirm=0, after cancel=0, after OK=1 {"sessionID":"qa-a1i8h-31","amount":1000000,"mode":"bonus"}

### [77] social=true: no restricted words in any visible text - PASS

- screens: main, autoplay, unleash-confirm, info, info-tab0, info-tab1, info-tab2, info-tab3, info-tab4, info-tab5, info-tab6, settings, settings-tab7, settings-tab8, settings-tab9, settings-tab10, after-win, error-ERR_IPB, error-ERR_GEN, error-ERR_GLE, error-ERR_VAL
- visible hits: []
- words anywhere in DOM textContent (incl. hidden panels): []
- title: Agent Mambo

### [78] XSC/XGC never show "$" - PASS

- XSC: visible "$" in []; anywhere in DOM text=false
- XGC: visible "$" in []; anywhere in DOM text=false

### [104] autoplay: one press sends no play, opens settings - PASS

- plays=0, settings panel visible=true
- panel text: AUTOPLAY Number of spins 10 25 50 75 100 250 500 Stop on a big win Stop when the Mission Briefing free spins start Stop if balance falls bel

### [107] sound toggle mutes everything - PASS

- body.muted + master gain 0 / context not running
- before: {"ctx":["running"],"dest":["WaveShaperNode:x"],"muted":false,"graph":{"sources":2902,"audibleSources":67,"masterGains":2826},"media":[]}
- after toggle: {"ctx":["running"],"dest":["WaveShaperNode:x"],"muted":true,"graph":{"sources":2906,"audibleSources":0,"masterGains":2836},"media":[]}
- after another round while muted: {"ctx":["running"],"dest":["WaveShaperNode:x"],"muted":true,"graph":{"sources":2906,"audibleSources":0,"masterGains":2836},"media":[]}

### [171] replay: no wallet calls, GET /bet/replay/{game}/{version}/{mode}/{event} - PASS

- GET /bet/replay/the_unleashed_mine/1/bonus/3 {}

### [172] replay: Play button, no betting UI, replay-again after finish - PASS

- Play/Start button found=true
- replay-again button found after finish=true
- betting controls still visible: []
- text before play: WILD TOP SECRET TOP SECRET Agent Mambo A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O WILD TOP SECRET TOP S

### [173] replay: bet amount shown; cost>1x shows multiplier and real cost (bonus: 100x, 100.00) - PASS

- bonus replay text: WILD TOP SECRET TOP SECRET Agent Mambo A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O WILD TOP SECRET TOP SECRET SECRET ENTRANCE: $1.00 · 100x · REAL COST: $100.00 PLAY TURBO SKIP A G E N T M A M B O A G E N
- base replay text: WILD TOP SECRET TOP SECRET Agent Mambo A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O WILD TOP SECRET TOP S
- bet 1.00 shown=true, 100x shown=true, real cost 100.00 shown=true

### [174] replay at 400x225 fits without scroll - PASS

- {"sw":400,"cw":400,"sh":225,"ch":225,"sy":0}

### [181] authenticate on load hits rgs_url with sessionID - PASS

- POST /wallet/authenticate {"sessionID":"qa-a1i8h-181"}
- origin=http://localhost:5951

### [183] /wallet/play {sessionID,amount,mode} - PASS

- POST /wallet/play {"sessionID":"qa-a1i8h-183","amount":1000000,"mode":"base"}
- POST /wallet/end-round {"sessionID":"qa-a1i8h-183"}

### [187] active round restores bet = round.amount after reload - PASS

- bet display after load=$3.00, after reload=$3.00 (round.amount=3.00, default 1.00)
- POST /wallet/authenticate {"sessionID":"qa-a1i8h-187"}
- POST /wallet/end-round {"sessionID":"qa-a1i8h-187"}
- POST /wallet/authenticate {"sessionID":"qa-a1i8h-187"}
- POST /wallet/end-round {"sessionID":"qa-a1i8h-187"}

### [188] replay fetch failure shows a message - PASS

- text: WILD TOP SECRET TOP SECRET Agent Mambo A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O WILD TOP SECRET TOP SECRET BET: $1.00 · SECRET ENTRANCE RETRY TURBO SKIP Could no
- Play button still offered=false

### [219] currencies USD/EUR/CAD/MXN/JPY/XSC/XGC/XEC - PASS

- USD: balance="$12.34" bet="$1.00" expected "$12.34" 
- EUR: balance="€12.34" bet="€1.00" expected "€12.34" 
- CAD: balance="CA$12.34" bet="CA$1.00" expected "CA$12.34" 
- MXN: balance="MX$12.34" bet="MX$1.00" expected "MX$12.34" 
- JPY: balance="¥12" bet="¥1" expected "¥12" 
- XSC: balance="12.34 SC" bet="1.00 SC" expected "12.34 SC" 
- XGC: balance="12.34 GC" bet="1.00 GC" expected "12.34 GC" 
- XEC: balance="12.34 SC" bet="1.00 SC" expected "12.34 SC" 

### [221] no end-round after 0x, end-round after win - PASS

- 0x round: play=1 end-round=0
- win round: play=1 end-round=1
- POST /wallet/play {"sessionID":"qa-a1i8h-221","amount":1000000,"mode":"base"}
- POST /wallet/play {"sessionID":"qa-a1i8h-221","amount":1000000,"mode":"base"}
- POST /wallet/end-round {"sessionID":"qa-a1i8h-221"}

### [222] zero balance -> no /wallet/play (button, space, autoplay, unleash) + visible message - PASS

- messages by path: {"button":"modal:Insufficient balance. You need at least $1.00 to play this round.","space":"modal:Insufficient balance. You need at least $1.00 to play this round.","autoplay":"modal:Insufficient balance. You need at least $1.00 to play this round.","unleash":"modal:Insufficient balance. You need at least $100.00 to play this round."}
- play calls=0

### [223] viewport meta + touch-action - PASS

- meta=width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
- touch-action on #game=none
- body overflow=hidden

### [225] social=true: rules/info/autoplay/confirm/settings wording (restricted words, same scan, rules screen only) - PASS

- rules/info texts scanned: autoplay(937), unleash-confirm(1172), info(1818), info-tab0(1818), info-tab1(1917), info-tab2(1545), info-tab3(5425), info-tab4(2376), info-tab5(2275), info-tab6(1445), settings(754), settings-tab7(754), settings-tab8(944), settings-tab9(827), settings-tab10(815)
- hits: []

### [227] no scrollbars/scroll at 4 viewports (idle + after bet + rules open) - PASS

- 1024x576 idle: scroll=(0,0) doc 1024x576 vs 1024x576 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:1065x599","CANVAS:1065x599","lay:1065x599"]
- 1024x576 after-bet: scroll=(0,0) doc 1024x576 vs 1024x576 scrollbarW=0 overflow=hidden/hidden offscreen=["lay mv:1063x599","CANVAS:1063x599","lay mv:1062x599"]
- 1024x576 rules: scroll=(0,0) doc 1024x576 vs 1024x576 scrollbarW=0 overflow=hidden/hidden offscreen=["lay mv:1063x600","CANVAS:1063x600","lay mv:1062x600"]
- 400x225 idle: scroll=(0,0) doc 400x225 vs 400x225 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:416x234","CANVAS:416x234","lay:416x234"]
- 400x225 after-bet: scroll=(0,0) doc 400x225 vs 400x225 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:414x235","CANVAS:414x235","lay:413x235"]
- 400x225 rules: scroll=(0,0) doc 400x225 vs 400x225 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:414x235","CANVAS:414x235","lay:413x235"]
- 800x450 idle: scroll=(0,0) doc 800x450 vs 800x450 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:832x468","CANVAS:832x468","lay:832x468"]
- 800x450 after-bet: scroll=(0,0) doc 800x450 vs 800x450 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:830x468","CANVAS:830x468","lay:829x468"]
- 800x450 rules: scroll=(0,0) doc 800x450 vs 800x450 scrollbarW=0 overflow=hidden/hidden offscreen=["lay mv:830x468","CANVAS:830x468","lay mv:829x469"]
- 425x812 idle: scroll=(0,0) doc 425x812 vs 425x812 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:442x844","CANVAS:442x844","lay:442x844"]
- 425x812 after-bet: scroll=(0,0) doc 425x812 vs 425x812 scrollbarW=0 overflow=hidden/hidden offscreen=["lay:442x844","CANVAS:442x844","lay:442x843"]
- 425x812 rules: scroll=(0,0) doc 425x812 vs 425x812 scrollbarW=0 overflow=hidden/hidden offscreen=["lay mv:442x843","CANVAS:442x843","lay mv:442x842"]
- screenshots: tests/shots/qa_1024x576.png qa_400x225.png qa_800x450.png qa_425x812.png (one bet played before the shot where possible)

### [228] space bar places a bet, no page scroll, no double fire - PASS

- Space w/o focus -> plays=1; Space with button focused -> plays=1 (must be 1)
- keydown Space events: [{"code":"Space","key":" ","target":"BODY","prevented":true},{"code":"Space","key":" ","target":"BODY","prevented":true}]
- scrollY=0 scrollTop=0 activeElement=BODY

### [239] lang=en: no keys/undefined/NaN/{...} (all screens) - PASS

- screens scanned: main, autoplay, unleash-confirm, info, info-tab0, info-tab1, info-tab2, info-tab3, info-tab4, info-tab5, info-tab6, settings, settings-tab7, settings-tab8, settings-tab9, settings-tab10, after-bet, error-msg
- hits: []
- <html lang>=en

### [240] lang=zz: no keys/undefined/NaN/{...} (all screens) - PASS

- screens scanned: main, autoplay, unleash-confirm, info, info-tab0, info-tab1, info-tab2, info-tab3, info-tab4, info-tab5, info-tab6, settings, settings-tab7, settings-tab8, settings-tab9, settings-tab10, after-bet, error-msg
- hits: []
- <html lang>=en

### [242] dynamic bet config (1.00-2.00, 4 levels, default in middle) - PASS

- displayed bet sequence: ["$1.40","$1.70","$2.00","$2.00","$2.00","$2.00","$1.70","$1.40","$1.00","$1.00","$1.00","$1.00"]
- plus disabled at end=true, minus disabled at end=true
- JPY bet shown: ¥200 -> ¥500; play amount=500000000

### [243] replay social=true: social wording, XSC amounts, no "$" - PASS

- restricted hits: []
- "$" present=false
- text: WILD TOP SECRET TOP SECRET Agent Mambo A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O WILD TOP SECRET TOP SECRET SECRET ENTRANCE: 1.00 SC · 100x · REAL COST: 100.00 SC

### [273] sub-cent payouts (bet 0.01 x 0.1x win = 0.001) are not shown as 0.00 - PASS

- book 10199 payoutMultiplier=0.1x bet=0.01 -> exact win 0.001; displayed win="$0.001"; balance="$99.991"
- sub-cent payout=true

### [274] rgs_url=example.com (and bare host) -> error, no RGS call elsewhere - PASS

- requests to example.com: ["GET http://localhost:5951/index.html?sessionID=qa-a1i8h-274&rgs_url=example.com&lang=en&device=desktop","POST https://example.com/wallet/authenticate"]
- mock log entries: 0
- state=error error visible=true
- text=WILD TOP SECRET TOP SECRET Agent Mambo A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O A G E N T M A M B O W
- bare host rgs.test requests: ["GET http://localhost:5951/index.html?sessionID=qa-a1i8h-274&rgs_url=rgs.test&lang=en&device=desktop","POST https://rgs.test/wallet/authenticate"]
- idle after bare host=idle

### [275] no "stake engine" text/branding in DOM/network/source - AT RISK

- DOM hit=false
- network urls with "stake": []
- source "stake engine" hits: []
- other "stake" occurrences (check social wording): ["data/rules_data.json:497:  \"pGtStake\": 0.125172,","dist/front/data/rules_data.json:497:  \"pGtStake\": 0.125172,"]

### [UNL-MIN-USD] UNLEASH below minimum (USD 50): disabled + "from" text + no play; at minimum: confirm dialog and bonus play - PASS

- bet 0.1: reached=true disabled=true class has below-min=true cost label="from $50.00" dialog opened=false
- bet 0.2: reached=true disabled=true class has below-min=true cost label="from $50.00" dialog opened=false
- plays sent below minimum=0
- bet 0.5 (cost 50): reached=true disabled=false label="$50.00" confirm visible=true text="SECRET ENTRANCE Take the secret entrance? This starts the free spins right away and costs $50.00 for"
- plays after OK=1 {"sessionID":"qa-a1i8h-UNL-MIN-USD","amount":500000,"mode":"bonus"}

### [UNL-MIN-JPY] UNLEASH below minimum (JPY 7500): disabled + "from" text + no play; at minimum: confirm dialog and bonus play - PASS

- bet 50: reached=true disabled=true class has below-min=true cost label="from ¥7,500" dialog opened=false
- plays sent below minimum=0
- bet 75 (cost 7500): reached=true disabled=false label="¥7,500" confirm visible=true text="SECRET ENTRANCE Take the secret entrance? This starts the free spins right away and costs ¥7,500 for"
- plays after OK=1 {"sessionID":"qa-a1i8h-UNL-MIN-JPY","amount":75000000,"mode":"bonus"}

### [UNL-MIN-MXN] UNLEASH below minimum (MXN 1000): disabled + "from" text + no play; at minimum: confirm dialog and bonus play - PASS

- bet 5: reached=true disabled=true class has below-min=true cost label="from MX$1,000.00" dialog opened=false
- plays sent below minimum=0
- bet 10 (cost 1000): reached=true disabled=false label="MX$1,000.00" confirm visible=true text="SECRET ENTRANCE Take the secret entrance? This starts the free spins right away and costs MX$1,000.0"
- plays after OK=1 {"sessionID":"qa-a1i8h-UNL-MIN-MXN","amount":10000000,"mode":"bonus"}

### [UNL-PRICE] UNLEASH cost label and confirm dialog show round values (bet x100) for every bet in the round ladder - PASS

- bet 0.1: label="from $50.00"
- bet 0.2: label="from $50.00"
- bet 0.5: label="$50.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 1: label="$100.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 2: label="$200.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 5: label="$500.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 10: label="$1000.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 20: label="$2000.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 50: label="$5000.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"
- bet 100: label="$10000.00" dialog="SECRET ENTRANCE Take the secret entrance? This starts the fr"

### [CLICK-AFTER-FEATURE] after a free-spins round no overlay covers the controls (bet, sound, info stay clickable) - PASS

- controls: [{"id":"btn-bet","ok":true,"top":{}},{"id":"btn-sound","ok":true,"top":"btn-sound"},{"id":"btn-info","ok":true,"top":"btn-info"}]
- banner-layer class after the round: banner-layer

### [MENU-400x225] compact landscape (400x225): MENU opens SOUND / INFO / FULLSCREEN and they work - PASS

- sound visible before menu=false, after menu=true, info visible=true, sound toggled=true, rules open via menu=true

### [MODAL-INERT] keyboard cannot act behind an open dialog (Tab stays inside the UNLEASH confirm, BET / BET+ / UNLEASH are inert, Space starts nothing) - PASS

- dialog open=true, focus inside after 12 Tab=true, inert BET/BET+/UNLEASH=true/true/true
- bet before/after=$10.00/$10.00, plays sent=0, closed=true, [inert] left after closing=false

### [219b] CA$/MX$/XSC/JPY with large balance: no clipping of balance/bet/win at 4 viewports - PASS

- moderate balance clipped cases=0; 7-figure stress clipped cases=0
- [moderate 12,345.67] CAD 1024x576: balance="CA$12,305.67"(141/156) bet="CA$100.00"(102/102) win="CA$60.00"(96/156) unleash-cost="CA$10,000.00"(78/78)
- [moderate 12,345.67] CAD 400x225: balance="CA$12,575.67"(61/62) bet="CA$100.00"(51/62) win="CA$330.00"(61/62) unleash-cost="CA$10,000.00"(45/45)
- [moderate 12,345.67] CAD 800x450: balance="CA$12,265.67"(110/123) bet="CA$100.00"(75/77) win="CA$20.00"(75/123) unleash-cost="CA$10,000.00"(61/61)
- [moderate 12,345.67] CAD 425x812: balance="CA$12,255.67"(98/103) bet="CA$100.00"(123/156) win="CA$10.00"(81/82) unleash-cost="CA$10,000.00"(88/88)
- [moderate 12,345.67] MXN 1024x576: balance="MX$12,255.67"(145/156) bet="MX$100.00"(100/102) win="MX$10.00"(101/156) unleash-cost="MX$10,000.00"(80/80)
- [moderate 12,345.67] MXN 400x225: balance="MX$12,625.67"(59/62) bet="MX$100.00"(53/62) win="MX$380.00"(59/62) unleash-cost="MX$10,000.00"(47/47)
- [moderate 12,345.67] MXN 800x450: balance="MX$12,265.67"(113/123) bet="MX$100.00"(74/77) win="MX$20.00"(79/123) unleash-cost="MX$10,000.00"(63/63)
- [moderate 12,345.67] MXN 425x812: balance="MX$12,575.67"(101/103) bet="MX$100.00"(129/156) win="MX$330.00"(79/82) unleash-cost="MX$10,000.00"(91/91)
- [moderate 12,345.67] XSC 1024x576: balance="12,325.67 SC"(133/156) bet="100.00 SC"(102/102) win="80.00 SC"(89/156) unleash-cost="10,000.00 SC"(74/74)
- [moderate 12,345.67] XSC 400x225: balance="12,295.67 SC"(62/62) bet="100.00 SC"(47/62) win="50.00 SC"(50/62) unleash-cost="10,000.00 SC"(43/43)
- [moderate 12,345.67] XSC 800x450: balance="12,295.67 SC"(104/123) bet="100.00 SC"(75/77) win="50.00 SC"(70/123) unleash-cost="10,000.00 SC"(58/58)
- [moderate 12,345.67] XSC 425x812: balance="12,615.67 SC"(99/103) bet="100.00 SC"(115/156) win="370.00 SC"(80/82) unleash-cost="10,000.00 SC"(84/84)
- [stress 1,234,567.89] CAD 1024x576: balance="CA$1,234,847.89"(153/156) bet="CA$100.00"(102/102) win="CA$380.00"(109/156) unleash-cost="CA$10,000.00"(78/78)
- [stress 1,234,567.89] CAD 400x225: balance="CA$1,234,617.89"(62/62) bet="CA$100.00"(51/62) win="CA$150.00"(61/62) unleash-cost="CA$10,000.00"(45/45)
- [stress 1,234,567.89] CAD 800x450: balance="CA$1,234,907.89"(119/123) bet="CA$100.00"(75/77) win="CA$440.00"(85/123) unleash-cost="CA$10,000.00"(61/61)
- [stress 1,234,567.89] CAD 425x812: balance="CA$1,234,587.89"(100/103) bet="CA$100.00"(123/156) win="CA$120.00"(81/82) unleash-cost="CA$10,000.00"(88/88)
- [stress 1,234,567.89] MXN 1024x576: balance="MX$1,234,477.89"(147/156) bet="MX$100.00"(100/102) win="MX$10.00"(101/156) unleash-cost="MX$10,000.00"(80/80)
- [stress 1,234,567.89] MXN 400x225: balance="MX$1,234,517.89"(60/62) bet="MX$100.00"(53/62) win="MX$50.00"(56/62) unleash-cost="MX$10,000.00"(47/47)
- [stress 1,234,567.89] MXN 800x450: balance="MX$1,234,487.89"(122/123) bet="MX$100.00"(74/77) win="MX$20.00"(79/123) unleash-cost="MX$10,000.00"(63/63)
- [stress 1,234,567.89] MXN 425x812: balance="MX$1,234,837.89"(103/103) bet="MX$100.00"(129/156) win="MX$370.00"(79/82) unleash-cost="MX$10,000.00"(91/91)
- [stress 1,234,567.89] XSC 1024x576: balance="1,234,677.89 SC"(155/156) bet="100.00 SC"(102/102) win="210.00 SC"(102/156) unleash-cost="10,000.00 SC"(74/74)
- [stress 1,234,567.89] XSC 400x225: balance="1,234,517.89 SC"(60/62) bet="100.00 SC"(47/62) win="50.00 SC"(50/62) unleash-cost="10,000.00 SC"(43/43)
- [stress 1,234,567.89] XSC 800x450: balance="1,234,667.89 SC"(121/123) bet="100.00 SC"(75/77) win="200.00 SC"(79/123) unleash-cost="10,000.00 SC"(58/58)
- [stress 1,234,567.89] XSC 425x812: balance="1,234,487.89 SC"(102/103) bet="100.00 SC"(115/156) win="20.00 SC"(80/82) unleash-cost="10,000.00 SC"(84/84)

### [RULES] rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer - PASS

- info text length=18088; RTP-like percentages found: ["50.2","21.4","13.8","14.6","40.0","30.0","30.0","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00","96.00"]
- missing: []
- controls not mentioned in rules text: []

### [REPLAY-LONG] replay of the longest bonus book in the fixtures finishes (seconds measured, >60 s flagged); speed control present? - PASS

- longest bonus book: id 28078, 245 events, payout 228.4x
- normal-speed run not measured (set QA_REPLAY_NORMAL=1; previously about 250 s)
- SKIP pressed 1.5 s after Play: finished in 13.9 s; total shown: TOTAL WIN: $228.40
- banner-layer after the replay: banner-layer
- page errors: []

### [WIN-base-loss] base mode, forced loss book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 68753 payoutMultiplier=0x bet=$2.00 -> expected win $0.00; displayed win=$0.00; balance $4,998.00 (expected $4,998.00); round took 1s; final state idle=true
- renderer's last #win value before end-round request: $0.00 (matches); #win values seen: ["$0.00"]
- end-round calls=0 (expected 0)

### [WIN-base-win] base mode, forced win book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 99978 payoutMultiplier=4.4x bet=$2.00 -> expected win $8.80; displayed win=$8.80; balance $5,006.80 (expected $5,006.80); round took 5s; final state idle=true
- renderer's last #win value before end-round request: $8.80 (matches); #win values seen: ["$0.00","$1.40","$3.80","$8.80"]
- end-round calls=1 (expected 1)

### [WIN-base-bonus] base mode, forced bonus book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 76309 payoutMultiplier=5.5x bet=$2.00 -> expected win $11.00; displayed win=$11.00; balance $5,009.00 (expected $5,009.00); round took 21s; final state idle=true
- renderer's last #win value before end-round request: $11.00 (matches); #win values seen: ["$0.00","$8.00","$11.00"]
- end-round calls=1 (expected 1)

### [WIN-base-retrigger] base mode, forced retrigger book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 66204 payoutMultiplier=16.8x bet=$2.00 -> expected win $33.60; displayed win=$33.60; balance $5,031.60 (expected $5,031.60); round took 31s; final state idle=true
- renderer's last #win value before end-round request: $33.60 (matches); #win values seen: ["$0.00","$4.00","$20.00","$25.60","$33.60"]
- end-round calls=1 (expected 1)

### [WIN-base-maxwin] base mode, forced maxwin book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 23298 payoutMultiplier=5000x bet=$2.00 -> expected win $10,000.00; displayed win=$10,000.00; balance $14,998.00 (expected $14,998.00); round took 26s; final state idle=true
- renderer's last #win value before end-round request: $10,000.00 (matches); #win values seen: ["$0.00","$10,000.00"]
- end-round calls=1 (expected 1)

### [WIN-bonus-bonus] bonus mode, forced bonus book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 81291 payoutMultiplier=76.7x bet=$2.00 -> expected win $153.40; displayed win=$153.40; balance $4,953.40 (expected $4,953.40); round took 22s; final state idle=true
- renderer's last #win value before end-round request: $153.40 (matches); #win values seen: ["$0.00","$7.40","$24.40","$54.40","$153.40"]
- end-round calls=1 (expected 1)

### [WIN-bonus-retrigger] bonus mode, forced retrigger book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 43143 payoutMultiplier=51.5x bet=$2.00 -> expected win $103.00; displayed win=$103.00; balance $4,903.00 (expected $4,903.00); round took 44s; final state idle=true
- renderer's last #win value before end-round request: $103.00 (matches); #win values seen: ["$2.40","$4.20","$17.80","$22.80","$29.40","$70.40","$80.20","$103.00"]
- end-round calls=1 (expected 1)

### [WIN-bonus-maxwin] bonus mode, forced maxwin book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 60563 payoutMultiplier=5000x bet=$2.00 -> expected win $10,000.00; displayed win=$10,000.00; balance $14,800.00 (expected $14,800.00); round took 24s; final state idle=true
- renderer's last #win value before end-round request: $10,000.00 (matches); #win values seen: ["$0.00","$3,262.40","$8,182.40","$10,000.00"]
- end-round calls=1 (expected 1)

### [EXT] no requests to external hosts (all sessions) - PASS

- sessions=82
- external: []

### [CONSOLE] no console errors / page errors during launch/play/replay - PASS

- console errors: []
- page errors: []
- failed requests: []

## Static code review

### Hardcoded hosts / external http(s) URLs (should be none; RGS only via params.rgsUrl) - PASS

- none found

### localhost references (params.js only defaults a scheme-less LOCAL rgs_url to http://; no host is hardcoded) - PASS

- dist/front/src/params.js:13 (CORE): const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u);
- src/params.js:13 (CORE): const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u);

### External scripts/styles/fonts/CDN in HTML/CSS - PASS

- none found

### dev.html (RENDER harness, served from the same root) formats money with a literal "$" - delete before submission - AT RISK

- dev.html:36 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);
- fuse-dev.html:31 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);

### Fixed '$' symbol (currency symbol must come from money.js per currency) - PASS

- none found

### money.js symbol table lines (review XSC/XGC have no '$') - INFO

- dist/front/src/money.js:5 (CORE): USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],
- dist/front/src/money.js:6 (CORE): PHP: ['₱', 2], INR: ['₹', 2], IDR: ['Rp', 0], KRW: ['₩', 0], BRL: ['R$', 2], MXN: ['MX$', 2],
- dist/front/src/money.js:45 (CORE): return (neg ? '-' : '') + (meta.symbolAfter ? `${abs} ${meta.symbol}` : `${meta.symbol}${abs}`);
- src/money.js:5 (CORE): USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],
- src/money.js:6 (CORE): PHP: ['₱', 2], INR: ['₹', 2], IDR: ['Rp', 0], KRW: ['₩', 0], BRL: ['R$', 2], MXN: ['MX$', 2],
- src/money.js:45 (CORE): return (neg ? '-' : '') + (meta.symbolAfter ? `${abs} ${meta.symbol}` : `${meta.symbol}${abs}`);

### Fixed 2 decimals / /100 (JPY has 0 decimals; sub-cent payouts need more) - AT RISK

- dist/front/src/render/index.js:339 (RENDER): wrap.style.transformOrigin = `${X.o.toFixed(2)}px ${Y.o.toFixed(2)}px`;
- dist/front/src/render/layers/art.js:148 (RENDER): for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r
- dist/front/src/render/layers/art.js:149 (RENDER): const q = (v) => (v * s).toFixed(2);
- dist/front/src/render/layers/logic.js:168 (RENDER): export const fmtX = (x100) => (Math.round(Number(x100) || 0) / 100).toFixed(2);
- dist/front/src/replay.js:38 (TEXT): try { amountStr = formatMoney(amt, cur, { social: isSocial() }); } catch (e) { amountStr = (amt / MICRO).toFixed(2); }
- dist/front/src/replay.js:41 (TEXT): try { real = formatMoney(Math.round(amt * mult), cur, { social: isSocial() }); } catch (e) { real = ((amt * mult) / MICRO).toFixed
- dist/front/src/replay.js:184 (TEXT): try { totalStr = formatMoney(total, currency, { social: isSocial() }); } catch (e) { totalStr = (total / MICRO).toFixed(2); }
- src/render/index.js:339 (RENDER): wrap.style.transformOrigin = `${X.o.toFixed(2)}px ${Y.o.toFixed(2)}px`;
- src/render/layers/art.js:148 (RENDER): for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r
- src/render/layers/art.js:149 (RENDER): const q = (v) => (v * s).toFixed(2);
- src/render/layers/logic.js:168 (RENDER): export const fmtX = (x100) => (Math.round(Number(x100) || 0) / 100).toFixed(2);
- src/replay.js:38 (TEXT): try { amountStr = formatMoney(amt, cur, { social: isSocial() }); } catch (e) { amountStr = (amt / MICRO).toFixed(2); }
- src/replay.js:41 (TEXT): try { real = formatMoney(Math.round(amt * mult), cur, { social: isSocial() }); } catch (e) { real = ((amt * mult) / MICRO).toFixed
- src/replay.js:184 (TEXT): try { totalStr = formatMoney(total, currency, { social: isSocial() }); } catch (e) { totalStr = (total / MICRO).toFixed(2); }

### Micro-unit conversions outside money.js/bet.js (review) - AT RISK

- dist/front/src/replay.js:8 (TEXT): const MICRO = 1_000_000;
- src/replay.js:8 (TEXT): const MICRO = 1_000_000;

### end-round call sites (must be guarded: only payoutMultiplier > 0; never for 0x) - PASS

- dist/front/src/main.js:210 (CORE): if (S.renderer && round && round.state) await S.renderer.playBook(round.state, hooks()); ⏎ } ⏎  ⏎ async function settle(round) { ⏎ setState('settling'); ⏎ if (shouldEndRound(round)) { ⏎ const r = await rgs.endRound();
- src/main.js:210 (CORE): if (S.renderer && round && round.state) await S.renderer.playBook(round.state, hooks()); ⏎ } ⏎  ⏎ async function settle(round) { ⏎ setState('settling'); ⏎ if (shouldEndRound(round)) { ⏎ const r = await rgs.endRound();

### keydown listeners (Space must be on window, preventDefault called) - PASS

- listener dist/front/src/main.js:408 (CORE): window.addEventListener('keydown', (e) => {
- listener dist/front/src/main.js:427 (CORE): window.addEventListener('keyup', (e) => {
- listener dist/front/src/render/layers/dossier.js:134 (RENDER): window.addEventListener('keydown', onSkip, true);
- listener dist/front/src/rules.js:346 (TEXT): window.addEventListener('keydown', (e) => {
- listener src/main.js:408 (CORE): window.addEventListener('keydown', (e) => {
- listener src/main.js:427 (CORE): window.addEventListener('keyup', (e) => {
- listener src/render/layers/dossier.js:134 (RENDER): window.addEventListener('keydown', onSkip, true);
- listener src/rules.js:346 (TEXT): window.addEventListener('keydown', (e) => {
- preventDefault dist/front/src/main.js:412 (CORE): if (m.id === 'modal-settings') { e.preventDefault(); settingsDialog.close(); }
- preventDefault dist/front/src/main.js:413 (CORE): else if (m.id === 'modal-autoplay') { e.preventDefault(); closeModal(m); }
- preventDefault dist/front/src/main.js:414 (CORE): else if (m.id === 'modal-confirm') { e.preventDefault(); const c = $('confirm-cancel'); if (c) c.click(); }
- preventDefault dist/front/src/main.js:423 (CORE): if (d.prevent) e.preventDefault();
- preventDefault dist/front/src/main.js:429 (CORE): if (e.target && e.target.closest && e.target.closest('#btn-bet, #btn-unleash')) e.preventDefault();
- preventDefault src/main.js:412 (CORE): if (m.id === 'modal-settings') { e.preventDefault(); settingsDialog.close(); }
- preventDefault src/main.js:413 (CORE): else if (m.id === 'modal-autoplay') { e.preventDefault(); closeModal(m); }
- preventDefault src/main.js:414 (CORE): else if (m.id === 'modal-confirm') { e.preventDefault(); const c = $('confirm-cancel'); if (c) c.click(); }
- preventDefault src/main.js:423 (CORE): if (d.prevent) e.preventDefault();
- preventDefault src/main.js:429 (CORE): if (e.target && e.target.closest && e.target.closest('#btn-bet, #btn-unleash')) e.preventDefault();

### Space key handling lines - INFO

- dist/front/src/main.js:418 (CORE): if (e.code !== 'Space' && e.key !== ' ') return;
- dist/front/src/main.js:428 (CORE): if ((e.code !== 'Space' && e.key !== ' ') || params.replay || settings.capabilities.spacebar) return;
- src/main.js:418 (CORE): if (e.code !== 'Space' && e.key !== ' ') return;
- src/main.js:428 (CORE): if ((e.code !== 'Space' && e.key !== ' ') || params.replay || settings.capabilities.spacebar) return;

### HTML/CSS: viewport meta, title restrictions, overflow, touch-action - PASS

- viewport meta: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
- <title>: Agent Mambo
- <html lang>: en
- styles.css html,body overflow:hidden rule: true; height:100%: true; touch-action:none: true

### Network calls outside rgs.js (must be none; replay must not touch wallet) - AT RISK

- dist/front/src/render/index.js:437 (RENDER): fetch(new URL('../../data/rules_data.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((d) => { const c = d && N
- src/render/index.js:437 (RENDER): fetch(new URL('../../data/rules_data.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((d) => { const c = d && N

### src/i18n/social.js string values containing restricted words - PASS

- none found

## NEEDS A HUMAN (always)

- Real audio audibility on a device (graph-level mute is checked above).
- Visual quality of the four screenshots in `tests/shots/qa_*.png`.
- Touch behaviour on a real phone (pinch/double-tap zoom).

## Triage of remaining FAIL / AT RISK (hand-verified; appended to every generated report)

Isolation: every run spawns its own static server + mock RGS on free ports, one sessionID per test, mock state keyed by sessionID. Two full runs (and several parallel ones) give identical verdicts. The cross-talk FAILs seen earlier ([187] bet 1.00 vs 3.00, [221], [222], [219] 11.34 vs 12.34, [227], [104], [274]) were caused by sharing the fixed session `qa-session` / ports 5173+5180 with other agents; none reproduce in isolation.

| Check | Verdict | Real game bug? | Where / suggested fix | Owner |
|---|---|---|---|---|
| 219b (MXN, bet "MX$100.00") | FAIL | YES (reproduced by hand with Playwright) | `#bet` text is wider than its box: 28px text in a 27px box at 400x225 (font already shrunk to 4.5px, unreadable), 70px in 68px at 425x812 (11px). `src/main.js` `fitText()` (line ~46) stops shrinking at `fs*0.55` and the box clips (`overflow:hidden`). Fix: widen `.hud-bet`/`#bet` box in styles.css (>= 76px at 425x812, >= 32px at 400x225) or lower the floor / drop the currency prefix spacing; also ensure a readable minimum font size at 400x225. | STYLE (styles.css), WIRING (main.js fitText) |
| REPLAY-LONG | AT RISK | Design gap, not a failure | Longest fixture bonus book (id 46698, 320 events, 5000x) replays in ~250 s (350 s under CPU load) at normal speed. Replay hides the turbo button: `src/replay.js:8-9` HIDE list contains `#btn-turbo`. Suggested (optional, guideline [171] wants "exactly as it happened" by default): remove `#btn-turbo` from HIDE so the renderer's `setTurbo` (render/index.js:57) can fast-forward; test measures it automatically when a control exists. | TEXT (replay.js) |
| static: dev.html | AT RISK | Yes, packaging | `dev.html:31`, `fuse-dev.html:31` format money with literal `$` and sit in the submission root. Delete / move out of frontend/ before packaging. | RENDER |
| static: fixed 2 decimals / micro | AT RISK | Low | `src/replay.js:33,36,145` catch-block fallbacks use `(x/MICRO).toFixed(2)` (no symbol, wrong for JPY); only reached if formatMoney throws. | TEXT |

Timing: with turbo, a forced bonus round (WIN-bonus-*) takes 26-38 s; base-game rounds 1-3 s (bigwin 20-36 s).
