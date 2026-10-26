# NOTES_core (CORE agent) - what main.js/input.js expect

## DOM ids (index.html, RENDER)
Buttons: #btn-bet (spin/play, also the Space target), #btn-bet-minus, #btn-bet-plus, #btn-autoplay, #btn-turbo, #btn-sound, #btn-info, #btn-unleash, #btn-fullscreen, #btn-menu.
Displays (textContent set by CORE): #balance, #bet, #win. Optional: #unleash-cost (cost label), #freespin-counter, #autoplay-left.
Game surface: #game (renderer root; passed to createRenderer). Falls back to #stage, then body.
Modals (CORE toggles attribute `hidden` and class `open`; each has class `modal`):
- #modal-autoplay: contains inputs #ap-count (select/input, values 10,25,50,100,...), #ap-stop-bigwin (checkbox), #ap-stop-feature (checkbox), #ap-stop-below (number input, display units), buttons #ap-confirm, #ap-cancel.
- #modal-confirm: #confirm-title, #confirm-text, buttons #confirm-ok, #confirm-cancel.
- #modal-message: #message-text, button #message-ok.
Also expected: #btn-info opens rules (CORE calls `openRules()` from src/rules.js if exported; TEXT). Body gets classes `state-<name>` (booting, authenticating, idle, betting, playing, settling, error), `turbo`, `muted`, `autoplay`.
Buttons get `disabled` while not idle (except turbo/sound/info/fullscreen/menu).
Elements with `data-i18n="key"` are filled by CORE via t(key) at boot (textContent); `data-i18n-title` sets title/aria-label.

## i18n keys used (t(key, vars))
err.insufficient, err.connection, err.auth, err.limit, err.generic, err.retry, err.validation, err.session,
btn.play, btn.autoplay, btn.unleash, btn.turbo, btn.sound, btn.info, btn.fullscreen, btn.menu, btn.ok, btn.confirm, btn.cancel,
label.balance, label.bet, label.win,
autoplay.title, autoplay.spins, autoplay.stopBigWin, autoplay.stopFeature, autoplay.stopBelow, autoplay.start, autoplay.stop,
unleash.title, unleash.confirm ({cost}), 
round.resumed, round.unfinished
Vars: unleash.confirm gets {cost} formatted money. err.insufficient gets {cost}.
Social wording is TEXT's job (keys identical).

## Hooks CORE calls
renderer = createRenderer(rootEl) from ./render/index.js: showBoard, playBook(events,{onTotal,onWin,onFreeSpinCounter}), setTurbo, resize, destroy.
audio from ./audio.js: setMuted, muted, play(name) (names used: 'click', 'error').
replay: startReplay() from ./replay.js, called when params.replay (no wallet call made by CORE). CORE passes {renderer, formatMoney} as an optional first argument.
Round shape expected from RGS: {betID, amount, payout, payoutMultiplier, active, mode, state:[events]}; amounts micro.
