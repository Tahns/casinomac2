"""SDK ground truth for docs/research2/gap_02_Q2.md (research only; never writes into math/).
Run it on a SCRATCH COPY of math/ (src + games/agent_mambo, no library/), with the repo venv python:
  MAMBO_SDK_COPY=/path/to/copy  math/env/bin/python gap_02_Q2_sdk_check.py natural base 200000
  MAMBO_SDK_COPY=/path/to/copy  math/env/bin/python gap_02_Q2_sdk_check.py natural bonus 8000
  MAMBO_SDK_COPY=/path/to/copy  math/env/bin/python gap_02_Q2_sdk_check.py xcheck 3000
natural: real GameState with the rejection filter (check_repeat) switched off, i.e. the UNWEIGHTED pool.  base = criteria
  "basegame" (the SDK re-draws boards that trigger free spins, so this is the non-trigger pool); bonus = criteria
  "fgfloor4" (forced 4 scatters, 10 spins, no 30x floor).
xcheck: proxy evaluators (cluster, per-symbol scatter pays, ways) versus the real SDK Cluster / Scatter / Ways classes."""
import sys, os, time, json, statistics, random
ROOT = os.environ["MAMBO_SDK_COPY"]
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "games", "agent_mambo"))
os.chdir(os.path.join(ROOT, "games", "agent_mambo"))
os.environ.setdefault("MAMBO_REELS", os.path.join(ROOT, "games", "agent_mambo", "reels"))
HERE = os.path.dirname(os.path.abspath(__file__))
from gamestate import GameState
from game_config import GameConfig
from src.wins.win_manager import WinManager


def natural(mode, n, seed0=0):
    cfg = GameConfig(); gs = GameState(cfg)
    gs.check_repeat = lambda: None
    bm, crit = ("base", "basegame") if mode == "base" else ("bonus", "fgfloor4")
    b = [x for x in cfg.bet_modes if x.get_name() == bm][0]
    gs.config.wincap = b.get_wincap()
    gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, b.get_wincap())
    gs.library = {}; gs.recorded_events = {}; gs.betmode = bm; gs.num_sims = n; gs.criteria = crit
    wins = []; hit = 0
    for i in range(n):
        gs.run_spin(seed0 + i, None)
        wins.append(gs.final_win)
        hit += gs.win_manager.basegame_wins > 0
    m = statistics.mean(wins); sd = statistics.pstdev(wins)
    print(json.dumps(dict(mode=mode, n=n, mean=round(m, 4), sd=round(sd, 3), cv=round(sd / m, 3),
                          p_gt_stake=round(sum(w > (1.0 if mode == "base" else 100.0) for w in wins) / n, 5),
                          hit=round(hit / n, 4) if mode == "base" else None)))


def xcheck(N):
    sys.path.insert(0, HERE)
    import importlib
    R = importlib.import_module("gap_02_Q2_rules_sim")
    from src.calculations.cluster import Cluster
    from src.calculations.scatter import Scatter
    from src.calculations.ways import Ways
    cfg = GameConfig(); gs = GameState(cfg)
    g = R.Geo(R.full()); rng = random.Random(7); S = R.STR["BR0"]
    ps = R.RULES["scatter_ps5"][2]["mins"]
    bad = {"cluster": 0, "scatter_ps": 0, "ways4": 0, "ways3": 0}; nz = dict.fromkeys(bad, 0)

    def table(kind):
        t = {}
        if kind == "scatter_ps":
            for s in R.PAYERS:
                for n in range(ps[s], 31):
                    d = n - ps[s]; t[(n, s)] = R.PAY[s][0 if d <= 1 else 1 if d <= 3 else 2 if d <= 7 else 3]
        else:
            for s in R.PAYERS:
                for k_, f in R.RULES[kind][2]["fk"].items():
                    t[(k_, s)] = R.PAY[s][0] * f
        return t
    save = cfg.paytable
    for _ in range(N):
        sym = [None] * g.n; cols = []
        for c in range(6):
            p = rng.randrange(120); col = [S[c][(p + j) % 120] for j in range(5)]; cols.append(col)
            for j, i in enumerate(g.colidx[c]):
                sym[i] = col[j]
        board = lambda: [[gs.create_symbol(x) for x in col] for col in cols]
        d = Cluster.get_cluster_data(cfg, board(), 1); mine, _d = R.ev_cluster(sym, g, None)
        nz["cluster"] += mine > 0; bad["cluster"] += abs(d["totalWin"] - mine) > 1e-9
        cfg.paytable = table("scatter_ps"); d = Scatter.get_scatterpay_wins(cfg, board()); cfg.paytable = save
        mine, _d = R.ev_scatter_ps(sym, g, None, {"mins": ps})
        nz["scatter_ps"] += mine > 0; bad["scatter_ps"] += abs(d["totalWin"] - mine) > 1e-9
        for kind in ("ways4", "ways3"):
            cfg.paytable = table(kind); d = Ways.get_ways_data(cfg, board()); cfg.paytable = save
            mine, _d = R.ev_ways(sym, g, None, R.RULES[kind][2])
            nz[kind] += mine > 0; bad[kind] += abs(d["totalWin"] - mine) > 1e-6
    print("boards", N, "mismatches", bad, "boards with a win", nz)


if __name__ == "__main__":
    if sys.argv[1] == "natural":
        natural(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]) if len(sys.argv) > 4 else 0)
    else:
        xcheck(int(sys.argv[2]))
