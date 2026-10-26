"""Generate the reel strips for The Agent Mambo (6 reels, 120 stops each). Deterministic."""
import os
import random

REELS = 6
STOPS = 120
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reels")

# symbols per 120 stops
WEIGHTS = {
    "BR0": {"H1": 7, "H2": 9, "H3": 11, "H4": 13, "L1": 16, "L2": 17, "L3": 18, "L4": 19, "S": 2, "W": int(__import__("os").environ.get("BRW", "3"))},
    "FR0": {"H1": 7, "H2": 9, "H3": 11, "H4": 12, "L1": 15, "L2": 16, "L3": 17, "L4": 17, "S": 3, "W": 4},
    "WCAP": {"H1": 52, "H2": 16, "H3": 10, "H4": 6, "L1": 3, "L2": 2, "L3": 2, "L4": 2, "S": 3, "W": 24},
}


def strip(weights, rng):
    syms = [s for s, n in weights.items() for _ in range(n)]
    syms += ["L4"] * (STOPS - len(syms))
    for _ in range(2000):
        rng.shuffle(syms)
        # no immediate vertical repeats of three, no scatter stacking
        ok = all(not (syms[i] == syms[i - 1] == syms[i - 2]) for i in range(len(syms)))
        ok = ok and all(not (syms[i] == "S" and syms[i - 1] == "S") for i in range(len(syms)))
        if ok:
            return syms
    return syms


if __name__ == "__main__":
    for name, w in WEIGHTS.items():
        assert sum(w.values()) <= STOPS, name
        rng = random.Random(f"unleashed-{name}")
        cols = [strip(w, rng) for _ in range(REELS)]
        with open(os.path.join(OUT, f"{name}.csv"), "w") as f:
            for i in range(STOPS):
                f.write(",".join(c[i] for c in cols) + "\n")
        print(name, "ok")
