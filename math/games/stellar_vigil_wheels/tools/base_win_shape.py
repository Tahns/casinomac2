"""Shape of the base-game wins (spins that did not trigger the bonus): natural vs optimized.

The optimizer re-weights the simulated books to hit a hit rate and an RTP. If the natural books are much richer
than the targets, it can build a barbell (many sub-bet wins plus a few big ones, almost nothing in between).

Usage (from math/):  env/bin/python games/stellar_vigil/tools/base_win_shape.py
"""

import csv
import os
import statistics as st

LIB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library")
BUCKETS = [(0.001, 1), (1, 2), (2, 5), (5, 20), (20, 100), (100, 1e9)]


def non_bonus_ge1() -> float:
    """Probability that a spin that did not trigger the bonus pays at least 1x the bet (optimized weights)."""
    with open(os.path.join(LIB, "lookup_tables", "lookUpTableSegmented_base.csv")) as f:
        crit = [r[1] for r in csv.reader(f)]
    with open(os.path.join(LIB, "publish_files", "lookUpTable_base_0.csv")) as f:
        lut = [(int(r[1]), int(r[2]) / 100) for r in csv.reader(f)]
    nb = [(w, m) for (w, m), c in zip(lut, crit) if c in ("basegame", "0")]
    return sum(w for w, m in nb if m >= 1) / sum(w for w, _ in nb)


def main():
    with open(os.path.join(LIB, "lookup_tables", "lookUpTableSegmented_base.csv")) as f:
        seg = list(csv.reader(f))
    crit = [r[1] for r in seg]
    nat = [float(r[2]) + float(r[3]) for r in seg if r[1] == "basegame"]
    wins = [x for x in nat if x > 0]
    print(
        f"NATURAL ('basegame' books): win rate {len(wins) / len(nat):.1%}, mean per hit {st.mean(wins):.2f}x, "
        f"median per hit {st.median(wins):.2f}x, hits >= 1x {sum(x >= 1 for x in wins) / len(wins):.1%}"
    )
    with open(os.path.join(LIB, "publish_files", "lookUpTable_base_0.csv")) as f:
        lut = [(int(r[1]), int(r[2]) / 100) for r in csv.reader(f)]
    nb = [(w, m) for (w, m), c in zip(lut, crit) if c in ("basegame", "0")]
    total = sum(w for w, _ in nb)
    print(f"OPTIMIZED, spins without bonus: win rate {sum(w for w, m in nb if m > 0) / total:.1%}")
    for lo, hi in BUCKETS:
        p = sum(w for w, m in nb if lo <= m < hi) / total
        rtp = sum(w * m for w, m in nb if lo <= m < hi) / total
        print(f"   win in [{lo:g},{hi:g})x : {p * 100:7.3f} % of spins   RTP share {rtp * 100:5.2f} points")
    ge1 = sum(w for w, m in nb if m >= 1) / total
    print(f"   P(spin without bonus pays >= 1x) = {ge1 * 100:.2f} %  (1 in {1 / ge1:.0f})")


if __name__ == "__main__":
    main()
