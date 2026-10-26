# NOTES_text
- rules.js: `openRules()`, `closeRules()`, `renderRules(el)`, `buildRules(data,ctx)`. Renders into #modal-info (sets hidden/class `open`); injects its own small <style id="rules-style">; classes rules-*, rl-*.
- replay.js: `startReplay({renderer?, formatMoney?})`. Uses #replay-bar (or creates #replay-ui) and #replay-info if present; hides betting controls; button #replay-btn. Needs renderer.playBook(state, hooks).
- i18n: data-i18n, data-i18n-title, data-i18n-aria-label, data-i18n-placeholder (+ data-i18n-vars JSON). `setSocial(bool)` for tests.
- Regenerate rules data: `node tools/gen_rules_data.mjs` (reads publish_files, else fixtures; else provisional from game_config.py).
- Tests: `node --test tests/text/text.test.mjs`

## Agent Mambo (TEXT agent)
- en.js/social.js/rules.js/replay.js/gen_rules_data.mjs re-themed; `node tools/gen_rules_data.mjs` reads math/games/agent_mambo (game_config.py + library/publish_files/lookUpTable_<mode>_0.csv). rules_data.json is provisional:true until the bonus table is published (base table already used); re-run when the math agent finishes. New data fields: gmStart, gmStep, gmCap, fuseLen/DetMin/Adv/B0, fuseParams.
- Keys kept: btn.unleash, unleash.*, mode.bonus (values = SECRET ENTRANCE). Old mascot.win/big/shock/fs/lose still exist.
- New keys for INTEGRATION: mascot.idle, mascot.win, mascot.big, mascot.shock, mascot.fs, mascot.fsEnd, mascot.lose, mascot.wire, mascot.meter; each also has variants `mascot.<ev>.1` .. `.5` (pick one at random; mascot.meter.4 contains `{n}` = meter value). fx.wire, fx.defuse, fx.fizzle (fx.fuse kept as alias = WIRE!), label.meter ("MISSION METER"), meter.kept, meter.max, meter.start.
- Needs from others: index.html static text (title, loading, data-i18n for the unleash button) is owned by SCENE/INTEGRATION; rules.js still imports unleashMinPrice from bet.js (CORE). rules.js GLYPH colours are approximations of the DESIGN palette. replay.js mock/ids unchanged (#replay-btn, #replay-skip, #replay-turbo).
- Meter rule in text: each winning step is won at the CURRENT value, then rises by gm_step (as told by the lead; verify against math when final).
