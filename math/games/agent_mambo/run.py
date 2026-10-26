"""Main file for generating results for sample ways-pay game."""

import os
import sys
from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

if __name__ == "__main__":

    num_threads = 4
    rust_threads = 4
    batching_size = 6250
    compression = True
    profiling = False

    num_sim_args = {
        "base": int(float(os.environ.get("SIMS_BASE", 1e5))),
        "bonus": int(float(os.environ.get("SIMS_BONUS", 1e5))),
    }

    run_conditions = {
        "run_sims": os.environ.get("SIMS","1")=="1",
        "run_optimization": os.environ.get("OPT","0")=="1",
        "run_analysis": True,
        "run_format_checks": True,
    }
    # Bonus weights come from tools/reweight_bonus.py (the Rust optimizer cannot produce a flat buy
    # distribution, see MATH_REPORT.md); base is optimized by the Rust program.
    reweight_bonus = os.environ.get("REWEIGHT", "1") == "1"
    target_modes = ["base"] if reweight_bonus else ["base", "bonus"]

    config = GameConfig()
    gamestate = GameState(config)
    if run_conditions["run_optimization"] or run_conditions["run_analysis"]:
        optimization_setup_class = OptimizationSetup(config)

    if run_conditions["run_sims"]:
        create_books(
            gamestate,
            config,
            num_sim_args,
            batching_size,
            num_threads,
            compression,
            profiling,
        )

    generate_configs(gamestate)

    if run_conditions["run_optimization"]:
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
        generate_configs(gamestate)

    if reweight_bonus and (run_conditions["run_sims"] or run_conditions["run_optimization"] or os.environ.get("FORCE_REWEIGHT")):
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
        import reweight_bonus as rw
        if run_conditions["run_sims"] and os.path.exists(rw.CACHE):
            os.remove(rw.CACHE)  # tiers must be re-read from the new books
        rw.main()

    if run_conditions["run_analysis"]:
        custom_keys = [{"symbol": "scatter"}]
        create_stat_sheet(gamestate, custom_keys=custom_keys)

    if run_conditions["run_format_checks"]:
        os.chdir(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')))
        execute_all_tests(config)
