"""Calibration knobs of Agent Mambo v2 (WP9 MATH-PIPELINE owns this file; `missions.py` / `game_config.py` read it, every name has a
default there, so deleting a line returns that knob to the code default).

HOW TO USE
  * Edit a value here to change the game for every run (books must then be re-simulated for the modes it touches).
  * One-off experiment without touching the file: env AM_CALIB='{"DIAL_STEP": {"orders": 6}, "LENS_MULT": 3}' (beats this file).
  * `python tools/calib_scan.py` runs short samples (2000 books ~15 s each) of the doors for a list of variants and prints the numbers.

WHAT IS PINNED (do not change without re-simulating and re-checking the v1 `bonus` books):
  * The `bonus` door (The Briefing) reuses the 100k published v1 books. Its dial step is config.gm_step (8) = v1; therefore the
    'briefing' key is deliberately NOT in DIAL_STEP below (the code reads config.gm_step for it), and nothing here may change the
    Briefing, the paytable, the strips or the wire of the free game: PAYTABLE_SCALE stays 1.0, WILD_COUNT stays 3/4, FUSE_PARAMS unset.
  * Seeds: per-mode offsets live in missions.SEED_OFFSETS (base 0, bonus 0 are v1).

Calibration log (what each value was decided on; numbers in PROGRESS.md and MATH_REPORT.md):
  * DIAL_STEP orders 7 / blackout 3 / lens x4 / route 6: the SYNTHESIS values; natural door pools (30x floor, SDK criteria) had mean
    113.9x / 121.5x against the gate window 70-140x, and reweight to 96.000 % RTP with a mild tilt (lam 0.0003 / 0.0012).
  * The P(R > price) >= 30 % target is reached by the two-parameter door reweight (tools/reweight_doors.py), not by the dial.
"""

# ---- mission rules ---------------------------------------------------------------------------------------------------------------
DIAL_STEP = {"orders": 7, "blackout": 3, "fuse": 2}  # briefing = config.gm_step (8), see above
LENS_MULT = 4          # Ballroom Blackout: lit cluster pays x4 on top of the dial (INTEGER >= 2: payouts stay multiples of 0.1x)
LENS_SIZE = (2, 2)     # spotlight window (w, h)
ROUTE_LEN = 6          # entries of a lightRoute

# ---- paytable / strips (v1 values: the `bonus` books depend on them) ------------------------------------------------------------
PAYTABLE_SCALE = 1.0
WILD_COUNT = {"BR0": 3, "FR0": 4}  # read by tools/make_reels.py only; the committed reels/*.csv already carry these counts

# ---- what the base game draws -----------------------------------------------------------------------------------------------------
MISSION_WEIGHTS = {"briefing": 40, "orders": 30, "blackout": 30}   # mission mix drawn at the base trigger
LAYOUT_WEIGHTS = {"mezzanine": 50, "atrium": 22, "lobby": 14, "annex": 14}  # floor plans of the base game; {'mezzanine': 1} = v1
THIRD_MISSION = "blackout"   # 'fuse' = The Long Fuse fallback (door entrance_fuse)
BASE_PROFILE = "v2"          # 'v1' = the shipped v1 shares (stop-loss of SYNTHESIS 4)

# ---- WP9 pipeline knobs (read by tools/reweight_doors.py and run.py only, never by the game code) -----------------------------------
DOOR_PIN_OVER = 0.31   # P(R > price) the door reweight aims for (target >= 0.30, hard floor 0.288 = v1); 0 / None = plain exponential tilt
