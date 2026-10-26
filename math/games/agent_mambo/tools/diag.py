"""Diagnostic: run spins of a criteria and report stats. usage: diag.py mode criteria n"""
import sys, time, random
sys.path.insert(0, "../..")
sys.path.insert(0, ".")
from gamestate import GameState
from game_config import GameConfig
from src.wins.win_manager import WinManager
mode, crit, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
cfg = GameConfig(); import os; cfg.gm_step=int(os.environ.get("GS",cfg.gm_step)); cfg.gm_cap=int(os.environ.get("GC",cfg.gm_cap)); cfg.gm_start=int(os.environ.get("GA",cfg.gm_start)); gs = GameState(cfg)
bm = [b for b in cfg.bet_modes if b.get_name()==mode][0]
gs.config.wincap = bm.get_wincap()
gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, bm.get_wincap())
gs.library={}; gs.recorded_events={}; gs.betmode=mode; gs.num_sims=n
gs.criteria=crit
wins=[]; t=time.time()
for i in range(n):
    gs.run_spin(i, None)
    wins.append(gs.final_win)
    if time.time()-t>float(sys.argv[4] if len(sys.argv)>4 else 100): break
wins=wins[:i+1]
import statistics
print(mode,crit,"n",len(wins),"time",round(time.time()-t,1),"mean",statistics.mean(wins),"max",max(wins),"median",statistics.median(wins))
