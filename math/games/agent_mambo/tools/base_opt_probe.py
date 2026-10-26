"""WP8: try the Rust base optimizer on a SCRATCH game id (math/games/wp8_opt, removed afterwards unless --keep) and report the player-facing
numbers of the weighted base table against the SYNTHESIS 4 targets (P(R > 1x) >= 11.5 %, hit >= 23 %). The real library is never touched.

  math/env/bin/python math/games/agent_mambo/tools/base_opt_probe.py run --books 93750 --threads 3 [--profile v1|v2] [--keep]
  math/env/bin/python math/games/agent_mambo/tools/base_opt_probe.py report --game wp8_opt        # re-read a kept scratch table

Stop-loss (SYNTHESIS 4): if the optimizer cannot reach the targets within 3 loops, keep the v1 profile (BASE_PROFILE=v1).
Also restores math/optimization_program/src/setup.toml, which `run_opt_single_mode` rewrites.
CPU: books are simulated with <= 3 processes; the Rust program gets --threads (default 3).
"""

import argparse
import collections
import csv
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
MATH = os.path.abspath(os.path.join(GAME, "..", ".."))
for _p in (MATH, GAME):
    if _p not in sys.path:
        sys.path.insert(0, _p)

SETUP_TOML = os.path.join(MATH, "optimization_program", "src", "setup.toml")


def report(game_id, table="lookUpTable_base_0.csv"):
    import numpy as np

    lib = os.path.join(MATH, "games", game_id, "library")
    rows = list(csv.reader(open(os.path.join(lib, "publish_files", table))))
    ids = np.array([int(r[0]) for r in rows])
    w = np.array([int(r[1]) for r in rows], float)
    p = np.array([int(r[2]) for r in rows]) / 100.0
    W = w.sum()

    def share(m):
        return float(w[m].sum() / W)

    out = {
        "books": len(rows), "rtp": round(float((w * p).sum() / W), 5), "hit": round(share(p > 0), 4), "P(R>1x)": round(share(p > 1.0), 4),
        "P(R==1x)": round(share(p == 1.0), 4), "sub_stake_wins(0<R<=1)": round(share((p > 0) & (p <= 1)), 4),
        "mean_win_of_hits": round(float((w * p)[p > 0].sum() / w[p > 0].sum()), 3),
        "max_x": float(p.max()), "p_max": round(share(p >= 5000), 8),
    }
    edges = [(0, 0.0001), (0.0001, 1.0001), (1.0001, 2), (2, 5), (5, 10), (10, 20), (20, 40), (40, 100), (100, 1000), (1000, 5001)]
    out["buckets"] = {f"[{a:g},{b:g})": (round(100 * share((p >= a) & (p < b)), 3), round(100 * float((w * p)[(p >= a) & (p < b)].sum() / W), 2)) for a, b in edges}
    force = json.load(open(os.path.join(lib, "forces", "force_record_base.json")))
    idx = {int(i): k for k, i in enumerate(ids)}
    for key in ("layout", "mission", "bw"):
        c = collections.Counter()
        for rec in force:
            kv = {x["name"]: x["value"] for x in rec["search"]}
            if key in kv and len(kv) == 1:
                c[kv[key]] += sum(w[idx[b]] for b in rec["bookIds"] if b in idx)
        tot = sum(c.values())
        if tot:
            out[key + "_share"] = {k: round(v / tot, 4) for k, v in sorted(c.items())}
    mission_rtp = collections.Counter()
    for rec in force:
        kv = {x["name"]: x["value"] for x in rec["search"]}
        if "mission" in kv and len(kv) == 1:
            ii = [idx[b] for b in rec["bookIds"] if b in idx]
            mission_rtp[kv["mission"]] = [round(float(w[ii].sum() / W), 5), round(float((w[ii] * p[ii]).sum() / W), 4), round(float((w[ii] * p[ii]).sum() / max(w[ii].sum(), 1e-12)), 1)]
    out["mission: share of spins, rtp, mean book win"] = dict(mission_rtp)
    return out


def cmd_run(a):
    from game_config import GameConfig
    from game_optimization import OptimizationSetup
    from gamestate import GameState
    from optimization_program.run_script import OptimizationExecution
    from src.state.run_sims import create_books
    from src.write_data.write_configs import generate_configs

    if a.profile:
        os.environ["AM_CALIB"] = json.dumps({"BASE_PROFILE": a.profile})
    threads = max(1, min(a.threads, 3))
    cfg = GameConfig()
    game_id = a.game
    cfg.game_id = game_id
    cfg.bet_modes = [bm for bm in cfg.bet_modes if bm.get_name() == "base"]  # generate_configs needs the files of every mode
    gs = GameState(cfg)
    OptimizationSetup(cfg)
    root = os.path.join(MATH, "games", game_id)
    toml_backup = open(SETUP_TOML).read()
    t0 = time.time()
    try:
        if a.reuse:
            assert os.path.isdir(root), "no kept scratch library to reuse"
        else:
            create_books(gs, cfg, {"base": a.books}, 6250, threads, True, False)
        t_sim = time.time() - t0
        generate_configs(gs)
        t1 = time.time()
        try:
            OptimizationExecution().run_all_modes(cfg, ["base"], threads)
        except Exception as e:  # CalledProcessError: show what the Rust program said
            print("OPTIMIZER FAILED:", getattr(e, "stdout", "")[-1500:] if getattr(e, "stdout", None) else "", (getattr(e, "stderr", "") or "")[-800:])
            raise
        t_opt = time.time() - t1
        generate_configs(gs)
        print("profile", cfg.base_profile, "sim_s", round(t_sim, 1), "opt_s", round(t_opt, 1))
        print(json.dumps(report(game_id), indent=1))
    finally:
        open(SETUP_TOML, "w").write(toml_backup)
        if not a.keep:
            shutil.rmtree(root, ignore_errors=True)
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--books", type=int, default=93750)
    r.add_argument("--threads", type=int, default=3)
    r.add_argument("--profile", choices=["v1", "v2"], default=None)
    r.add_argument("--game", default="wp8_opt")
    r.add_argument("--keep", action="store_true")
    r.add_argument("--reuse", action="store_true", help="skip the simulation, reuse the kept scratch books (new fences / parameters only)")
    q = sub.add_parser("report")
    q.add_argument("--game", default="wp8_opt")
    a = ap.parse_args()
    if a.cmd == "run":
        sys.exit(cmd_run(a))
    print(json.dumps(report(a.game), indent=1))


if __name__ == "__main__":
    main()
