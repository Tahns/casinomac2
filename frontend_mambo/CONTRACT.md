# The Unleashed Mine — project contract (shared by all agents)

Game: 6 reels x 5 rows, cluster-pays (5+ adjacent like symbols, orthogonal), tumble/cascade. Wild W ("Gold Nugget") substitutes for paying symbols, never for scatter S ("Dynamite"). 4+ S trigger the Unleashed Mine free spins (10/12/15... see math config), where every cell that takes part in a win becomes a "vein" whose multiplier grows on each later hit (SDK `updateGrid` events) and cluster win = base pay x sum of multipliers in the cluster. Retrigger with 3+ S. Win cap 5000x. Modes: `base` (cost 1x), `bonus` (cost 100x, starts the free spins directly — displayed as "UNLEASH", never "buy").

Symbols: H1 Ruby, H2 Sapphire, H3 Emerald, H4 Topaz, L1 Amethyst, L2 Pickaxe, L3 Lantern, L4 Hard hat, W Gold Nugget, S Dynamite.

## Layout (all static files, vanilla ES modules, NO build step, NO external hosts/fonts/CDNs)
```
math/games/the_unleashed_mine/   math (Python SDK). Owner: MATH agent.
frontend/                        the game, served as static files. index.html at root.
  index.html                     owner: RENDER
  styles.css                     owner: RENDER
  src/main.js                    boot + state machine. owner: CORE
  src/params.js                  URL params. owner: CORE
  src/rgs.js                     wallet/replay client. owner: CORE
  src/money.js                   currency formatting. owner: CORE
  src/bet.js                     bet levels/state. owner: CORE
  src/input.js                   keyboard/autoplay/confirm logic. owner: CORE
  src/render/*.js                board, symbols (inline SVG/canvas, drawn in code), animations. owner: RENDER
  src/audio.js                   WebAudio synthesized sounds, one master mute. owner: RENDER
  src/i18n/*.js                  strings en (+ social variant), fallback to en. owner: TEXT
  src/rules.js                   rules/info/help screens. owner: TEXT
  src/replay.js                  replay mode UI + flow. owner: TEXT
  data/rules_data.json           generated from math publish files by tools/gen_rules_data.mjs. owner: TEXT
  tools/mock-rgs/                mock RGS server (node, no deps) serving real books. owner: QA
  tests/                         playwright + node tests. owner: QA
  fixtures/                      small real books sample copied from math library. owner: MATH puts it, QA reads
```
Each agent edits ONLY the files it owns. If you need a change in someone else's file, put a note in `frontend/NOTES_<yourrole>.md` and work around it. Do NOT git commit or push (the lead does). Do not install anything globally; `npm` packages only inside `frontend/` as devDependencies for tests (playwright is already available: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers, use executablePath '/opt/pw-browsers/chromium' if needed).

## Module interfaces (ES modules, named exports)
- `params.js`: `export const params` = `{ sessionID, rgsUrl (scheme added if missing, never hardcoded), lang (unknown->'en'), currency, device, social (bool), demo, replay (bool), replayGame, replayVersion, replayMode, replayEvent, replayAmount }`.
- `money.js`: `formatMoney(micro, currency, {social})` -> "$10.00", "€10.00", "CA$10.00", "MX$10.00", "¥10", "10.00 SC", "10.00 GC", "10.00 SC" (XEC); sub-cent payouts get enough decimals; never a `$` when currency is XSC/XGC. `MICRO = 1_000_000`.
- `rgs.js`: `authenticate()`, `balance()`, `play(amountMicro, mode)`, `endRound()`, `betEvent(event)`, `fetchReplay(game,version,mode,event)`; all URLs built from `params.rgsUrl`; throws `RgsError{code}`.
- `i18n`: `t(key, vars)` returns English (or social-wording English when `params.social`); never returns a raw key. `t.mode(name)`.
- `render` (RENDER agent exports from `src/render/index.js`): `createRenderer(rootEl)` -> `{ showBoard(boardSyms), playBook(events, hooks) -> Promise, setMultipliers(grid), setTurbo(bool), resize(), destroy() }`. `playBook` plays SDK book events in order (reveal, winInfo, tumbleBanner/tumbleBoard, setTumbleWin, updateGrid, freeSpinTrigger, updateFreeSpin, freeSpinEnd, setWin, setTotalWin, wincap, finalWin) and calls `hooks.onTotal(microOrMultiplier)`, `hooks.onWin(x)`, `hooks.onFreeSpinCounter(cur, total)`. Event schemas: `math/docs/rgs_docs/data_format.md`, `math/src/events/events.py`, `math/games/the_unleashed_mine/game_events.py`.
- `audio.js`: `audio.play(name)`, `audio.setMuted(bool)`, `audio.muted`. Everything audible goes through it.

## Platform rules (must hold — Engine approval guidelines)
Money is micro-units (1_000_000 = 1.00). `rgs_url` may come without `https://`. `/wallet/authenticate` on load; bet config (`minBet,maxBet,stepBet,defaultBetLevel,betLevels`) entirely from the response; if `round.active` the bet becomes `round.amount`. `/wallet/end-round` ONLY for rounds with payoutMultiplier > 0 (never for 0x). No `/wallet/play` when balance < bet x mode cost (message shown, covers space bar, autoplay, unleash). Space bar = bet button (preventDefault, window listener). `html,body{margin:0;overflow:hidden;height:100%}`. Autoplay opens a settings panel (no start from one press). Mode costing >2x (UNLEASH 100x) needs a confirm dialog stating the cost. One sound control mutes everything. Viewport meta `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` + `touch-action: none` on the game surface. Replay (`replay=true`): GET `{rgs_url}/bet/replay/{game}/{version}/{mode}/{event}`, no wallet calls, no betting UI, Play/Start button, Replay-again button, shows bet amount, and for cost>1x the multiplier and real cost (`amount x costMultiplier`). Social mode (`social=true`): never show restricted words (bet, buy, pay, paytable, cash, stake, wager, money, credit, currency, deposit, fund, gamble, purchase, paid, win feature, bonus buy, total bet, rebet, place your bets, cost of, at the cost of, ...) — use play/plays, win, coins, balance, "Win table"; amounts "10.00 SC/GC"; no `$`. Title must not contain Megaways, Boosted, Enhanced, RTP, Rush, Bonanza, Gates of, Olympus, Kraken... ("The Unleashed Mine" is fine). No "Stake Engine" branding anywhere. Viewports to support: 1024x576, 400x225, 800x450, 425x812 (touch).
Rules text must state RTP + max win per mode (computed from the math lookup tables), every symbol payout, win formation, every mode with cost, free games + retrigger, every control, the disclaimer: "Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine."
Language: only English required; `lang` unknown -> English.

## Règle ajoutée (décision du lead, 2026-10-22)
Aucune IA générative pour les visuels ni les sons : tout est dessiné/synthétisé en code (SVG, canvas, WebAudio). Les images de soumission (tuile 3:4, cover 16:9) sont des SVG dessinés à la main rendus en PNG. Sauvegarde ton travail dans les fichiers au fil de l'eau (le process peut être redémarré) et tiens à jour `frontend/NOTES_<role>.md` avec ce qui est fait / reste à faire.

## VARIANTE « AGENT MAMBO » (cette copie de travail : frontend_mambo/)
Ce dossier est une variante du jeu avec un autre thème (espionnage-jazz années 60). Référence unique : `docs/mambo/DESIGN.md` (mascotte Mambo, symboles, palette, meter, mèche, textes, tâches par fichier). Le jeu de mine reste dans `frontend/` et ne doit pas être modifié.
Changements de mécanique par rapport au jeu de mine (maths : `math/games/agent_mambo`) :
- Plus de veines par case : un **multiplicateur global** (« Mission Meter ») démarre à x1 en free spins, chaque pas gagnant est payé avec la valeur courante puis la jauge monte de +1 ; elle persiste pendant toute la fonction. Événement `updateGlobalMult` {globalMult}. Aucune jauge en jeu de base.
- La **mèche (wire)** garde les événements `fusePath`, `fuseBurn`, `fuseFizzle` ; `fuseBlast` ne contient plus `replaced` : les cases brûlées (hors scatter) sont **retirées** puis de nouveaux symboles tombent (événements `tumbleBoard`/`winInfo` normaux ensuite). Aucun wild n'est créé.
- Le mode à 100x garde ses règles (prix minimum, confirmation du coût) et change de nom d'affichage (voir DESIGN §5.4). Les mots interdits en mode social restent interdits.
- Plus aucune trace des mots « mine », « Gus », « fuse », « vein » dans les textes visibles (les noms d'événements techniques `fuse*` peuvent rester).
Règles ajoutées : aucune IA générative, tout est dessiné/synthétisé en code ; ne modifier que les fichiers dont on est propriétaire (voir DESIGN §10) ; ports de test dédiés par agent ; ne jamais utiliser `pkill -f` (ne tuer que ses propres PID) ; ne pas faire de commit.
