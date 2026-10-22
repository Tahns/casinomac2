# NOTES_integration (INTEGRATION agent)

## Done
- main.js: static imports of i18n/audio/render; `renderer.setFormat(x => formatMoney(x*bet))` re-applied on every bet change/boot; initial mute from `audio.muted`; click sound on buttons; missing sessionID/rgs_url -> err.noParams; fatal errors keep the dialog open with a RELOAD button (never continue as connected); WIN shows running total (per-spin win ignored in free spins).
- params.js: rgs_url without scheme -> `http://` for localhost/127.x/::1, `https://` otherwise.
- money.js: thousands separators in formatMoney ($1,000.00); formatAmount (inputs) stays ungrouped.
- i18n: added `label.combo`.
- Mock RGS now serves real SDK-format books (payoutMultiplier and event amounts x100); `round.payoutMultiplier`/replay `payoutMultiplier` are served divided by 100 like the real RGS. Hand-made fallback books converted to x100.
- frontend/fixtures/: books_base_sample.jsonl (275), books_bonus_sample.jsonl (300), index.json (dumped from math/library/publish_files, stratified: zero/low/mid/high/trigger/wincap).
- tests/text/index.js so `node --test frontend/tests/core frontend/tests/text` works.
- styles.css: appended portrait rule giving the bet panel more width (no "$1..." ellipsis at 425px). replay.js: badge hidden under 300px height.

## Verified (Playwright, own mock on port 5190 to avoid clashing with other agents on 5180)
base play (win/loss), end-round only when payout>0, UNLEASH confirm (cost shown, cancel = no call, confirm = play + end-round), insufficient balance (button/space/unleash: message, no /wallet/play), resume of active round (bet = round.amount, end-round), autoplay panel (no start without confirm, stop), bad rgs_url error dialog, no-params error, replay mode (base + bonus, 1024/400/800/425).

## Todo / known
- Mock force by `id` collides between base and bonus sample ids.
