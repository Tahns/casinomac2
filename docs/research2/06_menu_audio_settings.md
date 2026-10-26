# 06 - Menu and audio settings: research and precise spec

Date: 2026-10-26. Angle: in-game menu, audio mix sliders, persisted preferences, accessibility, jurisdiction flags, mobile layout, tests. Screening aid only. NOT legal advice, and nothing here says a pattern is patent-free or approved by a regulator or by Engine: a human IP attorney and the Engine Studio review decide.

Evidence honesty. Reddit is unreachable (403), no Reddit claim is made. WebFetch answers come from a small summarising model, so every GitHub-derived fact is "medium". The Engine approval-guidelines page (https://studio.engine.io/docs/approval-guidelines) returned only two header images (truncated), so the Engine rule ids below come from the user-supplied copy `docs/research2/00_ENGINE_SELFCHECK_PROMPT.md`. Only one open-source slot front end with a real settings panel was found (the Stake web-sdk); a generic search found no other, and `cool-script/html5-slot-machine` has none. "Found nothing" is never "free to use".

## 1. Current state (read in this session)

| # | Fact | Where | Consequence |
|---|---|---|---|
| C1 | One mute only. `master` gain 0/0.8, `sfx` 0.9, beds on a per-mood `bus` 0.45; all feed `master -> compressor -> soft limiter`. Key `am_muted`. | `audio.js:4,49,55,397,539-557` | No volume control at all. WCAG 1.4.2 is met only through mute. |
| C2 | Bed notes and SFX share ONE reverb (`verbSend -> verb -> vo -> master`) and `tone()/noise()` always send `wet` to it. | `audio.js:58-60,101,115,399` | A music slider and an effects slider cannot be separated until the music gets its own reverb return. |
| C3 | `0.8` is hard-coded twice (option `VOL` and `setTargetAtTime(muted?0:0.8)`). | `audio.js:43,553` | Must become one computed target. |
| C4 | Two sources of truth for mute: `S.muted` in main.js and `muted` in audio.js. | `main.js:17,238-242`; `audio.js:477,548` | Settings switch, header button and storage can drift. |
| C5 | `#btn-sound` is `aria-pressed=muted` with title "SOUND". | `index.html:64`; `audio.js:486` | Reads "Sound, pressed" while sound is OFF. Use a constant label "Mute sound" (`btn.mute` exists, unused); aria-pressed stays (tests read it). |
| C6 | Menu = `#btn-menu` (only at landscape height <= 360 px) revealing SOUND / INFO / FULLSCREEN. No settings dialog. i18n keys `settings.sound/turbo/on/off` exist and are unused. | `styles.css:121,157-171`; `en.js:166-169` | New gear button and dialog needed. |
| C7 | Replay in portrait hides `#hud-ctrl` completely, and `#replay-ui` has only PLAY / TURBO / SKIP. Replay starts audio (user gesture) with NO sound control. | `styles.css:382`; `replay.js:8,100-191` | Real gap at 425x812 with `replay=true`: mute unreachable ([107] intent, WCAG 1.4.2). |
| C8 | Space handler calls `preventDefault()` for every Space press before checking `modalOpen()`. | `main.js:265-271` | Inside a settings dialog Space must toggle switches and press buttons. Needs a guard (test it, do not assume browser behaviour). |
| C9 | Flags read: `disabledFullscreen, disabledTurbo, disabledSpacebar, disabledAutoplay, disabledBuyFeature, socialCasino`. Not read: `disabledSuperTurbo, disabledSlamstop, displayNetPosition, displayRTP, displaySessionTimer, minimumRoundDuration`. | `main.js:305-313`; mock lists all 12: `tools/mock-rgs/server.mjs:100` | Matches the SDK config (S14). Gaps listed in section 5. |
| C10 | Banner tap-to-skip exists (`pointerdown` on the banner layer) and autoplay waits 500/150 ms between rounds. | `render/index.js:471-473`; `main.js:179` | Slam-stop-like and pacing flags (14E/14G family, S20) must gate these. Shared with 04 L6 and 05 S6. |
| C11 | `REDUCE` is a load-time constant in 13 places; CSS media block only. No in-game motion setting. | `render/index.js:29`; `styles.css:447-453`; `index.html:143` | Menu needs the live motion store from `05_juice_animation.md` S1. |
| C12 | Rules tabs have `role=tab` and `aria-selected` but no `tabpanel`, `aria-controls`, roving tabindex or arrow keys. Escape handled only for rules. No focus return on close. | `rules.js:234-248,270-275` | Extract one APG-compliant tabs helper, reuse for Settings. |
| C13 | Guideline tests already cover: [107] mute graph, MENU-400x225, MODAL-INERT, [227] no scroll (rules open), [223], [235]-style RULES text check, [239]/[240] lang scans, [77]/[225]/[78] social scans (only autoplay, unleash-confirm, info screens), [228] Space, replay [171-174,243,188]. | `tests/guidelines/run.mjs:37-58,184,274,305,324,389-482`; `tests/audio/audio.test.mjs` | Settings dialog is in NONE of the screen scans. |

## 2. External evidence (what each source supports)

| Claim | Source | Quality |
|---|---|---|
| Audio that plays automatically > 3 s needs a pause/stop OR a volume control independent of system volume; volume must reach zero; muting the system is not enough. Audio started by a clear user action is exempt. | WCAG 1.4.2 (Level A) https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html | strong (text); interpretation for a bed that starts on any first click: medium |
| SDK sound state: three volumes `volumeValueMaster/Music/SoundEffect`, default 75 each, music and effects multiplied by master, NO mute field, NO persistence. | https://raw.githubusercontent.com/StakeEngine/web-sdk/main/packages/state-shared/src/stateSound.svelte.ts | medium |
| SDK settings modal = exactly three range sliders (0-100) under `ModalSettings`; slider component has an ON/OFF button (0 <-> 50), a numeric readout, no aria attributes. | `.../components-ui-html/src/components/ModalSettings.svelte`, `ModalSettingsSound.svelte` | medium |
| SDK header sound switch toggles master 0 <-> 50 and emits `soundPressGeneral`. | `.../components-ui-pixi/src/components/ButtonSoundSwitch.svelte` | medium |
| SDK audio: Howler; effects re-apply volume reactively; global `Howler.mute` when the page is hidden or the context is not running; no gesture-unlock code in that file. | `.../packages/utils-sound/src/createSound.svelte.ts` | medium |
| SDK `jurisdiction` block: `socialCasino, disabledFullscreen, disabledTurbo, disabledSuperTurbo, disabledAutoplay, disabledSlamstop, disabledSpacebar, disabledBuyFeature, displayNetPosition, displayRTP, displaySessionTimer, minimumRoundDuration` (all default off/0). SDK `ButtonTurbo` does not check the flags; turbo "persistent" is only an in-memory lock; `isSpaceHold` enables continuous bet. | `.../state-shared/src/stateConfig.svelte.ts`, `stateBet.svelte.ts`, `ButtonTurbo.svelte` | medium |
| SDK modals: `error, betAmountMenu, buyBonus, buyBonusConfirm, autoSpin, autoSpinMessage, payTable, gameRules, settings`. No history modal. UI buttons: bet, +/-, turbo, autospin, buy bonus, menu, pay table, game rules, settings, sound switch. | `.../stateModal.svelte.ts`; `components-ui-pixi/src/components` listing | medium |
| Repo layout (apps lines/cluster/ways/scatter/price; packages utils-sound, state-shared, components-ui-html/pixi). | https://github.com/StakeEngine/web-sdk | medium |
| Official RGS doc shows `jurisdiction` with `socialCasino`, `disabledFullscreen`, `disabledTurbo`, then "..." (flags elided). Units of `minimumRoundDuration` are not documented. | repo `math/docs/rgs_docs/RGS.md:254-260` | strong (that it is elided) |
| UKGC RTS update of 31 Oct 2021 lists: 14E speed-up features (turbo, slam stop), 8A autoplay, 14F celebration of returns at or below stake, 2E and 13C net position and time display, 14G 2.5 s minimum spin speed for slots. Numbering differs between UKGC pages (another labels the 2.5 s rule 14D), so cite the current RTS before using a number. | https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/rts-previous-changes ; secondary: https://cms.law/en/gbr/legal-updates/gambling-white-paper-consultations-remote-game-design | medium |
| Separate volume controls or mutes for effects, speech, music; Xbox lists music, voice-over, active effects, ambient effects as independent categories. | https://gameaccessibilityguidelines.com/provide-separate-volume-controls-or-mutes-for-effects-speech-and-background-music/ ; https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/105 (search summaries, pages not opened) | weak-medium |
| Slider keys: Left/Down decrease, Right/Up increase, Home/End, optional PageUp/PageDown; role slider needs `aria-valuenow/min/max`, `aria-valuetext` when the number is not friendly; label required; test touch AT before production. | https://www.w3.org/WAI/ARIA/apg/patterns/slider/ | strong |
| Modal dialog: Tab wraps inside, Escape closes, focus moves in on open and returns to the opener, `role=dialog`, `aria-modal`, `aria-labelledby`. | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | strong |
| MDN: use `input type=range` for volume and a checkbox for mute, consider `role=switch`; create or resume the AudioContext inside a gesture; `AudioParam` calls win over later `.value` writes. | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices | strong |
| `setTargetAtTime`: exponential approach, 95 % after 3 time constants; use `timeConstant = duration/3`. (That it prevents zipper noise is general knowledge, not on the page.) | https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime | strong / zipper claim weak |
| Target size minimum 24x24 CSS px (AA) with spacing exception; flashes <= 3 per second, area 341x256 at 1024x768 (2.3.1); animation from interaction can be disabled (2.3.3, AAA, strong); character-key shortcuts need off/remap/focus-only (2.1.4, A). | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ; .../three-flashes-or-below-threshold.html ; .../animation-from-interactions.html ; .../character-key-shortcuts.html | strong |
| `prefers-reduced-motion`: scaling and panning large objects is the vestibular trigger; replace with opacity rather than delete; JS needs `matchMedia(...).addEventListener('change')`. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | strong |
| Cross-site iframes get partitioned storage; Safari's third-party localStorage was reported non-persistent (2017 bug, dated); private mode treats localStorage like sessionStorage. | https://developer.chrome.com/docs/privacy-sandbox/storage-partitioning ; https://bugs.webkit.org/show_bug.cgi?id=168631 (search summaries) | medium / weak |
| `navigator.audioSession.type='playback'` exists but is experimental with limited availability; its effect on the iOS silent switch is NOT confirmed. | https://developer.mozilla.org/en-US/docs/Web/API/AudioSession | strong (status) / effect unverified |
| Audio-taper volume controls: perceived loudness is roughly logarithmic, so a dB-linear slider with a floor is the norm. Nothing Web-Audio-specific found. A Google patent on "volume control rates" (US10103702B2) surfaced in the same search; NOT read, NOT screened. | https://learn.microsoft.com/en-ie/Windows/Win32/coreaudio/audio-tapered-volume-controls ; https://patents.google.com/patent/US10103702 | weak |

Game history and replay entry: no history modal in the SDK and no history endpoint in `math/docs/rgs_docs`. Replay exists only as the URL mode (`replay=true&game&version&mode&event`). Recommendation: NO in-game history list; at most a neutral "Last round" line (section 3, Info tab) built from `S.lastRound`. A "replay this round" link needs an event id that no RGS response in our docs exposes (open question 3).

## 3. Menu spec

Entry points. `#btn-settings` (gear, new) joins `.tools` after `#btn-sound` (order: sound, settings, info, fullscreen). `#btn-sound` stays the one-tap mute in the main row. At landscape height <= 360 px the gear sits inside the `#btn-menu` popup; budget at 400x225: 4 buttons of about 33 px plus gaps is about 150 px, fits. The outside-click closer (`main.js:248-253`) must also close the popup when the gear is used. Opening uses the existing `openModal()`/`closeModal()` so `syncInert`, `.modal` styling and the MODAL-INERT test keep working. Add the same gear (Sound and Display tabs only) to replay mode, in both orientations (fixes C7).

Dialog `#modal-settings` (`role=dialog aria-modal=true aria-labelledby=set-title`), 4 tabs (APG tabs helper `src/ui/tabs.js`, also adopted by rules.js), close button with `data-close` and an accessible name (the QA `closeOverlays()` already clicks `[data-close]` and presses Escape). On open: store opener, focus the active tab; on close: restore focus to the opener, else `#btn-bet`. Width `min(520px,94vw)`; at height <= 360 px two columns, rows >= 24 px tall with >= 6 px spacing, internal scroll allowed, page scroll never.

| Tab | Control (id) | Type | Default | Storage | Gating and notes |
|---|---|---|---|---|---|
| Sound | Mute all (`set-mute`) | switch (checkbox `role=switch`) | off | `am_muted` '1'/'0' (exists) | Mirrors `#btn-sound`; one handler `audio.setMuted()`. |
| Sound | Master (`set-vol-master`) | range 0-100 step 1 + `<output>` | 75 | `am_vol_master` | `aria-valuetext` "75 percent"; test sound on `change`. |
| Sound | Music (`set-vol-music`) | range | 75 | `am_vol_music` | Bed only. |
| Sound | Effects (`set-vol-sfx`) | range | 75 | `am_vol_sfx` | Stingers, wins, UI clicks, wire, mascot. |
| Sound | status line + "Turn sound on" | text + button | hidden | none | Shown when muted or master 0 or both mixes 0. Never auto-unmutes. |
| Display | Motion (`set-motion`) | radio group Auto / Full / Calm / Still | auto | `am_settings.motion` | Auto follows `prefers-reduced-motion` live. Calm and Still change motion only, never round timing (05 section 7). |
| Display | Reduce flashes (`set-flash`) | switch | off (on if reduced-motion) | `am_settings.flash` | The flash governor (05 S4) is always on; this lowers the cap further. |
| Display | High contrast (`set-contrast`) | switch | `prefers-contrast: more` | `am_settings.contrast` | Sets `html[data-contrast]`. |
| Display | Text size (`set-text`) | segmented 100 / 115 / 130 | 100 | `am_settings.text` | P2; multiplies `--fs`; must pass the no-overflow test at 4 viewports. |
| Display | Session summary (`set-ledger`) | switch | on | `am_settings.ledger` | Forced on and disabled when `displayNetPosition` or `displaySessionTimer`. Cannot be hidden by a quiet audio setting. |
| Play | Turbo (`set-turbo`) | switch | off | NOT persisted | Hidden when `disabledTurbo`; mirrors `#btn-turbo`. Resets every load. |
| Play | Autoplay | button -> `#modal-autoplay` | - | none | Hidden when `disabledAutoplay`. Never persisted. |
| Play | Break reminder (`set-remind`) | select Off / 15 / 30 / 60 min | off | `am_settings.remind` | P2. Neutral wording, modal message, independent of audio. |
| Info | Game rules / Win table / Controls / Modes and RTP | 4 buttons -> `#modal-info` tab | - | none | Win table label is "Win table" in social mode (existing). |
| Info | RTP line | text | shown | none | From `rules_data.json`; emphasised when `displayRTP`. Must equal the math. |
| Info | Language | read-only text "English" | - | none | Only `en` ships; `lang` unknown falls back to English ([240]). No selector until a translation exists. |
| Info | Session summary + Last round | text | on | none | Net change, elapsed, rounds from the session ledger; "Last round" optional P2. No celebratory tone. |
| Info | Version | text | - | none | From build `VERSION`. No "Powered by" text ([275]). |
| all | Reset to defaults | button | - | clears `am_*` | Does not touch flags or RGS state. |

Do not ship an Ambient/Voice slider (04 L4 suggests one): there is no ambient or voice bus. The engine registry (section 4) makes a fourth bus a 10-line change when a mission adds ambience.

Keyboard and a11y rules for the dialog. Native `input type=range` (arrow, Home, End, PageUp/PageDown work natively) with a `<label>` and `aria-valuetext`; `role=switch` for on/off; `aria-live=polite` status line for "Sound off"; visible `:focus-visible` (exists, `styles.css:40`); no new single-character shortcuts (WCAG 2.1.4; Space stays as the Engine-mandated spin key, gated by `disabledSpacebar`); Space handler returns early when a modal is open or the target is a form control inside a modal (C8); Escape closes; sliders and toggles >= 24x24 CSS px (2.5.8); touch drag on a range inside `touch-action:none` ancestors must be checked on a real phone (APG warns about touch AT).

Wording. Labels avoid restricted social words (use "Play", "Balance", "Win table"; no "bet", "pay", "cash", "credit", "currency"). Add i18n keys `settings.title, settings.tab.{sound,display,play,info}, settings.mute, settings.vol.{master,music,sfx}, settings.vol.value, settings.test, settings.soundOff, settings.turnOn, settings.motion(.auto|.full|.calm|.still), settings.flashes, settings.contrast, settings.textSize, settings.ledger, settings.autoplay, settings.reminder, settings.reset, settings.language, settings.version`. Update `rules.js` Controls tab ([235]): add SETTINGS (what each slider does, that mute silences everything, that turbo and autoplay are not saved) and say "Mute sound" for the header button.

## 4. Storage

Rule: wrap every read and write in try/catch, render correctly with nothing stored, keep an in-memory copy (private mode, blocked data, cross-site iframe partitioning, S23). Persistence is best effort and must never block play.

| Key | Owner | Value | Notes |
|---|---|---|---|
| `am_muted` | `audio.js` | '1' / '0' | Exists. Tests read it directly; keep. |
| `am_vol_master`, `am_vol_music`, `am_vol_sfx` | `audio.js` | integer string 0-100 | `audio.js` owns audio keys so `tests/audio/harness.html` (which imports only audio.js) keeps working. Parse with `parseInt`, reject NaN, clamp; missing -> 75. |
| `am_settings` | new `src/settings.js` | JSON `{v:1, motion, flash, contrast, text, ledger, remind}` | Whitelist enums, clamp numbers, drop unknown keys, wrong `v` -> defaults. Debounce writes 200 ms, flush on `pagehide`. |
| not stored | - | turbo, autoplay, bet, dialog state | Persisting speed-ups could silently re-enable them in a market that later disables them; the SDK also keeps turbo in memory only (S17). |
| never stored | - | `lang`, `social`, `currency`, jurisdiction flags | URL or RGS driven. |

`settings.js` API: `get(k)`, `set(k,v)`, `on(k|'*',fn)` returning an unsubscribe, `capabilities` (derived from the RGS `jurisdiction`, section 5). It writes `data-motion`, `data-contrast`, `data-text` on `<html>`; CSS and `render/` subscribe. It replaces the `REDUCE` constants (shared work item with 05 S1).

## 5. Jurisdiction flag matrix (what the menu must do)

| Flag | UI effect | State today |
|---|---|---|
| `socialCasino` | Social wording everywhere including the settings dialog | done (`main.js:312`) |
| `disabledFullscreen` | hide `#btn-fullscreen` | done |
| `disabledTurbo` | hide `#btn-turbo` and `set-turbo`; force `S.turbo=false` | partly (button only) |
| `disabledSuperTurbo` | we have one turbo level; nothing to hide, but SKIP in replay uses factor 0.04 | not read; decide per open question 2 |
| `disabledSlamstop` | disable banner tap-skip until the amount has fully counted up; never offer skip during the result | not read (C10) |
| `disabledAutoplay` | hide `#btn-autoplay` and the Play-tab button | button only |
| `disabledSpacebar` | ignore Space; hide the "Space starts a spin" hint | done |
| `disabledBuyFeature` | hide `#btn-unleash` | done |
| `displayNetPosition`, `displaySessionTimer` | session summary on and locked in Display tab and visible in the HUD | not read |
| `displayRTP` | RTP line emphasised in Info tab and at the top of the rules | not read; semantics unknown |
| `minimumRoundDuration` | next round cannot start before `t0 + min` even in turbo and autoplay; assume milliseconds, mock default 0; UKGC slot minimum is 2.5 s (S20) | not read |

All twelve are also needed in the mock for tests (already there). Sound has no flag, so audio controls are never hidden.

## 6. Audio wiring (src/audio.js)

Target graph (new nodes in bold):

```
sfx(0.9) -> **sfxBus** -+
verbSend -> verb -> vo -> **sfxBus** (SFX reverb, unchanged)
sfxSpring -> **sfxBus**    ........................................................+-> master (VOL*taper, mute) -> comp -> limiter -> destination
bed bus(0.45) -> **musicBus** -+
bed send(0.12) -> **verbSendM -> verbM -> voM** -> **musicBus** (own convolver)
```

Changes, with places:
1. Add `sfxBus`, `musicBus` (gain 1 each) feeding `master` (`audio.js:49-60,68`). Re-point `sfx`, `vo`, `sfxSpring` to `sfxBus`.
2. Add `verbM/verbSendM/voM` (reuse the same impulse buffer object, `audio.js:58`). In `tone()` and `noise()` choose `const vs = bed ? verbSendM : verbSend` instead of `verbSend` (`audio.js:101,115`). All bed voices already pass `bed:true`; this is a 2-line routing change with no signature churn. `newBus()` connects `bus -> musicBus` and `send -> verbSendM` (`audio.js:398-399`). Without this, 3 percent of every bed note would leak into the effects slider.
3. `engine.setVolumes({master,music,sfx,muted})` computes targets and ramps: `node.gain.cancelScheduledValues(t); node.gain.setTargetAtTime(g, t, 0.03)` (95 % in about 90 ms, no zipper noise; mute keeps the existing 0.02 constant). Master target = `muted ? 0 : 0.8 * taper(master)`. This removes the duplicated `0.8` (C3). Expose `sfxBus, musicBus, taper` on the engine object (`audio.js:466-471`) for offline tests.
4. Taper (pure, unit-testable): `s=0 -> 0`; `1..75: dB = -45*(75-s)/75`; `76..100: dB = +3*(s-75)/25`; `gain = 10^(dB/20)`. Computed table: 1 -> -44.4 dB, 25 -> -30, 50 -> -15, 60 -> -9, 75 -> 0, 100 -> +3 dB (x1.41); strictly increasing. Slider 75 equals today's tuned mix (master 0.8, bed 0.45, sfx 0.9), so existing peak and mute assertions stay valid at defaults and the SDK default of 75 (S13) is matched. Shape is a judgement call (weak evidence, section 2); the 0 dB reference and +3 dB cap are chosen so master and music at 100 add +6 dB before the existing compressor and limiter. No listening test was possible here.
5. `audio` API additions: `setVolume(kind,pct)`, `getVolume(kind)`, `volumes`, `preview(kind)`, `onChange(fn)`; `kind` in `master|music|sfx`. `setMuted` stays the only mute entry; `main.js` stops keeping `S.muted` and reads `audio.muted` (C4). `syncUi` also updates the settings switch and sets `body.muted` when master is 0 or both mixes are 0 (the header icon then shows the X, honest state). Clicking `#btn-sound` in that state restores the last non-zero values (SDK toggles 0 <-> 50; we remember the previous level).
6. Zero handling. In `tick()` replace the `muted` test with `musicOn = !muted && master>0 && music>0`; when false, release the bus and set `bed.cur='off'` so raising the slider restarts on a bar line through `applyMood()`. In `audio.play()` return early when `sfx==0` or `master==0` (saves voices; same "nothing queued" guarantee as mute).
7. Preview. On slider `change` (not every `input`), rate-limited to one per 250 ms and skipped while muted: new neutral id `settingsTest` (short bongo + one vibraphone note, no coin or bell timbres). Do not use `win`, `coin`, `kaching`, `bigwin` as previews: they are win cues, and playing them with no result conflicts with the no-celebration principle (04 L3, 05 S5). Music slider preview = the bed itself (audible), no extra sound.
8. Ducking (P2): a `duck` gain between `musicBus` and `master` for -6 dB under `bigwin` and `fsStart`, independent of the user slider so they never fight.
9. Unlock and visibility stay as is (`audio.js:525-537`): context created on the first gesture, suspended while hidden. Optional `navigator.audioSession.type='playback'` where present: effect on iOS unverified, needs a device test.
10. The bed is audible >3 s after any first click, so WCAG 1.4.2 is met by the Sound tab plus `#btn-sound`; add a one-time "Sound on / Sound off" choice on the start splash from 04 L7 (P1), default from the saved mute.

Event wiring summary: `slider input -> audio.setVolume -> gain ramp + persist am_vol_* + audio.onChange (readouts, body.muted)`; `slider change -> audio.preview`; `mute switch or #btn-sound -> audio.setMuted`; `motion/flash/contrast -> settings.set -> data-* attrs + render subscriptions`; `ledger -> HUD + Info tab`; `turbo switch or #btn-turbo -> one function setTurbo(b)` (updates both controls, `renderer.setTurbo`, `aria-pressed`).

## 7. Tests to add

Unit (`tests/core`, node:test):
- U1 taper: `taper(0)=0`, `taper(75)=1`, strictly increasing 1..100, `taper(100)` within 1e-9 of 10^(3/20), `taper(1) < 0.01`.
- U2 stored-value parsing: 'abc', '', '-5', '150', '1e9', '75.5', null -> default or clamped integer; corrupt JSON, wrong `v`, unknown enum -> defaults.
- U3 storage failure: stubbed `localStorage` whose getter throws `SecurityError`, and one whose `setItem` throws `QuotaExceededError` -> no throw, in-memory values work.
- U4 `applyJurisdiction(flags)`: all-false mock -> everything enabled; each of the 12 flags alone -> only its capability changes; unknown keys ignored; `displayNetPosition` locks the ledger on.
- U5 `remainingRoundMs(t0,now,min)` incl. turbo and autoplay gaps.

Audio offline (`tests/audio/audio.test.mjs`, OfflineAudioContext):
- A1 music=0 -> bed render peak < 1e-4 while `SOUNDS.win` render is unchanged; sfx=0 -> inverse.
- A2 routing leak: sfx=0, music=1 keeps a reverb tail from the bed; music=0, sfx=1 keeps the SFX tail (proves two reverb returns).
- A3 headroom: all sliders 100, loudest scene (explosion + bigwin level 4 + shower + bed) -> post-limiter peak <= 0.97, no NaN; log the pre-limiter peak.
- A4 defaults bit-equal or within 0.1 dB RMS of the current engine render (regression guard).
- A5 voice cap and `killAll` unchanged.

Audio live (same file, Playwright):
- L1 move each slider via `input` events, reload -> restored; localStorage keys are exactly the four names.
- L2 invalid stored values (`am_vol_music='999'`, 'abc') -> clamped, no pageerror.
- L3 storage blocked via `addInitScript` throwing getter -> boots, sliders work, no console error.
- L4 muted then slider moves -> `master.gain < 0.001`, `liveCount===0`; unmute -> bed returns, `musicBus.gain` equals the taper value.
- L5 music=0 -> `liveCount < 8` within 1.5 s; raise -> bed returns.
- L6 master=0 -> `body.muted`, `#btn-sound` click restores the last non-zero level.
- L7 preview plays on `change` once per 250 ms and not while muted.

Guidelines runner (`tests/guidelines/run.mjs`, mock RGS):
- G1 extend `collectScreens()` with `tryOpen('settings','#btn-settings')` and a tab walk, so [77], [225], [78], [239], [240] cover the dialog; add 'settings' to the RULES controls list.
- G2 SETTINGS-OPEN at the 4 viewports: dialog inside the viewport, no page scroll (extend [227] probe), every control >= 24x24, Escape closes, focus returns to `#btn-settings`, no `[inert]` left, Space on a focused switch toggles it, no `/wallet/play` while open (reuse MODAL-INERT steps).
- G3 SETTINGS-107: with non-default sliders the header mute and the switch silence the graph (reuse the [107] probe); master 0 is silent.
- G4 SETTINGS-FLAGS: for each flag via `mockCfg({jurisdiction})` assert the matching controls are absent from DOM and dialog; `minimumRoundDuration:2500` -> idle again no earlier than 2.5 s from press even in turbo and autoplay; `displayNetPosition` -> ledger visible and switch disabled; `disabledSlamstop` -> banner tap does not skip before the count-up ends.
- G5 SETTINGS-REPLAY: `replay=true` at 425x812 and 1024x576 -> a sound control and the gear are reachable; opening settings makes no wallet call.
- G6 SETTINGS-MOTION: choosing Still sets `html[data-motion=still]` and no infinite animation keeps running on `#app`; Auto follows `page.emulateMedia({reducedMotion:'reduce'})` live without reload; persisted after reload.
- G7 SETTINGS-KB: sliders have accessible names and `aria-valuetext`; Home/End/Arrow/PageUp change values; Tab never leaves the dialog; tab list uses arrow keys.
- G8 social scan with `social=true` currency XSC and the dialog open: no restricted words, no "$".
- G9 screenshots `tests/shots/qa_settings_*.png` for the 4 viewports (NEEDS A HUMAN).
- Static (`static.mjs`): every `localStorage` access sits inside try; no `new Audio(` or `<audio>` outside the engine; every `data-i18n` key exists in `en.js`; no `fetch` in settings code.

Always NEEDS A HUMAN: audibility and loudness balance on real speakers and Bluetooth, range-slider touch drag on a phone, iOS silent switch behaviour, screen-reader pass (NVDA/VoiceOver) of the dialog.

## 8. Plan

| Prio | Item | Size |
|---|---|---|
| P0 | `settings.js` store + jurisdiction capabilities (all 12 flags, `minimumRoundDuration`, ledger, slamstop gate) | M |
| P0 | Audio buses, own music reverb, `setVolume`, taper, zero handling, single mute source, `btn.mute` label | M |
| P0 | `#modal-settings` Sound + Info tabs, gear button, replay access fix (C7), Space guard (C8), focus return, Escape | M |
| P0 | Tests U1-U5, A1-A5, L1-L7, G1-G5, G8 | M |
| P1 | Display tab wired to the 05 S1 motion store and S4 flash governor, contrast, tabs helper (rules.js too), ledger HUD, start-splash sound choice | M |
| P2 | Text size, break reminder, ducking, "Last round" line, ambience bus, audio sync offset (05 open question 6) | S-M |

## 9. Risks and zones to avoid

- Do not persist turbo or autoplay, add single-letter shortcuts, auto-unmute on a slider move, or use win-like sounds as slider previews.
- Do not let any audio setting hide the session ledger or the reminder; mandatory items stay locked on.
- Do not copy web-sdk code: only observed patterns are used; the SDK licence was not checked.
- IP: sliders, mute and accessibility toggles are generic conventions, but this is NOT a patent clearance. The volume-control patent US10103702B2 surfaced and is unread; a human attorney screens anything beyond a plain slider and a standard taper.
- Rule ids [107], [235], [228], [104], [31], [223] come from the user-supplied copy; Engine may hold settings-specific rules this session could not retrieve.

## 10. Open questions

1. Exact names, units and meaning of `minimumRoundDuration`, `displayRTP`, `displayNetPosition`, `displaySessionTimer` (RGS.md elides them); assumed milliseconds and "show RTP in the info area".
2. Replay does not call authenticate, so it has no flags: may replay offer SKIP and TURBO where the live game hides turbo or slam stop?
3. Does any RGS response give a bet or event id usable for an in-game "replay this round" link?
4. iOS silent switch with WebAudio, and whether `audioSession` helps: device test.
5. Is localStorage usable when the game is framed cross-site by an operator? Persistence is best effort until observed.
6. Default 75 and the +3 dB cap were not listened to; confirm on devices.
7. Should the Ambient/Voice slider of 04 L4 ship? Recommended: not until an ambience or voice bus exists.

## Sources

WCAG 1.4.2 https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html ; 2.3.1 https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html ; 2.3.3 https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ; 2.5.8 https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ; 2.1.4 https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html ; APG slider https://www.w3.org/WAI/ARIA/apg/patterns/slider/ ; APG dialog https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ ; MDN Web Audio best practices https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices ; MDN setTargetAtTime https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime ; MDN prefers-reduced-motion https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ; MDN AudioSession https://developer.mozilla.org/en-US/docs/Web/API/AudioSession ; Stake web-sdk https://github.com/StakeEngine/web-sdk (files under packages/state-shared/src, packages/components-ui-html/src/components, packages/components-ui-pixi/src/components, packages/utils-sound/src) ; UKGC https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/rts-previous-changes ; https://cms.law/en/gbr/legal-updates/gambling-white-paper-consultations-remote-game-design ; https://www.wiggin.co.uk/?p=24018 ; Game Accessibility Guidelines and Xbox URLs in section 2; storage partitioning https://developer.chrome.com/docs/privacy-sandbox/storage-partitioning ; https://bugs.webkit.org/show_bug.cgi?id=168631 ; audio taper https://learn.microsoft.com/en-ie/Windows/Win32/coreaudio/audio-tapered-volume-controls ; https://patents.google.com/patent/US10103702 ; https://github.com/cool-script/html5-slot-machine. Local: `docs/research2/00_ENGINE_SELFCHECK_PROMPT.md`, `04_attractiveness.md` (L4-L6), `05_juice_animation.md` (S1, S4, section 7), `math/docs/rgs_docs/RGS.md:254`, `frontend_mambo/tools/mock-rgs/server.mjs:100`.
