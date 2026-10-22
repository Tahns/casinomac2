"""Stats from publish lookup tables. usage: stats.py"""
import csv, os, statistics, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "library", "publish_files")
COST = {"base": 1.0, "bonus": 100.0}
for m, c in COST.items():
    rows = [(int(a), int(b), int(p)) for a, b, p in csv.reader(open(f"{D}/lookUpTable_{m}_0.csv"))]
    W = sum(w for _, w, _ in rows)
    rtp = sum(w * p / 100 for _, w, p in rows) / W / c
    hit = sum(w for _, w, p in rows if p > 0) / W
    mx = max(p for _, _, p in rows) / 100
    pmx = sum(w for _, w, p in rows if p / 100 == mx) / W
    # weighted median
    srt = sorted(rows, key=lambda r: r[2]); acc = 0; med = None
    for _, w, p in srt:
        acc += w
        if acc >= W / 2: med = p / 100; break
    print(m, "rows", len(rows), "rtp %.4f" % rtp, "hit %.4f" % hit, "max", mx, "p(max) 1/%.0f" % (1 / pmx) if pmx else "", "median", med, "mean", rtp * c)
