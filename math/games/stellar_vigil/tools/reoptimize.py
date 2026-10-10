"""Re-run ONLY the optimizer on the existing simulated books until the quality gates pass.

The simulations are deterministic and already done; the Rust optimizer is the random part, and a run can be
too volatile (see tests/test_quality_gates.py). This loops: optimize -> analyse -> format checks (refreshes stats_summary.json) -> run the gates, and stops at
the first run that passes. The result is still not reproducible, so freeze it afterwards (tools/freeze_maths.py).

Usage (from math/):  env/bin/python games/stellar_vigil/tools/reoptimize.py [--max-attempts 6]
"""

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
        if gates_pass():
            print(f"ACCEPTED on attempt {attempt}")
            return 0
    print(f"NO RUN PASSED the gates in {args.max_attempts} attempts")
    return 1


if __name__ == "__main__":
    sys.exit(main())
