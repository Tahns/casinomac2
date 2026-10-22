# PROGRESS (math agent)
Step1 findings: slowness = `wincap` criteria never reached (old WCAP strip diverse). Fixes:
- WCAP strip rewritten (H1 52/120, W 24, ... S 3) and wincap criteria uses WCAP only in free games.
- Free spin design change: every cell starts as 3x vein (fs_start_mult=3) and +5 per win-hit (vein_step=5); capped 512 per cell. (free game mean ~85x, median ~47x measured)
- tools/diag.py (mode criteria n timeout; env VS, SM) profiles criteria quickly.
