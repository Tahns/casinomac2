"""library/shares.json (SYNTHESIS 8 item 10; WP9): every figure the rules screen, the Info tab and the Secret Entrance picker print.

  math/env/bin/python math/games/agent_mambo/tools/make_shares.py [--out library/shares.json]

Reads ONLY the final tables: library/publish_files/lookUpTable_<mode>_0.csv (id, integer weight, payout x100) and the force records
library/forces/force_record_<mode>.json ({"layout": id}, {"mission": id}, {"bonusTier": n} per book id). Nothing is taken from the
design targets: all numbers are weighted shares of the shipped tables.

Layout of the file (a superset of the SYNTHESIS example):
  base: layout {id: share of base spins}, mission {id: share of free-spin triggers}, pGtStake (P(R > 1x)), hit, rtp, maxWin, medianX,
        triggerOneIn, layoutStats {id: share, hit, pGtStake, meanX}, missionStats {id: shareOfSpins, meanBookWinX}, subStakeShare, ...
  <door>: name, mission, price, medianX, pGtPrice, pGePrice, rtp, maxWin, oddsMax (1 in N), floorX, meanX, p10X / p90X, tierShare {10,12,15,18+},
        share bands (30-60x, 60-100x, 100-300x, 300x+), stdX.
"""
import argparse
import collections
import csv
import json
import os
import sys
from datetime import datetime, timezone

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
LIB = os.path.join(GAME, "library")
PUB = os.path.join(LIB, "publish_files")
FORCES = os.path.join(LIB, "forces")
sys.path.insert(0, GAME)

DOORS = {  # mode -> (mission, player-facing door name)
    "bonus": ("briefing", "Stage Door"),
    "entrance_orders": ("orders", "Coat Check"),
    "entrance_blackout": ("blackout", "Service Stairs"),
}
COST = {"base": 1.0, "bonus": 100.0, "entrance_orders": 100.0, "entrance_blackout": 100.0}
TIER_LABEL = {4: "10", 5: "12", 6: "15", 7: "18+"}


def load_table(mode, pub=PUB):
    rows = list(csv.reader(open(os.path.join(pub, f"lookUpTable_{mode}_0.csv"))))
    ids = np.array([int(r[0]) for r in rows])
    w = np.array([int(r[1]) for r in rows], float)
    p = np.array([int(r[2]) for r in rows], float) / 100.0
    assert (ids == np.arange(len(ids))).all()
    return w, p


def wquant(p, w, q):
    o = np.argsort(p, kind="stable")
    c = np.cumsum(w[o]) / w.sum()
    return float(p[o][min(np.searchsorted(c, q), len(p) - 1)])


def force_groups(mode, forces=FORCES):
    """{key: {value: np.array(book ids)}} for the single-key records of force_record_<mode>.json."""
    out = collections.defaultdict(dict)
    for rec in json.load(open(os.path.join(forces, f"force_record_{mode}.json"))):
        s = rec["search"]
        if len(s) == 1:
            out[s[0]["name"]][str(s[0]["value"])] = np.array(rec["bookIds"], dtype=np.int64)
    return out


def r4(x):
    return round(float(x), 6)


def table_numbers(mode, w, p):
    W = w.sum()
    cost = COST[mode]

    def share(m):
        return float(w[m].sum() / W)

    mean = float((w * p).sum() / W)
    out = {
        "cost": cost, "books": int(len(p)), "rtp": r4(mean / cost), "maxWin": int(p.max()), "medianX": wquant(p, w, 0.5), "meanX": r4(mean),
        "stdX": r4(np.sqrt((w * (p - mean) ** 2).sum() / W)), "p10X": wquant(p, w, 0.10), "p90X": wquant(p, w, 0.90), "p99X": wquant(p, w, 0.99),
        "pMax": share(p >= 5000 - 1e-9),
    }
    out["oddsMax"] = int(round(1 / out["pMax"])) if out["pMax"] > 0 else None
    return out, share


def base_shares(w, p, groups):
    out, share = table_numbers("base", w, p)
    W = w.sum()
    out.update({"hit": r4(share(p > 0)), "pGtStake": r4(share(p > 1.0 + 1e-9)), "pGeStake": r4(share(p >= 1.0 - 1e-9)),
                "subStakeShare": r4(share((p > 0) & (p <= 1.0 + 1e-9))), "exactlyStakeShare": r4(share(np.abs(p - 1.0) < 1e-9)),
                "deadShare": r4(share(p == 0)), "meanWinOfHitX": r4((w * p)[p > 0].sum() / w[p > 0].sum())})
    for key, name in (("layout", "layout"), ("mission", "mission")):
        g = groups.get(key, {})
        tot = sum(w[ids].sum() for ids in g.values())
        out[name] = {k: r4(w[ids].sum() / tot) for k, ids in sorted(g.items())} if tot else {}
    layout_stats = {}
    for k, ids in sorted(groups.get("layout", {}).items()):
        wi, pi = w[ids], p[ids]
        layout_stats[k] = {"share": out["layout"][k], "hit": r4(wi[pi > 0].sum() / wi.sum()), "pGtStake": r4(wi[pi > 1.0 + 1e-9].sum() / wi.sum()),
                           "meanX": r4((wi * pi).sum() / wi.sum()), "rtpPoints": r4((wi * pi).sum() / W)}
    out["layoutStats"] = layout_stats
    mission_stats = {}
    for k, ids in sorted(groups.get("mission", {}).items()):
        wi, pi = w[ids], p[ids]
        mission_stats[k] = {"shareOfSpins": r4(wi.sum() / W), "meanBookWinX": r4((wi * pi).sum() / wi.sum()), "rtpPoints": r4((wi * pi).sum() / W)}
    out["missionStats"] = mission_stats
    trig = sum(w[ids].sum() for ids in groups.get("mission", {}).values())
    out["triggerOneIn"] = r4(W / trig) if trig else None
    out["bucketShares"] = {k: r4(w[ids].sum() / W) for k, ids in sorted(groups.get("bw", {}).items())}
    return out


def door_shares(mode, w, p, groups):
    mission, door = DOORS[mode]
    out, share = table_numbers(mode, w, p)
    price = COST[mode]
    out.update({"name": door, "mission": mission, "price": price, "floorX": float(p.min()), "pGtPrice": r4(share(p > price + 1e-9)),
                "pGePrice": r4(share(p >= price - 1e-9)), "share30to60": r4(share((p >= 30) & (p < 60))), "share60to100": r4(share((p >= 60) & (p < 100))),
                "share100to300": r4(share((p >= 100) & (p < 300))), "share300plus": r4(share(p >= 300)), "share1000plus": r4(share(p >= 1000))})
    tiers = {}
    g = groups.get("bonusTier", {})
    tot = sum(w[ids].sum() for ids in g.values()) + (w[p >= 5000 - 1e-9].sum() if g else 0)
    # wincap books are not tiered (their share is the P(5000x) mass): tier shares are quoted over the tiered books
    tot_t = sum(w[ids].sum() for ids in g.values())
    for k, ids in sorted(g.items(), key=lambda kv: int(kv[0])):
        tiers[TIER_LABEL[int(k)]] = r4(w[ids].sum() / tot_t)
    out["tierShare"] = tiers
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(LIB, "shares.json"))
    a = ap.parse_args(argv)
    shares = {"version": 2, "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
              "note": "weighted shares of the final tables (library/publish_files/lookUpTable_<mode>_0.csv); outputs, not odds promises"}
    w, p = load_table("base")
    shares["base"] = base_shares(w, p, force_groups("base"))
    for mode in DOORS:
        if os.path.exists(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")):
            w, p = load_table(mode)
            shares[mode] = door_shares(mode, w, p, force_groups(mode))
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(shares, f, indent=1)
    b = shares["base"]
    print(f"base: rtp {b['rtp']:.5f} hit {b['hit'] * 100:.2f}% P(R>1x) {b['pGtStake'] * 100:.2f}% layouts {b['layout']} missions {b['mission']}")
    for mode in DOORS:
        if mode in shares:
            d = shares[mode]
            print(f"{mode}: rtp {d['rtp']:.5f} median {d['medianX']}x P(R>price) {d['pGtPrice'] * 100:.2f}% max {d['maxWin']}x 1/{d['oddsMax']} tiers {d['tierShare']}")
    print("wrote", a.out)
    return shares


if __name__ == "__main__":
    main()
