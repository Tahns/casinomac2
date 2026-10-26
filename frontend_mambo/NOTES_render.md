# NOTES_render (RENDER agent)

## Done
- index.html (all CORE ids, modals #modal-autoplay/confirm/message/info, #replay-bar/#replay-info, loading screen, i18n attrs), styles.css (landscape side-panel layout, portrait layout, compact <=360px landscape with #btn-menu popover; tested 1024x576, 800x450, 400x225, 425x812).
- src/render/: index.js (createRenderer, prepareStatic), symbols.js, scene.js (procedural cavern, veins, timber, lanterns, dust/embers, parallax), fx.js (particles), logo.js (SVG gold logo), devbooks.js (SDK-shaped synthetic books).
- src/audio.js: WebAudio synthesis, one master gain, mute saved in localStorage (key tum_muted), unlock on first gesture. Names: click error spin whoosh land pop win scatter antic fuse explosion mult fsStart retrigger fsEnd bigwin coin count drip.
- Events handled: reveal (drop in/out, anticipation), winInfo, updateTumbleWin/setTumbleWin, tumbleBoard, updateGrid (veins), freeSpinTrigger (explosion transition), freeSpinRetrigger, updateFreeSpin, freeSpinEnd (count-up), setWin (big/mega/super/epic banner >=15x, >=50x in free spins), wincap, setTotalWin, finalWin. Event amounts are divided by 100 (SDK format); hooks get multipliers of base bet.
- dev.html: harness with synthetic books (`dev.html?nodev=1` hides the dev bar; `window.__dev.run('bonus',4)`).

## Polish pass (render-polish agent)
- Symbols: clipped specular sweep (JS picks 2 random idle cells / 650 ms: `.cell.sweep`), inner glow + rim light on gems, breathing (CSS, staggered), lantern flame flicker, nugget/dynamite glow + sparkles, fuse embers. No idle CSS filters on cells (perf): shadows are baked in the sprites.
- Wins: tinted cluster + halo outline, count-up popups, combo/total chip bump, shake scaled by win size, shard count scaled by win.
- Anticipation (event `anticipation[]`): other reels dim (`.adim`), spotlight on the reel, red heartbeat frame + `heart` sound loop.
- Banners: tier colours (data-tier), tier-up flash/ring/shake/stinger, coin fountain from both lower corners, coin rain + `shower` sound, rays `.hi`.
- Bonus: `body.fs-mode` swaps palette (hot HUD/frame, `.fstint` multiply layer, darker vignette); swap happens under the explosion flash. Veins show glowing jagged cracks + shining badge. Chip "FREE SPINS n/m" hangs on the top frame (portrait hides the HUD fsbox).
- Scene: light shafts, fog, frame lantern light (`.lit`), crystal glints. fx.js lowers particle count when frames are slow, honours prefers-reduced-motion, skips particles when the tab is hidden.
- audio.js new sounds: heart, rumble, crack, shower, stinger, tick (+ `audio._sounds` test hook).
- Portrait: touch targets >=40px (tbtn, +/-), bet stat wider.

## Needs from other agents
- CORE: call `renderer.setFormat(x => fm(x * bet))` (new optional method) so popups/banners show money instead of "16.00x" (default). Re-call when the bet changes.
- CORE: initial `S.muted` should be `audio.muted` (audio restores saved mute and sets body.muted / aria-pressed itself).
- CORE: rgs_url without scheme defaults to https (mock needs `http://localhost:5180`).
- TEXT: key `label.combo` missing (falls back to "Combo").
- Mock hand-made books use plain amounts (2.5), real books use x100; renderer assumes x100.

## Todo / known
- Impact font only exists on some systems; fallback serif bold is used elsewhere.
- Scene canvases redraw on resize (debounced); cheap but not free on huge screens.
