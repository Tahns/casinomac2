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
