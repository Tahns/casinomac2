"""Agent Mambo v2 pipeline driver (WP9 MATH-PIPELINE): staged and restartable, one CPU queue.

  math/env/bin/python math/games/agent_mambo/run.py STAGE [STAGE ...]      (run from anywhere; <= 3 worker processes)

Stages, in the order of a full rebuild (SYNTHESIS 7 / 9):
  sims       create_books ONCE PER MODE: entrance_orders, entrance_blackout (door pools), base. `bonus` (The Briefing door) is NOT
             re-simulated by default: its 100k published v1 books stay valid (SIMS_BONUS=100000 would rebuild it).
  configs    generate_configs (index.json, fe/be config, hashes, force.json, event_config_<mode>.json)
  opt        Rust optimizer for `base` ONLY (doors get their weights from tools/reweight_doors.py: the Rust program cannot give a flat
             buy shape, MATH_REPORT.md), restores math/optimization_program/src/setup.toml, then generate_configs
  reweight   tools/reweight_doors.py for bonus / entrance_orders / entrance_blackout (one exponential tilt + one boost per mode)
  recompress tools/recompress.py (zstd level ZSTD_LEVEL, default 15) + refresh of the sha256 in configs/books_<mode>.verification.json,
             then generate_configs (be config carries the book hashes)
  analysis   SDK create_stat_sheet (optional, slow)
  checks     SDK execute_all_tests (hashes, lookup format, payouts match books, volatility limits)
  all        sims configs opt reweight recompress checks

Environment (defaults in brackets): THREADS [3, hard cap 3]; SIMS_BASE [112500 = 6 x 3 x 6250], SIMS_ENTRANCE_ORDERS [103125 = 11 x 3 x 3125],
SIMS_ENTRANCE_BLACKOUT [103125], SIMS_BONUS [0 = reuse the published books]; BATCH_BASE [6250], BATCH_DOOR [3125] (books of 60 KB and more);
ZSTD_LEVEL [15]; ONLY_MODES (comma list, restricts `sims`). A count must be a multiple of THREADS x batch: create_books silently drops sims
otherwise (50 000 is NOT a multiple of 18 750 or 9 375). Every stage appends a wall-clock record to library/wp9_timing.jsonl.

Calibration knobs live in calib_params.py (env AM_CALIB beats it); the v1 behaviour is BASE_PROFILE v1 + layout {'mezzanine':1} + mission
{'briefing':1} (tools and tests that replay v1 books switch to it themselves).
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
MATH = os.path.abspath(os.path.join(HERE, "..", ".."))
for _p in (MATH, HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

TIMING = os.path.join(HERE, "library", "wp9_timing.jsonl")
SETUP_TOML = os.path.join(MATH, "optimization_program", "src", "setup.toml")
DOORS = ("bonus", "entrance_orders", "entrance_blackout")


def stamp():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def log_time(stage, t0, **extra):
    rec = {"stage": stage, "start": datetime.fromtimestamp(t0, timezone.utc).strftime("%H:%M:%S"), "end": datetime.now(timezone.utc).strftime("%H:%M:%S"),
           "wall_s": round(time.time() - t0, 1), **extra}
    os.makedirs(os.path.dirname(TIMING), exist_ok=True)
    with open(TIMING, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
    print(f"[{stamp()}] {stage} done in {rec['wall_s']} s {extra if extra else ''}", flush=True)


def env_int(name, default):
    return int(float(os.environ.get(name, default)))


def threads():
    return max(1, min(env_int("THREADS", 3), 3))


def build():
    from game_config import GameConfig
    from game_optimization import OptimizationSetup
    from gamestate import GameState

    config = GameConfig()
    gamestate = GameState(config)
    OptimizationSetup(config)  # opt_params of every mode: generate_configs writes the optimizer's math_config.json from them
    return config, gamestate


def stage_sims(config, gamestate):
    from src.state.run_sims import create_books

    th = threads()
    plan = [
        ("entrance_orders", env_int("SIMS_ENTRANCE_ORDERS", 103125), env_int("BATCH_DOOR", 3125)),
        ("entrance_blackout", env_int("SIMS_ENTRANCE_BLACKOUT", 103125), env_int("BATCH_DOOR", 3125)),
        ("bonus", env_int("SIMS_BONUS", 0), env_int("BATCH_DOOR", 3125)),
        ("base", env_int("SIMS_BASE", 112500), env_int("BATCH_BASE", 6250)),
    ]
    only = [m for m in os.environ.get("ONLY_MODES", "").split(",") if m]
    for mode, n, batch in plan:
        if n <= 0 or (only and mode not in only):
            continue
        assert n % (th * batch) == 0, f"{mode}: {n} sims is not a multiple of threads x batch = {th * batch} (create_books would drop sims)"
        os.makedirs(gamestate.output_files.temp_path, exist_ok=True)  # create_books removes it at the end of every call
        t0 = time.time()
        print(f"[{stamp()}] sims {mode}: {n} books, {th} threads, batch {batch}", flush=True)
        create_books(gamestate, config, {mode: n}, batch, th, True, False)
        pub = os.path.join(HERE, "library", "publish_files", f"books_{mode}.jsonl.zst")
        log_time(f"sims_{mode}", t0, books=n, threads=th, batch=batch, zst_mb=round(os.path.getsize(pub) / 1e6, 1))


def stage_configs(config, gamestate):
    from src.write_data.write_configs import generate_configs

    t0 = time.time()
    generate_configs(gamestate)
    log_time("configs", t0)


def stage_opt(config, gamestate):
    from optimization_program.run_script import OptimizationExecution
    from src.write_data.write_configs import generate_configs

    toml_backup = open(SETUP_TOML, encoding="utf-8").read()
    t0 = time.time()
    try:
        OptimizationExecution().run_all_modes(config, ["base"], threads())
    finally:
        with open(SETUP_TOML, "w", encoding="utf-8") as f:
            f.write(toml_backup)
    log_time("opt_base", t0, threads=threads())
    generate_configs(gamestate)


def stage_reweight(config, gamestate):
    sys.path.insert(0, os.path.join(HERE, "tools"))
    import reweight_doors

    t0 = time.time()
    reweight_doors.main(["--report", os.path.join(HERE, "library", "wp9_reweight.json")])
    log_time("reweight", t0)


def stage_recompress(config, gamestate):
    from src.write_data.write_configs import generate_configs

    t0 = time.time()
    level = env_int("ZSTD_LEVEL", 15)
    r = subprocess.run([sys.executable, os.path.join(HERE, "tools", "recompress.py"), "--level", str(level), "--threads", str(threads())])
    if r.returncode != 0:
        raise SystemExit(f"recompress failed rc={r.returncode}")
    log_time("recompress", t0, level=level)
    generate_configs(gamestate)


def stage_analysis(config, gamestate):
    from utils.game_analytics.run_analysis import create_stat_sheet

    t0 = time.time()
    create_stat_sheet(gamestate, custom_keys=[{"symbol": "scatter"}])
    log_time("analysis", t0)


def stage_checks(config, gamestate):
    from utils.rgs_verification import execute_all_tests

    t0 = time.time()
    os.chdir(MATH)
    execute_all_tests(config)
    log_time("checks", t0)


STAGES = {"sims": stage_sims, "configs": stage_configs, "opt": stage_opt, "reweight": stage_reweight, "recompress": stage_recompress,
          "analysis": stage_analysis, "checks": stage_checks}
ALL = ["sims", "configs", "opt", "reweight", "recompress", "checks"]


def main(argv):
    names = ALL if argv == ["all"] else argv
    if not names or any(n not in STAGES for n in names):
        print(__doc__)
        return 2
    config, gamestate = build()
    for n in names:
        print(f"[{stamp()}] === stage {n}", flush=True)
        STAGES[n](config, gamestate)
    print(f"[{stamp()}] PIPELINE DONE: {' '.join(names)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
