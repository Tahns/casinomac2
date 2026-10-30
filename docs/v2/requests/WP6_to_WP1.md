# WP6 (LAYERS) to WP1 (SHELL, owner of en.js)

Status: open.

## A neutral title for the free-spins trigger banner
What: add one key to `src/i18n/en.js` (and `social.js` needs nothing, the text is clean):
```js
'fs.incoming': 'MISSION INCOMING',
```
Why: today the trigger banner reads `fs.trigger` = "MISSION BRIEFING" for every mission, then the WP6 dossier names the real one
("MISSION: SEALED ORDERS" / "MISSION: BALLROOM BLACKOUT"). Viewers of the 10-second test read the banner first and name the Briefing.
WP4 switches the banner to the new key when it exists (request WP6_to_WP4.md item 2). "The Briefing" is the Clearance Dial mission
only; `fs.trigger` can stay for older call sites.
