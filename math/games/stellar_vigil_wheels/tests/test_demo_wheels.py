"""The two-wheel demo must replay the library: same wheel odds, consistent nights, every variant present."""

import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import wheel_odds  # noqa: E402

DEMO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "demo", "books_wheels.js")


def _load():
    s = open(DEMO, encoding="utf-8").read()
    books = json.loads(s[len("window.BOOKS=") : s.index(";window.WHEEL_ODDS=")])
    odds = json.loads(re.search(r"window\.WHEEL_ODDS=(\{.*?\});", s).group(1))
    return books, odds


def test_demo_wheel_odds_are_the_library_odds():
    _, odds = _load()
    for mode in ("base", "bonus"):
        real = wheel_odds.measure(mode)["wheel1"]
        for k, v in real.items():
            assert abs(odds[mode][k] - v) < 1e-9, (mode, k)


def test_demo_books_cover_every_variant_and_nights_match():
    books, _ = _load()
    seen = set()
    for mode in ("base", "bonus"):
        for b in books[mode]:
            sw = [e for e in b["events"] if e["type"] == "seasonWheel"]
            if not sw:
                continue
            assert len(sw) == 1
            seen.add(sw[0]["variant"])
            starts = [e for e in b["events"] if e["type"] == "nightStart"]
            assert starts and all(e["totalNights"] == sw[0]["totalNights"] for e in starts)
            assert len(starts) == sw[0]["totalNights"] or any(e["type"] == "freeSpinEnd" for e in b["events"])
    assert seen == {"classic", "long", "dense", "classic+", "long+", "dense+"}, seen
