"""Simulate player sessions from the published lookup tables (what a player actually lives through).

For N consecutive bets at a fixed stake: probability of finishing ahead, median and spread of the result (in bets),
probability of seeing the bonus, and the risk of running out of a starting bankroll. Sampling follows the
lookup-table weights, exactly like the RGS does.

Usage (from math/):  env/bin/python games/stellar_vigil/tools/session_sim.py [--sessions 20000] [--seed 7]
"""

import argparse
import csv
import json
import os
import random
import statistics as st

PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library", "publish_files")


def load(mode):
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        rows = [(int(r[1]), int(r[2]) / 100) for r in csv.reader(f)]
    cum, acc = [], 0
    for w, _ in rows:
        acc += w
        cum.append(acc)
    return cum, [m for _, m in rows]


def costs():
    with open(os.path.join(PUB, "index.json")) as f:
        return {m["name"]: float(m["cost"]) for m in json.load(f)["modes"]}


def sessions(mode, spins, n_sessions, cost, bankroll_bets, rng):
    """bankroll_bets: starting bankroll in units of one bet (one purchase price in buy mode)."""
    cum, mult = load(mode)
    finals, busts = [], 0
    for _ in range(n_sessions):
        picks = rng.choices(range(len(cum)), cum_weights=cum, k=spins)
        balance, bust = 0.0, False
        for i in picks:
            balance += mult[i] - cost
            if balance <= -bankroll_bets * cost and not bust:
                bust = True
        busts += bust
        finals.append(balance / cost)
    finals.sort()
    n = len(finals)
    return {
        "ahead": sum(1 for x in finals if x > 0) / n,
        "median": finals[n // 2],
        "p10": finals[n // 10],
        "p90": finals[int(n * 0.9)],
        "bust": busts / n,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sessions", type=int, default=20000)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    c = costs()
    print(f"{args.sessions} sessions per line. Base game: results in stakes, bankroll = 100 stakes.")
    print("Bonus buy: results in purchase prices, bankroll = 10 purchases.\n")
    print("BASE GAME (1 bet = 1 stake)")
    print(f"{'spins':>6} {'ahead':>7} {'median':>8} {'p10':>8} {'p90':>8} {'bust 100':>9} {'sees bonus':>11}")
    for spins in (20, 50, 200, 1000):
        r = sessions("base", spins, args.sessions, c["base"], 100, rng)
        bonus = 1 - (1 - 1 / 150) ** spins
        print(f"{spins:>6} {r['ahead']:>7.1%} {r['median']:>8.1f} {r['p10']:>8.1f} {r['p90']:>8.1f} {r['bust']:>9.1%} {bonus:>11.1%}")
    print(f"\nBONUS BUY (1 purchase = {c['bonus']:g} stakes; results in purchase prices)")
    print(f"{'buys':>6} {'ahead':>7} {'median':>8} {'p10':>8} {'p90':>8} {'bust 10 buys':>13}")
    for buys in (1, 5, 20, 100):
        r = sessions("bonus", buys, args.sessions, c["bonus"], 10, rng)
        print(f"{buys:>6} {r['ahead']:>7.1%} {r['median']:>8.1f} {r['p10']:>8.1f} {r['p90']:>8.1f} {r['bust']:>13.1%}")


if __name__ == "__main__":
    main()
