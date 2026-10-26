"""Fuse diagnostic: fusediag.py mode criteria n [timeout]; env FUSE=0 disables, FUSE_B/FUSE_F='len,b0,adv,detmin' sets base/free params."""
import sys, time, os, statistics, collections
sys.path.insert(0, "../.."); sys.path.insert(0, ".")
from gamestate import GameState
from game_config import GameConfig
from src.wins.win_manager import WinManager
mode, crit, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
cfg = GameConfig()
if os.environ.get("FUSE", "1") == "0":
    cfg.fuse_params = {}
for k, gt in (("FUSE_B", cfg.basegame_type), ("FUSE_F", cfg.freegame_type)):
    if os.environ.get(k):
        l, b, a, d = map(int, os.environ[k].split(","))
        cfg.fuse_params[gt] = {"len": l, "b0": b, "adv": a, "detmin": d}
gs = GameState(cfg)
bm = [b for b in cfg.bet_modes if b.get_name() == mode][0]
gs.config.wincap = bm.get_wincap()
gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, bm.get_wincap())
gs.library = {}; gs.recorded_events = {}; gs.betmode = mode; gs.num_sims = n; gs.criteria = crit
wins = []; t = time.time(); cnt = collections.Counter(); spins = collections.Counter()
for i in range(n):
    gs.run_spin(i, None)
    wins.append(gs.final_win)
    gtype = "base"
    for e in gs.book.events:
        ty = e["type"]
        if ty == "reveal": gtype = e["gameType"]
        if ty.startswith("fuse"):
            cnt[(gtype, ty)] += 1
        if ty == "reveal": spins[gtype] += 1
    if time.time() - t > float(sys.argv[4] if len(sys.argv) > 4 else 100): break
print(mode, crit, "n", len(wins), "time", round(time.time() - t, 1), "mean %.2f median %.1f max %.0f" % (statistics.mean(wins), statistics.median(wins), max(wins)))
print("spins", dict(spins))
for gt in spins:
    print(gt, {ty: "%.4f" % (cnt[(gt, ty)] / spins[gt]) for (g, ty) in cnt if g == gt})
