# PROGRESS (math agent)
Step1 findings: slowness = `wincap` criteria never reached (old WCAP strip diverse). Fixes:
- WCAP strip rewritten (H1 52/120, W 24, ... S 3) and wincap criteria uses WCAP only in free games.
- Free spin design change: every cell starts as 3x vein (fs_start_mult=3) and +5 per win-hit (vein_step=5); capped 512 per cell. (free game mean ~85x, median ~47x measured)
- tools/diag.py (mode criteria n timeout; env VS, SM) profiles criteria quickly.
- Cargo.toml was missing (gitignored *.toml): recreated math/optimization_program/Cargo.toml from env copy + toml=0.9.7 (needs git add -f).
- retuned: fs_start_mult=4, vein_step=6 (bonus FG natural mean ~103, median ~59). 5e4 run gave RTP .96/.96 hit .29 median 36 (before retune). Next: 1e5 sims + OPT=1 full run (log /tmp/claude-0/math_run.log), then tests/report/fixtures.
- 1e5 bonus OOM-killed (cgroup); fixed with batching_size=12500.
- bonus: scatter_triggers {4:4,5:3,6:1} (10/12/15 spins) & opt scaling 20-40 x0.5 to lift median; rerunning bonus 1e5 (SIMS_BASE=0) + OPT
- added bonus criteria fgfloor (>=40x filter in check_repeat), freegame rtp .15 / fgfloor .809; rerun bonus 1e5 (SIMS_BASE=0, OPT=1)
- OOM again -> batching_size 6250
- freegame+fgfloor combo made optimizer miss targets (RTP .81): bonus now only wincap + fgfloor(>=30x) rtp .959
v4 step A (math agent v4): v3 config had fgfloor4..7 criteria but game_optimization.py still had a single "fgfloor". Rewrote optimizer: one fence per tier, hr pinned to shares (88/10/1.78/~0.2 %), tier rtp (TIER_RTP). Natural tier means (diag, 10 spins, floor 30): SM4/VS6 mean 139 median 89 (optimizer would squash heavily); SM3/VS3 mean ~101 median 69 -> chosen fs_start_mult=3 vein_step=3. Quotas .001/.55/.25/.12/.079. Next: full run SIMS_BASE=1e5? (base FG also changes) + OPT=1, log /tmp/claude-0/run_v4.log
v4 step B: full run (OPT=1, 1e5 base+bonus) started 13:00, log /tmp/claude-0/run_v4.log pid 28045; test_bonus_scatter_tiers added to tests/test_math.py
v4 step B2: first run hung: fgfloor7 (7-8 scatters) can never be forced (SDK forces max 1 scatter/reel, 6 reels) -> infinite loop. Fix in game_override.py: force 6 then add extra S on random cells; clamp 9+ scatters to 8-award; check_repeat keeps only books whose real trigger scatter count is in the criterion tier (tumbles can add scatters). TIER_RTP retuned (.823/.109/.024/.003). Relaunching full run OPT=1 log /tmp/claude-0/run_v4.log
