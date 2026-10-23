# The Unleashed Mine

Slot for the Engine platform: 6x5 cluster pays with cascades, free spins with vein multipliers, the original *Fuse Line* feature, and a direct-entry mode (UNLEASH, 100x). 1960s cartoon style with the mascot Old Gus. All art is vector art drawn in code and all sound is synthesised in the browser; no generative AI, no external hosts.

## Layout
- `math/games/the_unleashed_mine/` math (Python SDK in `math/`). Report: `MATH_REPORT.md`; regenerate and test: see that file and `PROGRESS.md`. The generated `library/` (books, lookup tables) is git-ignored (about 350 MB): regenerate it or keep the published copy.
- `frontend/` the game (static files, vanilla ES modules, no build step). `index.html` at the root of `frontend/`.
- `frontend/tests/` unit tests (`node --test frontend/tests/core frontend/tests/text`) and the Engine guideline runner (`node frontend/tests/guidelines/run.mjs`, needs `playwright-core` resolvable and Chromium; it starts its own servers).
- `docs/` decisions and reviews: `READINESS.md` (platform checklist and what to click in Studio), `SUBMISSION_TEXT.md`, `betlevels.md`, `PATENT_SCREEN.md` (research aid, not legal advice), `ORIGINAL_FEATURES.md`, `swot/`.

## Run locally
```
node frontend/serve.mjs                      # static server on 5173
node frontend/tools/mock-rgs/server.mjs      # mock RGS on 5180 (real books from frontend/fixtures)
# open http://localhost:5173/?sessionID=test&rgs_url=http://localhost:5180&lang=en&currency=USD&device=desktop&social=false&demo=false
```

## Package for the platform
```
cd frontend && npm run build        # dist/the_unleashed_mine_front_v<VERSION>.zip
cd frontend && npm run pack:math    # dist/math_upload/ (needs math/games/the_unleashed_mine/library/publish_files)
```

Nothing here is legal advice or a claim of clearance (patents, trademarks, licences).
