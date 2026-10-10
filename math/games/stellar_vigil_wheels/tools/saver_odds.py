"""Measure the REAL odds of the wager-saver wheel on the final library, and publish them for the front-end.

The simulation draws the wheel result with `saver_draw_probability`, but the optimizer then re-weights the books
(books where the wheel saved pay exactly the floor and are among those it down-weights). So the odds a player really
gets differ from the draw. The front-end must draw the wheel from THESE numbers, otherwise the picture lies.

Writes library/configs/saver_odds.json (with a hash of the lookup tables, so a stale file is detected).

Usage (from math/):  env/bin/python games/stellar_vigil/tools/saver_odds.py
"""

import csv
import hashlib
import io
import json
import os

import zstandard

LIB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library")
PUB = os.path.join(LIB, "publish_files")
OUT = os.path.join(LIB, "configs", "saver_odds.json")
MODES = ("base", "bonus")


def lut_hash() -> str:
    h = hashlib.sha256()
    for mode in MODES:
        with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv"), "rb") as f:
            h.update(f.read())
    return h.hexdigest()


def measure(mode: str) -> dict:
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as f:
        lines = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f)).read().splitlines()
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        weights = [int(r[1]) for r in csv.reader(f)]
    w_bonus = w_spun = w_saved = 0
    floor = None
    for line, w in zip(lines, weights):
        ev = json.loads(line)["events"]
        wheel = [e for e in ev if e["type"] == "saverWheel"]
        if not (mode == "bonus" or any(e["type"] == "freeSpinTrigger" for e in ev)):
            continue
        w_bonus += w
        if wheel:
            w_spun += w
            w_saved += w * wheel[0]["saved"]
            floor = wheel[0]["floor"] / 100
    return {
        "floor": floor,
        "p_spin_given_bonus": w_spun / w_bonus if w_bonus else 0.0,
        "p_save_given_spin": w_saved / w_spun if w_spun else 0.0,
    }


def write() -> dict:
    data = {mode: measure(mode) for mode in MODES}
    data["lut_sha256"] = lut_hash()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(data, f, indent=2)
    return data


if __name__ == "__main__":
    d = write()
    for mode in MODES:
        m = d[mode]
        print(f"{mode:6s} floor {m['floor']}x | wheel spins on {m['p_spin_given_bonus']:.1%} of bonuses | real chance of a save once it spins: {m['p_save_given_spin']:.1%}")
    print("written", OUT)
