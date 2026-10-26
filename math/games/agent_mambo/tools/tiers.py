"""Weighted share of purchases per starting free-spin count + multiplier of shares. usage: tiers.py"""
import csv, os, json, collections
H = os.path.dirname(os.path.abspath(__file__)); L = os.path.join(H, "..", "library")
t = {int(k): v for k, v in json.load(open(os.path.join(L, "bonus_tiers.json"))).items()}
w = {int(a): int(b) for a, b, _ in csv.reader(open(os.path.join(L, "publish_files", "lookUpTable_bonus_0.csv")))}
W = sum(w.values()); c = collections.Counter()
for i, wt in w.items(): c[t[i]] += wt
print({k: "%.3f%%" % (v / W * 100) for k, v in sorted(c.items())})
