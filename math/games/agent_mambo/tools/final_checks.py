"""Run the SDK format/RTP verification on the published files (run from the game dir with the env python)."""
import os, sys
sys.path.insert(0, "../.."); sys.path.insert(0, ".")
from game_config import GameConfig
from utils.rgs_verification import execute_all_tests
cfg = GameConfig()
os.chdir(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")))
execute_all_tests(cfg)
print("SDK execute_all_tests: OK")
