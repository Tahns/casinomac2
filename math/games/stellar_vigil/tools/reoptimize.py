"""Re-run ONLY the optimizer on the existing simulated books until the quality gates pass.

The simulations are deterministic and already done; the Rust optimizer is the random part, and a run can be
too volatile (see tests/test_quality_gates.py). This loops: optimize -> analyse -> format checks (refreshes stats_summary.json) -> run the gates, and stops at
the first run that passes. The result is still not reproducible, so freeze it afterwards (tools/freeze_maths.py).

Usage (from math/):  env/bin/python games/stellar_vigil/tools/reoptimize.py [--max-attempts 6] [--no-stop] [--log FILE]
  --no-stop   keep going after a run passes (to measure the spread of the optimizer; the library is left on
              the LAST run, so finish with a normal call to end on an accepted run)
  --log FILE  append one JSON line per attempt (median, std, share of purchases below cost, gate result)
"""

import csv
import json

import argparse
import os
import subprocess
import sys
import time

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, GAME_DIR)

from game_config import GameConfig  # noqa: E402
from game_optimization import OptimizationSetup  # noqa: E402
from gamestate import GameState  # noqa: E402
from optimization_program.run_script import OptimizationExecution  # noqa: E402
from src.write_data.write_configs import generate_configs  # noqa: E402
from utils.game_analytics.run_analysis import create_stat_sheet  # noqa: E402
from utils.rgs_verification import execute_all_tests  # noqa: E402


def bonus_stats() -> dict:
    with open(os.path.join(GAME_DIR, "library", "publish_files", "lookUpTable_bonus_0.csv")) as f:
        rows = sorted(((int(w), int(m)) for _, w, m in csv.reader(f)), key=lambda r: r[1])
    total = sum(w for w, _ in rows)
    acc, median = 0, 0.0
    for w, m in rows:
        acc += w
        if acc / total >= 0.5:
            median = m / 100
            break
    mean = sum(w * m for w, m in rows) / total / 100
    cost = float(next(bm for bm in GameConfig().bet_modes if bm._name == "bonus").get_cost())
    var = sum(w * (m / 100 - mean) ** 2 for w, m in rows) / total
    return {
        "median": round(median, 1),
        "mean": round(mean, 2),
        "std": round(var**0.5, 1),
        "below_cost": round(sum(w for w, m in rows if m / 100 < cost) / total, 3),
    }


def gates_pass() -> bool:
    r = subprocess.run(
        [sys.executable, "-m", "pytest", os.path.join(GAME_DIR, "tests", "test_quality_gates.py"), "-q", "-p", "no:cacheprovider"],
        capture_output=True,
        text=True,
    )
    print("   gates:", r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip())
    return r.returncode == 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-attempts", type=int, default=6)
    ap.add_argument("--rust-threads", type=int, default=4)
    ap.add_argument("--no-stop", action="store_true")
    ap.add_argument("--log")
    args = ap.parse_args()
    for attempt in range(1, args.max_attempts + 1):
        t = time.time()
        config = GameConfig()
        gamestate = GameState(config)
        OptimizationSetup(config)
        OptimizationExecution().run_all_modes(config, ["base", "bonus"], args.rust_threads)
        generate_configs(gamestate)
        create_stat_sheet(gamestate, custom_keys=[{"symbol": "scatter"}])
        execute_all_tests(config)  # also refreshes library/stats_summary.json
        print(f"attempt {attempt}: optimizer + analysis took {time.time() - t:.0f}s", flush=True)
        ok = gates_pass()
        import importlib.util

        spec = importlib.util.spec_from_file_location("base_win_shape", os.path.join(GAME_DIR, "tools", "base_win_shape.py"))
        shape = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(shape)
        record = {"attempt": attempt, "passed": ok, **bonus_stats(), "base_ge1x": round(shape.non_bonus_ge1(), 4)}
        print("   ", record, flush=True)
        if args.log:
            with open(args.log, "a") as f:
                f.write(json.dumps(record) + "\n")
        if ok and not args.no_stop:
            print(f"ACCEPTED on attempt {attempt}")
            return 0
    if args.no_stop:
        return 0
    print(f"NO RUN PASSED the gates in {args.max_attempts} attempts")
    return 1


if __name__ == "__main__":
    sys.exit(main())
