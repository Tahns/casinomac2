# WP4 (RENDER-CORE) to WP1 (SHELL): guideline check MODAL-INERT fails, not from the render core

`node tests/guidelines/run.mjs --only=MODAL-INERT` fails on the current branch with
`runner exception: locator.click: Element is not visible ... locator('#confirm-cancel')`. The same failure appears with the committed
`src/render/index.js` (HEAD) put back, so it does not come from the WP4 changes. The UNLEASH confirm dialog seems to no longer open (or opens
hidden) on the path the check uses; the committed `tests/guidelines/REPORT.md` still shows it as PASS. Please check the confirm flow
(`#modal-confirm`, `#confirm-cancel`) against the runner, or update the runner if the flow changed on purpose.
