# NOTES_text
- rules.js: `openRules()`, `closeRules()`, `renderRules(el)`, `buildRules(data,ctx)`. Renders into #modal-info (sets hidden/class `open`); injects its own small <style id="rules-style">; classes rules-*, rl-*.
- replay.js: `startReplay({renderer?, formatMoney?})`. Uses #replay-bar (or creates #replay-ui) and #replay-info if present; hides betting controls; button #replay-btn. Needs renderer.playBook(state, hooks).
- i18n: data-i18n, data-i18n-title, data-i18n-aria-label, data-i18n-placeholder (+ data-i18n-vars JSON). `setSocial(bool)` for tests.
- Regenerate rules data: `node tools/gen_rules_data.mjs` (reads publish_files, else fixtures; else provisional from game_config.py).
- Tests: `node --test tests/text/text.test.mjs`
