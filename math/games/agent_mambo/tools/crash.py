import sys, traceback
sys.path.insert(0, "../.."); sys.path.insert(0, ".")
from gamestate import GameState
from game_config import GameConfig
from src.wins.win_manager import WinManager
cfg = GameConfig(); gs = GameState(cfg)
bm = [b for b in cfg.bet_modes if b.get_name()=="bonus"][0]
gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, bm.get_wincap())
gs.library={}; gs.recorded_events={}; gs.betmode="bonus"; gs.num_sims=50000
a,b=int(sys.argv[1]),int(sys.argv[2])
for i in range(a,b):
    gs.criteria="freegame" if i%100 else "wincap"
    try: gs.run_spin(i,i)
    except BaseException:
        print("FAIL sim",i,gs.criteria); traceback.print_exc(); break
else: print("ok")
