# NOTES_symbols (SYMBOLS agent)
Done: src/render/symbols.js rewritten (10 Mambo props, ids H1..H4 L1..L4 W S unchanged). Exports SYMBOLS, SYM_COLOR (palette 4.1), ensureSprite, symbolMarkup.
- symbolMarkup now returns INLINE svg (class `sym-svg mb mb-<ID>`), so ancestor selectors work. ensureSprite also adds <symbol id="sym-X"> (no animations) and injects `<style id="mb-sym-css">`.
- Own CSS classes (mb-*), all steps(): mb-tw sparkle, mb-dial (safe), mb-bub/mb-orbit (fizz), mb-vshine (vinyl), mb-feather, mb-hand/mb-rot (phone), mb-glint (magnifier), mb-knot (bow tie), wild pulse + mb-sp sparkles.
- Scatter anticipation: folder opens/flashes/shakes under any `.antic` ancestor (board-wrap.antic) unless `.adim`, or on `.cell.s-S.hot`, or `.cell.s-S.win`. Wild: faster sparkles + eye wink on `.cell.s-W.win`.
- Idle bob / win squash / dim still come from styles.css (`.cell .sym-svg`); legacy classes (.twk .fl .lglow .spk .puff .wink) are no longer used by symbols.
- dev.html: `?sheet=1` or the "symbols" button shows sheet at 130/80/40 px + state row. Screenshots: tests/shots/symbols_*.png.
- Text on scatter/wild uses Impact/Arial Black fallback (system fonts, no external).
- Symbole Atomic Fizz: lit comme un cocktail (verre a pied, cerise, orange). A redessiner en soda/verre a bulles sans ambiguite d'alcool (point de vigilance regulateurs).
