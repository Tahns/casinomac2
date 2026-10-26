"""Compact bonus summary of a publish dir: bsum.py [dir]"""
import csv, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "library", "publish_files")
rows = [(int(w), int(p) / 100) for _, w, p in csv.reader(open(f"{D}/lookUpTable_bonus_0.csv"))]
W = sum(w for w, _ in rows)
rtp = sum(w * p for w, p in rows) / W / 100
srt = sorted(rows, key=lambda r: r[1]); acc = 0
for w, p in srt:
    acc += w
    if acc >= W / 2: med = p; break
edges = [0, 30, 40, 60, 100, 200, 300, 500, 1000, 2000, 4999, 5000.01]
out = []
for lo, hi in zip(edges, edges[1:]):
    s = [(w, p) for w, p in rows if lo <= p < hi]
    if s: out.append(f"{lo}-{hi}: {sum(w for w,_ in s)/W*100:.1f}% ({sum(w*p for w,p in s)/W:.1f}pts)")
print(f"rtp {rtp:.4f} median {med}"); print(" | ".join(out))
s3060 = sum(w for w, p in rows if 30 <= p < 60) / W
print("share 30-60x: %.3f  60-300x: %.3f  >=300: %.3f" % (s3060, sum(w for w, p in rows if 60 <= p < 300) / W, sum(w for w, p in rows if p >= 300) / W))
