# Engine guideline QA report

Generated 2026-10-22T07:17:28.482Z by `node tests/guidelines/run.mjs`. Mock RGS books: see mock state.

Totals: 37 PASS, 0 FAIL, 2 AT RISK, 0 NEEDS A HUMAN.

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
| 219 | currencies USD/EUR/CAD/MXN/JPY/XSC/XGC | **PASS** |
| 221 | no end-round after 0x, end-round after win | **PASS** |
| 222 | zero balance -> no /wallet/play (button, space, autoplay, unleash) + visible message | **PASS** |
| 223 | viewport meta + touch-action | **PASS** |
| 225 | social=true: rules/info/autoplay/confirm wording (restricted words, same scan, rules screen only) | **PASS** |
| 227 | no scrollbars/scroll at 4 viewports (idle + after bet + rules open) | **PASS** |
| 228 | space bar places a bet, no page scroll, no double fire | **PASS** |
| 239 | lang=en: no keys/undefined/NaN/{...} (all screens) | **PASS** |
| 240 | lang=zz: no keys/undefined/NaN/{...} (all screens) | **PASS** |
| 242 | dynamic bet config (1.00-2.00, 4 levels, default in middle) | **PASS** |
| 243 | replay social=true: social wording, XSC amounts, no "$" | **PASS** |
| 273 | sub-cent payouts (bet 0.01 x 0.1x win = 0.001) are not shown as 0.00 | **PASS** |
| 274 | rgs_url=example.com (and bare host) -> error, no RGS call elsewhere | **PASS** |
| 275 | no "stake engine" text/branding in DOM/network/source | **AT RISK** |
| 219b | CA$/MX$/XSC/JPY with large balance: no clipping of balance/bet/win at 4 viewports | **AT RISK** |
| RULES | rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer | **PASS** |
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

- dialog visible=true text="UNLEASH UNLEASH starts the Unleashed Mine free spins directly and costs $100.00 for this round. Continue? CANCEL CONFIRM"
- plays before confirm=0, after cancel=0, after OK=1 {"sessionID":"qa-session","amount":1000000,"mode":"bonus"}

### [77] social=true: no restricted words in any visible text - PASS

- screens: main, autoplay, unleash-confirm, info, info-tab0, info-tab1, info-tab2, info-tab3, info-tab4, info-tab5, info-tab6, after-win, error-ERR_IPB, error-ERR_GEN, error-ERR_GLE, error-ERR_VAL
- visible hits: []
- words anywhere in DOM textContent (incl. hidden panels): []
- title: The Unleashed Mine

### [78] XSC/XGC never show "$" - PASS

- XSC: visible "$" in []; anywhere in DOM text=false
- XGC: visible "$" in []; anywhere in DOM text=false

### [104] autoplay: one press sends no play, opens settings - PASS

- plays=0, settings panel visible=true
- panel text: AUTOPLAY Number of spins 10 25 50 75 100 250 500 Stop on a big win Stop when Unleashed Mine free spins start Stop if balance falls below CAN

### [107] sound toggle mutes everything - PASS

- body.muted + master gain 0 / context not running
- before: {"ctx":["running"],"dest":["DynamicsCompressorNode:x"],"muted":false,"graph":{"sources":379,"audibleSources":8,"masterGains":369},"media":[]}
- after toggle: {"ctx":["running"],"dest":["DynamicsCompressorNode:x"],"muted":true,"graph":{"sources":380,"audibleSources":0,"masterGains":374},"media":[]}
- after another round while muted: {"ctx":["running"],"dest":["DynamicsCompressorNode:x"],"muted":true,"graph":{"sources":394,"audibleSources":0,"masterGains":388},"media":[]}

### [171] replay: no wallet calls, GET /bet/replay/{game}/{version}/{mode}/{event} - PASS

- GET /bet/replay/the_unleashed_mine/1/bonus/3 {}

### [172] replay: Play button, no betting UI, replay-again after finish - PASS

- Play/Start button found=true
- replay-again button found after finish=true
- betting controls still visible: []
- text before play: W TNT The Unleashed Mine THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE BET: $1.00 · Base Game PLAY REPLAY The Unleashed Mine The U

### [173] replay: bet amount shown; cost>1x shows multiplier and real cost (bonus: 100x, 100.00) - PASS

- bonus replay text: W TNT The Unleashed Mine THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE UNLEASH: $1.00 · 100x · REAL COST: $100.00 PLAY REPLAY The Unleashed Mine The Unleashed Mine The Unleashed Mine Controls SOUND \| SOUND INFO \| INFO FULLSCREEN \|
- base replay text: W TNT The Unleashed Mine THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE BET: $1.00 · Base Game PLAY REPLAY The Unleashed Mine The U
- bet 1.00 shown=true, 100x shown=true, real cost 100.00 shown=true

### [174] replay at 400x225 fits without scroll - PASS

- {"sw":400,"cw":400,"sh":225,"ch":225,"sy":0}

### [181] authenticate on load hits rgs_url with sessionID - PASS

- POST /wallet/authenticate {"sessionID":"qa-session"}
- origin=http://localhost:5173

### [183] /wallet/play {sessionID,amount,mode} - PASS

- POST /wallet/play {"sessionID":"qa-session","amount":1000000,"mode":"base"}

### [187] active round restores bet = round.amount after reload - PASS

- bet display after load=$3.00, after reload=$3.00 (round.amount=3.00, default 1.00)
- POST /wallet/authenticate {"sessionID":"qa-session"}
- POST /wallet/end-round {"sessionID":"qa-session"}
- POST /wallet/authenticate {"sessionID":"qa-session"}
- POST /wallet/end-round {"sessionID":"qa-session"}

### [188] replay fetch failure shows a message - PASS

- text: W TNT The Unleashed Mine THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE BET: $1.00 · UNLEASH RETRY Could not load this replay. Please try again later. REPLAY The Unleashed Mine The Unleashed 
- Play button still offered=false

### [219] currencies USD/EUR/CAD/MXN/JPY/XSC/XGC - PASS

- USD: balance="$12.34" bet="$1.00" expected "$12.34" 
- EUR: balance="€12.34" bet="€1.00" expected "€12.34" 
- CAD: balance="CA$12.34" bet="CA$1.00" expected "CA$12.34" 
- MXN: balance="MX$12.34" bet="MX$1.00" expected "MX$12.34" 
- JPY: balance="¥12" bet="¥1" expected "¥12" 
- XSC: balance="12.34 SC" bet="1.00 SC" expected "12.34 SC" 
- XGC: balance="12.34 GC" bet="1.00 GC" expected "12.34 GC" 

### [221] no end-round after 0x, end-round after win - PASS

- 0x round: play=1 end-round=0
- win round: play=1 end-round=1
- POST /wallet/play {"sessionID":"qa-session","amount":1000000,"mode":"base"}
- POST /wallet/play {"sessionID":"qa-session","amount":1000000,"mode":"base"}
- POST /wallet/end-round {"sessionID":"qa-session"}

### [222] zero balance -> no /wallet/play (button, space, autoplay, unleash) + visible message - PASS

- messages by path: {"button":"modal:Insufficient balance. You need at least $1.00 to play this round.","space":"modal:Insufficient balance. You need at least $1.00 to play this round.","autoplay":"modal:Insufficient balance. You need at least $1.00 to play this round.","unleash":"modal:Insufficient balance. You need at least $100.00 to play this round."}
- play calls=0

### [223] viewport meta + touch-action - PASS

- meta=width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
- touch-action on #game=none
- body overflow=hidden

### [225] social=true: rules/info/autoplay/confirm wording (restricted words, same scan, rules screen only) - PASS

- rules/info texts scanned: autoplay(641), unleash-confirm(576), info(1225), info-tab0(1225), info-tab1(1604), info-tab2(1240), info-tab3(1842), info-tab4(1094), info-tab5(1374), info-tab6(1099)
- hits: []

### [227] no scrollbars/scroll at 4 viewports (idle + after bet + rules open) - PASS

- 1024x576 idle: scroll=(0,0) doc 1024x576 vs 1024x576 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:1065x599","CANVAS:1064x604","lay veins drift-b:1065x599"]
- 1024x576 after-bet: scroll=(0,0) doc 1024x576 vs 1024x576 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:1063x599","CANVAS:1062x604","lay veins drift-b:1062x599"]
- 1024x576 rules: scroll=(0,0) doc 1024x576 vs 1024x576 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:1063x599","CANVAS:1062x604","lay veins drift-b:1062x600"]
- 400x225 idle: scroll=(0,0) doc 400x225 vs 400x225 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:416x234","CANVAS:416x236","lay veins drift-b:416x234"]
- 400x225 after-bet: scroll=(0,0) doc 400x225 vs 400x225 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:414x235","CANVAS:414x237","lay veins drift-b:413x235"]
- 400x225 rules: scroll=(0,0) doc 400x225 vs 400x225 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:414x235","CANVAS:414x237","lay veins drift-b:413x235"]
- 800x450 idle: scroll=(0,0) doc 800x450 vs 800x450 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:832x468","CANVAS:831x472","lay veins drift-b:832x468"]
- 800x450 after-bet: scroll=(0,0) doc 800x450 vs 800x450 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:830x468","CANVAS:847x474","lay veins drift-b:829x468"]
- 800x450 rules: scroll=(0,0) doc 800x450 vs 800x450 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:830x468","CANVAS:848x474","lay veins drift-b:829x469"]
- 425x812 idle: scroll=(0,0) doc 425x812 vs 425x812 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:442x844","CANVAS:442x851","lay veins drift-b:442x844"]
- 425x812 after-bet: scroll=(0,0) doc 425x812 vs 425x812 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:442x844","CANVAS:451x854","lay veins drift-b:442x843"]
- 425x812 rules: scroll=(0,0) doc 425x812 vs 425x812 scrollbarW=0 overflow=hidden/hidden offscreen=["lay drift-a:442x843","CANVAS:451x854","lay veins drift-b:442x842"]
- screenshots: tests/shots/qa_1024x576.png qa_400x225.png qa_800x450.png qa_425x812.png (one bet played before the shot where possible)

### [228] space bar places a bet, no page scroll, no double fire - PASS

- Space w/o focus -> plays=1; Space with button focused -> plays=1 (must be 1)
- keydown Space events: [{"code":"Space","key":" ","target":"BODY","prevented":true},{"code":"Space","key":" ","target":"BODY","prevented":true}]
- scrollY=0 scrollTop=0 activeElement=BODY

### [239] lang=en: no keys/undefined/NaN/{...} (all screens) - PASS

- screens scanned: main, autoplay, unleash-confirm, info, info-tab0, info-tab1, info-tab2, info-tab3, info-tab4, info-tab5, info-tab6, after-bet, error-msg
- hits: []
- <html lang>=en

### [240] lang=zz: no keys/undefined/NaN/{...} (all screens) - PASS

- screens scanned: main, autoplay, unleash-confirm, info, info-tab0, info-tab1, info-tab2, info-tab3, info-tab4, info-tab5, info-tab6, after-bet, error-msg
- hits: []
- <html lang>=en

### [242] dynamic bet config (1.00-2.00, 4 levels, default in middle) - PASS

- displayed bet sequence: ["$1.40","$1.70","$2.00","$2.00","$2.00","$2.00","$1.70","$1.40","$1.00","$1.00","$1.00","$1.00"]
- plus disabled at end=true, minus disabled at end=true
- JPY bet shown: ¥200 -> ¥500; play amount=500000000

### [243] replay social=true: social wording, XSC amounts, no "$" - PASS

- restricted hits: []
- "$" present=false
- text: W TNT The Unleashed Mine THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE UNLEASH: 1.00 SC · 100x · REAL COST: 100.00 SC PLAY REPLAY The Unleashed Mine The Unleashed Mine The Unleashed Mine Con

### [273] sub-cent payouts (bet 0.01 x 0.1x win = 0.001) are not shown as 0.00 - PASS

- book 20351 payoutMultiplier=0.2x bet=0.01 -> exact win 0.002; displayed win="$0.002"; balance="$99.992"
- sub-cent payout=true

### [274] rgs_url=example.com (and bare host) -> error, no RGS call elsewhere - PASS

- requests to example.com: ["GET http://localhost:5173/index.html?sessionID=qa-session&rgs_url=example.com&lang=en&device=desktop","POST https://example.com/wallet/authenticate"]
- mock log entries: 0
- state=error error visible=true
- text=W TNT The Unleashed Mine THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE THE UNLEASHED MINE BALANCE 0.00 BET 0.00 WIN 0.00 UNLEASH 
- bare host rgs.test requests: ["GET http://localhost:5173/index.html?sessionID=qa-session&rgs_url=rgs.test&lang=en&device=desktop","POST https://rgs.test/wallet/authenticate"]
- idle after bare host=idle

### [275] no "stake engine" text/branding in DOM/network/source - AT RISK

- DOM hit=false
- network urls with "stake": []
- source "stake engine" hits: []
- other "stake" occurrences (check social wording): ["src/i18n/social.js:52:  [/\\bstake\\b/gi, 'play amount'],"]

### [219b] CA$/MX$/XSC/JPY with large balance: no clipping of balance/bet/win at 4 viewports - AT RISK

- moderate balance clipped cases=0; 7-figure stress clipped cases=3
- [moderate 12,345.67] CAD 1024x576: balance="CA$12,745.67"(129/158) bet="CA$100.00"(101/104) win="CA$500.00"(101/158) unleash-cost="CA$10,000.00"(71/71)
- [moderate 12,345.67] CAD 400x225: balance="CA$12,305.67"(60/62) bet="CA$100.00"(27/27) win="CA$60.00"(50/62) unleash-cost="CA$10,000.00"(41/41)
- [moderate 12,345.67] CAD 800x450: balance="CA$12,305.67"(101/123) bet="CA$100.00"(74/77) win="CA$60.00"(70/123) unleash-cost="CA$10,000.00"(55/55)
- [moderate 12,345.67] CAD 425x812: balance="CA$12,745.67"(89/89) bet="CA$100.00"(79/81) win="CA$500.00"(89/89) unleash-cost="CA$10,000.00"(80/80)
- [moderate 12,345.67] MXN 1024x576: balance="MX$12,295.67"(133/158) bet="MX$100.00"(99/104) win="MX$50.00"(93/158) unleash-cost="MX$10,000.00"(73/73)
- [moderate 12,345.67] MXN 400x225: balance="MX$12,295.67"(61/62) bet="MX$100.00"(26/27) win="MX$50.00"(52/62) unleash-cost="MX$10,000.00"(43/43)
- [moderate 12,345.67] MXN 800x450: balance="MX$12,745.67"(104/123) bet="MX$100.00"(77/77) win="MX$500.00"(82/123) unleash-cost="MX$10,000.00"(57/57)
- [moderate 12,345.67] MXN 425x812: balance="MX$12,345.67"(87/89) bet="MX$100.00"(77/81) win="MX$100.00"(87/89) unleash-cost="MX$10,000.00"(83/83)
- [moderate 12,345.67] XSC 1024x576: balance="12,745.67 SC"(121/158) bet="100.00 SC"(93/104) win="500.00 SC"(93/158) unleash-cost="10,000.00 SC"(67/67)
- [moderate 12,345.67] XSC 400x225: balance="12,265.67 SC"(59/62) bet="100.00 SC"(26/27) win="20.00 SC"(45/62) unleash-cost="10,000.00 SC"(39/39)
- [moderate 12,345.67] XSC 800x450: balance="12,745.67 SC"(94/123) bet="100.00 SC"(72/77) win="500.00 SC"(72/123) unleash-cost="10,000.00 SC"(52/52)
- [moderate 12,345.67] XSC 425x812: balance="12,255.67 SC"(89/89) bet="100.00 SC"(77/81) win="10.00 SC"(86/89) unleash-cost="10,000.00 SC"(75/75)
- [stress 1,234,567.89] CAD 1024x576: balance="CA$1,234,527.89"(157/158) bet="CA$100.00"(101/104) win="CA$60.00"(89/158) unleash-cost="CA$10,000.00"(71/71)
- [stress 1,234,567.89] CAD 400x225: balance="CA$1,234,967.89"(60/62) bet="CA$100.00"(27/27) win="CA$500.00"(56/62) unleash-cost="CA$10,000.00"(41/41)
- [stress 1,234,567.89] CAD 800x450: balance="CA$1,234,517.89"(122/123) bet="CA$100.00"(74/77) win="CA$50.00"(70/123) unleash-cost="CA$10,000.00"(55/55)
- [stress 1,234,567.89] CAD 425x812: balance="CA$1,234,477.89"(96/89) CLIPPED bet="CA$100.00"(79/81) win="CA$10.00"(84/89) unleash-cost="CA$10,000.00"(80/80)
- [stress 1,234,567.89] MXN 1024x576: balance="MX$1,234,487.89"(151/158) bet="MX$100.00"(99/104) win="MX$20.00"(93/158) unleash-cost="MX$10,000.00"(73/73)
- [stress 1,234,567.89] MXN 400x225: balance="MX$1,234,517.89"(62/62) bet="MX$100.00"(26/27) win="MX$50.00"(52/62) unleash-cost="MX$10,000.00"(43/43)
- [stress 1,234,567.89] MXN 800x450: balance="MX$1,234,497.89"(118/123) bet="MX$100.00"(77/77) win="MX$30.00"(73/123) unleash-cost="MX$10,000.00"(57/57)
- [stress 1,234,567.89] MXN 425x812: balance="MX$1,234,487.89"(99/89) CLIPPED bet="MX$100.00"(77/81) win="MX$20.00"(88/89) unleash-cost="MX$10,000.00"(83/83)
- [stress 1,234,567.89] XSC 1024x576: balance="1,234,517.89 SC"(149/158) bet="100.00 SC"(93/104) win="50.00 SC"(81/158) unleash-cost="10,000.00 SC"(67/67)
- [stress 1,234,567.89] XSC 400x225: balance="1,234,967.89 SC"(60/62) bet="100.00 SC"(26/27) win="500.00 SC"(52/62) unleash-cost="10,000.00 SC"(39/39)
- [stress 1,234,567.89] XSC 800x450: balance="1,234,477.89 SC"(116/123) bet="100.00 SC"(72/77) win="10.00 SC"(63/123) unleash-cost="10,000.00 SC"(52/52)
- [stress 1,234,567.89] XSC 425x812: balance="1,234,487.89 SC"(91/89) CLIPPED bet="100.00 SC"(77/81) win="20.00 SC"(86/89) unleash-cost="10,000.00 SC"(75/75)

### [RULES] rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer - PASS

- info text length=10223; RTP-like percentages found: ["96.00","96.00","96.00","96.00","96.00","96.00"]
- missing: []
- controls not mentioned in rules text: []

### [WIN-base-loss] base mode, forced loss book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 4490 payoutMultiplier=0x bet=$2.00 -> expected win $0.00; displayed win=$0.00; balance $4,998.00 (expected $4,998.00); round took 2s; final state idle=true
- renderer's last #win value before end-round request: $0.00 (matches); #win values seen: ["$0.00"]
- end-round calls=0 (expected 0)

### [WIN-base-win] base mode, forced win book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 10692 payoutMultiplier=0.2x bet=$2.00 -> expected win $0.40; displayed win=$0.40; balance $4,998.40 (expected $4,998.40); round took 2s; final state idle=true
- renderer's last #win value before end-round request: $0.40 (matches); #win values seen: ["$0.00","$0.40"]
- end-round calls=1 (expected 1)

### [WIN-base-bonus] base mode, forced bonus book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 44692 payoutMultiplier=2x bet=$2.00 -> expected win $4.00; displayed win=$4.00; balance $5,002.00 (expected $5,002.00); round took 20s; final state idle=true
- renderer's last #win value before end-round request: $4.00 (matches); #win values seen: ["$0.00","$4.00"]
- end-round calls=1 (expected 1)

### [WIN-base-retrigger] base mode, forced retrigger book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 82630 payoutMultiplier=128.8x bet=$2.00 -> expected win $257.60; displayed win=$257.60; balance $5,255.60 (expected $5,255.60); round took 38s; final state idle=true
- renderer's last #win value before end-round request: $257.60 (matches); #win values seen: ["$0.00","$28.00","$32.00","$237.60","$257.60"]
- end-round calls=1 (expected 1)

### [WIN-base-maxwin] base mode, forced maxwin book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 32879 payoutMultiplier=5000x bet=$2.00 -> expected win $10,000.00; displayed win=$10,000.00; balance $14,998.00 (expected $14,998.00); round took 44s; final state idle=true
- renderer's last #win value before end-round request: $10,000.00 (matches); #win values seen: ["$0.00","$10,000.00"]
- end-round calls=1 (expected 1)

### [WIN-bonus-bonus] bonus mode, forced bonus book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 6942 payoutMultiplier=193.6x bet=$2.00 -> expected win $387.20; displayed win=$387.20; balance $5,187.20 (expected $5,187.20); round took 30s; final state idle=true
- renderer's last #win value before end-round request: $387.20 (matches); #win values seen: ["$0.00","$4.00","$71.20","$170.00","$370.00","$387.20"]
- end-round calls=1 (expected 1)

### [WIN-bonus-retrigger] bonus mode, forced retrigger book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 29162 payoutMultiplier=542.6x bet=$2.00 -> expected win $1,085.20; displayed win=$1,085.20; balance $5,885.20 (expected $5,885.20); round took 86s; final state idle=true
- renderer's last #win value before end-round request: $1,085.20 (matches); #win values seen: ["$146.00","$244.80","$473.60","$660.80","$881.60","$896.40","$905.20","$1,085.20"]
- end-round calls=1 (expected 1)

### [WIN-bonus-maxwin] bonus mode, forced maxwin book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 30863 payoutMultiplier=5000x bet=$2.00 -> expected win $10,000.00; displayed win=$10,000.00; balance $14,800.00 (expected $14,800.00); round took 49s; final state idle=true
- renderer's last #win value before end-round request: $10,000.00 (matches); #win values seen: ["$0.00","$880.00","$10,000.00"]
- end-round calls=1 (expected 1)

### [EXT] no requests to external hosts (all sessions) - PASS

- sessions=73
- external: []

### [CONSOLE] no console errors / page errors during launch/play/replay - PASS

- console errors: []
- page errors: []
- failed requests: []

## Static code review

### Hardcoded hosts / external http(s) URLs (should be none; RGS only via params.rgsUrl) - PASS

- none found

### localhost references (params.js only defaults a scheme-less LOCAL rgs_url to http://; no host is hardcoded) - PASS

- src/params.js:13 (CORE): const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u);

### External scripts/styles/fonts/CDN in HTML/CSS - PASS

- none found

### dev.html (RENDER harness, served from the same root) formats money with a literal "$" - delete before submission - AT RISK

- dev.html:30 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);

### Fixed '$' symbol (currency symbol must come from money.js per currency) - PASS

- none found

### money.js symbol table lines (review XSC/XGC have no '$') - INFO

- src/money.js:5 (CORE): USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],
- src/money.js:6 (CORE): PHP: ['₱', 2], INR: ['₹', 2], IDR: ['Rp', 0], KRW: ['₩', 0], BRL: ['R$', 2], MXN: ['MX$', 2],
- src/money.js:45 (CORE): return (neg ? '-' : '') + (meta.symbolAfter ? `${abs} ${meta.symbol}` : `${meta.symbol}${abs}`);

### Fixed 2 decimals / /100 (JPY has 0 decimals; sub-cent payouts need more) - AT RISK

- src/render/index.js:51 (RENDER): fmt: (x) => `${(Math.round(x * 100) / 100).toFixed(2)}x`,
- src/replay.js:33 (TEXT): try { amountStr = formatMoney(amt, cur, { social: isSocial() }); } catch (e) { amountStr = (amt / MICRO).toFixed(2); }
- src/replay.js:36 (TEXT): try { real = formatMoney(Math.round(amt * mult), cur, { social: isSocial() }); } catch (e) { real = ((amt * mult) / MICRO).toFixed
- src/replay.js:145 (TEXT): try { totalStr = formatMoney(total, currency, { social: isSocial() }); } catch (e) { totalStr = (total / MICRO).toFixed(2); }
- src/rules.js:22 (TEXT): const commas = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
- src/rules.js:23 (TEXT): const pct = (r) => (Number.isFinite(Number(r)) ? (Number(r) * 100).toFixed(2) + '%' : '-');

### Micro-unit conversions outside money.js/bet.js (review) - AT RISK

- src/replay.js:7 (TEXT): const MICRO = 1_000_000;
- src/rules.js:70 (TEXT): example = `<p>Example: with a ${B} of ${esc(fmt(1_000_000, currency))}, a cluster of ${tierLabel(tiers[tiers.length - 1])} ${esc(t

### end-round call sites (must be guarded: only payoutMultiplier > 0; never for 0x) - PASS

- src/main.js:109 (CORE): if (S.renderer && round && round.state) await S.renderer.playBook(round.state, hooks()); ⏎ } ⏎  ⏎ async function settle(round) { ⏎ setState('settling'); ⏎ if (shouldEndRound(round)) { ⏎ const r = await rgs.endRound();

### keydown listeners (Space must be on window, preventDefault called) - PASS

- listener src/main.js:226 (CORE): window.addEventListener('keydown', (e) => {
- listener src/rules.js:256 (TEXT): window.addEventListener('keydown', (e) => {
- preventDefault src/main.js:228 (CORE): e.preventDefault();

### Space key handling lines - INFO

- src/main.js:227 (CORE): if (e.code !== 'Space' && e.key !== ' ') return;

### HTML/CSS: viewport meta, title restrictions, overflow, touch-action - PASS

- viewport meta: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
- <title>: The Unleashed Mine
- <html lang>: en
- styles.css html,body overflow:hidden rule: true; height:100%: true; touch-action:none: true

### Network calls outside rgs.js (must be none; replay must not touch wallet) - PASS

- none found

### src/i18n/social.js string values containing restricted words - PASS

- none found

## NEEDS A HUMAN (always)

- Real audio audibility on a device (graph-level mute is checked above).
- Visual quality of the four screenshots in `tests/shots/qa_*.png`.
- Touch behaviour on a real phone (pinch/double-tap zoom).
