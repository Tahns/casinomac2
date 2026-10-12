"""Export a weighted sample of the published books to demo/books.js for the playable demo.

Usage (from math/):  env/bin/python games/stellar_vigil_wheels/tools/export_demo_books.py
Seeded, so the same library always gives the same file. Rare outcomes stay rare (sampling follows the
lookup-table weights); a few bonuses and both wheel outcomes are added so the demo can always show them.
"""

import csv
import io
import json
import os
import random

import zstandard
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wheel_odds

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(GAME_DIR))), "demo", "books_wheels.js")


def load(mode):
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as f:
        books = [json.loads(line) for line in io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f))]
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        weights = [int(r[1]) for r in csv.reader(f)]
    return books, weights


def has(book, etype, **kw):
    return any(e["type"] == etype and all(e.get(k) == v for k, v in kw.items()) for e in book["events"])


def main():
    random.seed(42)
    out = {}
    for mode, n in (("base", 600), ("bonus", 120)):
        books, weights = load(mode)
        sel = [books[i] for i in random.choices(range(len(books)), weights=weights, k=n)]
        if mode == "base":
            sel += random.sample([b for b in books if has(b, "freeSpinTrigger")], 12)
        for var in [k + "+" * t for t in (0, 1, 2) for k in wheel_odds.KINDS]:
            pool = [b for b in books if has(b, "seasonWheel", variant=var)]
            sel += random.sample(pool, 6 if mode == "base" else 4)
        per = 5 if mode == "base" else 6
        for saved in (True, False):
            sel += random.sample([b for b in books if has(b, "saverWheel", saved=saved)], per)
        out[mode] = [{"win": b["payoutMultiplier"], "events": b["events"]} for b in sel]
        print(mode, len(sel), "books,", sum(has(b, "saverWheel") for b in sel), "with the wheel")
    with open(os.path.join(GAME_DIR, "library", "configs", "saver_odds.json")) as f:
        odds = json.load(f)
    with open(OUT, "w") as f:
        f.write("window.BOOKS=" + json.dumps(out, separators=(",", ":")) + ";")
        f.write("window.WHEEL_ODDS=" + json.dumps({m: {"kinds": wheel_odds.measure(m)["wheel1"], "tiers": wheel_odds.measure(m)["wheel2"]} for m in ("base", "bonus")}, separators=(",", ":")) + ";")
        f.write("window.SAVER_ODDS=" + json.dumps({k: odds[k] for k in ("base", "bonus", "lut_sha256")}, separators=(",", ":")) + ";")
    print("written", OUT)


if __name__ == "__main__":
    main()
