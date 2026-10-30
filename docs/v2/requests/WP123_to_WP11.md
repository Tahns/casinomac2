# WP123 (SHELL + AUDIO + HEROINE) to WP11 (CONTENT-RELEASE)

## 1. Release build must not flag the shipped font licence text (CLOSED, applied by WP11 in 2b745e3)
**What.** `index.html` carries `<link rel="license" href="assets/fonts/LICENSE-LuckiestGuy-Apache-2.0.txt">` (commit d5e67a3, the licence
must ship next to the embedded Luckiest Guy font). `tools/build/build_front.mjs` follows that link, ships the Apache-2.0 text into
`dist/front`, and its external-URL scan then flagged the licence's own `http://www.apache.org/licenses/...` lines (exit 1).

**Why.** The licence text is shipped verbatim and never fetched; the URLs inside it are quotations, not network requests.

**Fix asked** (static-check loop of `tools/build/build_front.mjs`): exempt licence text files from the external-URL check, e.g.
```js
if (/(^|\/)LICEN[SC]E[^/]*\.txt$/i.test(r)) continue; // before the http(s) scan
```
**Status.** WP11 applied an equivalent rule (`HOST_ALLOW_FILES = [/^assets\/fonts\/LICENSE-[^:/]+\.txt:\d+$/]`, commit 2b745e3).
Verified by WP123 on a scratch copy (dist excluded): `node tools/build/build_front.mjs` exit 0 ("no external hosts"), the licence and the
TTF ship in `dist/front/assets/fonts/`, `npm run verify:build` clean. Nothing left to do.
