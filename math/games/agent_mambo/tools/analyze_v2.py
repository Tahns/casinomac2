"""Weighted analysis of the final v2 library (WP9): one pass over the books of every mode, weighted by the final lookup tables.

  math/env/bin/python math/games/agent_mambo/tools/analyze_v2.py [--modes base,bonus,...] [--procs 3] [--limit N] [--out library/analysis_v2.json]

Reads library/publish_files/books_<mode>.jsonl.zst + lookUpTable_<mode>_0.csv. For each mode: table numbers (RTP, hit, P(R > stake / price),
median, mean, std, percentiles, buckets), and per-book facts aggregated with the table weights: scatter tiers of the trigger, free spins
played, retriggers, highest dial, share of the RTP paid at dial >= 20 / 50, wire burn / blast rates, mission / layout shares, Orders
envelopes, Blackout lit share. Base: 100 / 300-spin sessions drawn from the weighted table. Uses at most --procs worker processes (cap 3);
the main process only decompresses. Prints a compact report and writes JSON for MATH_REPORT.md.
"""
import argparse
import collections
import io
import json
import multiprocessing as mp
import os
import sys
import time

import numpy as np
import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
LIB = os.path.join(GAME, "library")
PUB = os.path.join(LIB, "publish_files")
sys.path.insert(0, HERE)
sys.path.insert(0, GAME)

import make_shares as ms  # noqa: E402

COST = ms.COST
MODES = ["base", "bonus", "entrance_orders", "entrance_blackout"]
DIAL_BANDS = (20, 50, 80)


def book_facts(b):
    """Small tuple of facts for one book (x100 integers)."""
    ev = b["events"]
    gt = "basegame"
    fs0 = None
    retr = 0
    free_spins = 0
    mission = None
    layout = "mezzanine"
    max_dial = 1
    burn = {"basegame": 0, "freegame": 0}
    blast = {"basegame": 0, "freegame": 0}
    spins = {"basegame": 0, "freegame": 0}
    burned_spin = False
    blast_spin = False
    win_by_band = [0] * (len(DIAL_BANDS) + 1)  # x100 amounts paid at dial < 20, [20, 50), [50, 80), >= 80 (free game only)
    free_paid = 0
    steps_free = 0
    win_steps_free = 0
    lit_steps = 0
    case_open = 0
    case_capped = 0
    case_bank = 0
    scatters0 = None
    wincap = False

    def close_spin():
        nonlocal burned_spin, blast_spin
        burn[gt] += burned_spin
        blast[gt] += blast_spin
        burned_spin = blast_spin = False

    for e in ev:
        t = e["type"]
        if t == "reveal":
            close_spin()
            gt = e["gameType"]
            spins[gt] += 1
            if gt == "freegame":
                free_spins += 1
        elif t == "layout":
            layout = e["id"]
        elif t == "freeSpinTrigger":
            if fs0 is None:
                fs0 = e["totalFs"]
                scatters0 = len(e["positions"])
        elif t == "freeSpinRetrigger":
            retr += 1
        elif t == "missionAssigned":
            mission = e["mission"]
        elif t == "updateGlobalMult":
            max_dial = max(max_dial, e["globalMult"])
        elif t == "fuseBurn":
            burned_spin = True
        elif t == "fuseBlast":
            blast_spin = True
        elif t == "wincap":
            wincap = True
        elif t == "winInfo" and gt == "freegame":
            win_steps_free += 1
            lit_any = False
            for w in e["wins"]:
                m = w.get("meta", {})
                lit_any = lit_any or bool(m.get("lit"))
                if m.get("banked"):
                    continue  # paid at caseOpen
                band = sum(m.get("globalMult", 1) >= x for x in DIAL_BANDS)
                win_by_band[band] += w["win"]
            lit_steps += lit_any
        elif t == "caseOpen":
            case_open += 1
            case_bank += e["bank"]
            case_capped += bool(e["capped"])
            band = sum(e["mult"] >= x for x in DIAL_BANDS)
            win_by_band[band] += e["win"]
    close_spin()
    if fs0 is not None and mission is None:
        mission = "briefing"  # a v1 book (no missionAssigned) plays the Briefing
    return (b["id"], b["payoutMultiplier"], fs0, scatters0, retr, free_spins, mission, layout, max_dial, burn["basegame"], blast["basegame"],
            spins["basegame"], burn["freegame"], blast["freegame"], spins["freegame"], tuple(win_by_band), win_steps_free, lit_steps, case_open,
            case_capped, case_bank, int(wincap), b.get("freeGameWins", 0), b.get("baseGameWins", 0))


def work(lines):
    return [book_facts(json.loads(ln)) for ln in lines]


def chunks(path, size=800, limit=None):
    buf = []
    n = 0
    with open(path, "rb") as fh:
        rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
        for line in rd:
            if not line.strip():
                continue
            buf.append(line)
            n += 1
            if len(buf) >= size:
                yield buf
                buf = []
            if limit and n >= limit:
                break
    if buf:
        yield buf


def sessions(w, p, rng, n_sessions=100000, spins=(100, 300)):
    cdf = np.cumsum(w) / w.sum()
    out = {}
    for s in spins:
        net = np.zeros(n_sessions)
        low = np.zeros(n_sessions)
        cur = np.zeros(n_sessions)
        for _ in range(s):
            idx = np.minimum(np.searchsorted(cdf, rng.random(n_sessions)), len(p) - 1)
            cur += p[idx] - 1.0
            low = np.minimum(low, cur)
        net = cur
        out[str(s)] = {"endsAboveStart": float((net > 0).mean()), "medianNet": float(np.median(net)), "meanNet": float(net.mean()),
                       "p10": float(np.percentile(net, 10)), "p90": float(np.percentile(net, 90)), "lostOverHalf": float((low <= -s / 2).mean())}
    return out


def analyze_mode(mode, procs, limit=None):
    w, p = ms.load_table(mode)
    W = w.sum()
    cost = COST[mode]
    out, share = ms.table_numbers(mode, w, p)
    edges = [0, 0.0001, 1.0001, 2, 5, 10, 20, 40, 100, 300, 1000, 5001] if mode == "base" else [0, 30, 40, 60, 100, 200, 300, 500, 1000, 2000, 5001]
    out["buckets"] = {f"[{a:g},{b:g})": {"share": round(share((p >= a) & (p < b)), 6), "rtpPoints": round(float((w * p)[(p >= a) & (p < b)].sum() / W / cost), 5)}
                      for a, b in zip(edges[:-1], edges[1:])}
    if mode == "base":
        out.update({"hit": share(p > 0), "pGtStake": share(p > 1 + 1e-9), "subStake": share((p > 0) & (p <= 1 + 1e-9)), "dead": share(p == 0)})
        out["pNoWinIn10"] = out["dead"] ** 10
        out["sessions"] = sessions(w, p, np.random.default_rng(7))
    else:
        out.update({"pGtPrice": share(p > cost + 1e-9), "floorX": float(p.min())})
    path = os.path.join(PUB, f"books_{mode}.jsonl.zst")
    t0 = time.time()
    rows = []
    with mp.get_context("fork").Pool(procs) as pool:
        for part in pool.imap(work, chunks(path, limit=limit)):
            rows.extend(part)
    out["books_read"] = len(rows)
    out["scan_s"] = round(time.time() - t0, 1)
    ids = np.array([r[0] for r in rows])
    wt = w[ids]
    Wt = wt.sum()

    def wsum(f):
        return float(sum(wt[i] * f(r) for i, r in enumerate(rows)))

    def col(k):
        return np.array([r[k] for r in rows], dtype=float)

    fs0 = [r[2] for r in rows]
    has_fs = np.array([x is not None for x in fs0])
    tier = collections.Counter()
    for i, r in enumerate(rows):
        if r[2] is not None:
            tier[r[2]] += wt[i]
    out["startSpins"] = {str(k): round(v / sum(tier.values()), 5) for k, v in sorted(tier.items())}
    sc = collections.Counter()
    for i, r in enumerate(rows):
        if r[3] is not None:
            sc[r[3]] += wt[i]
    out["scattersOnTrigger"] = {str(k): round(v / sum(sc.values()), 5) for k, v in sorted(sc.items())}
    if mode == "base":
        out["triggerShareOfSpins"] = float(wt[has_fs].sum() / Wt)
        out["triggerOneIn"] = float(Wt / wt[has_fs].sum())
        lay = collections.Counter()
        mis = collections.Counter()
        for i, r in enumerate(rows):
            lay[r[7]] += wt[i]
            if r[6]:
                mis[r[6]] += wt[i]
        out["layoutShare"] = {k: round(v / Wt, 5) for k, v in sorted(lay.items())}
        out["missionShareOfTriggers"] = {k: round(v / sum(mis.values()), 5) for k, v in sorted(mis.items())}
        out["baseSpinWire"] = {"burn": wsum(lambda r: r[9]) / wsum(lambda r: r[11]), "blast": wsum(lambda r: r[10]) / wsum(lambda r: r[11])}
        out["freeGameRtpShare"] = float(wsum(lambda r: r[22]) / wsum(lambda r: r[1]))
        fm = {}
        for m in sorted(mis):
            idx = [i for i, r in enumerate(rows) if r[6] == m]
            ww = wt[idx]
            pp = np.array([rows[i][1] for i in idx], float) / 100
            fm[m] = {"meanBookWinX": float((ww * pp).sum() / ww.sum()), "medianBookWinX": ms.wquant(pp, ww, 0.5),
                     "freeSpinsPlayed": float(sum(ww[j] * rows[i][5] for j, i in enumerate(idx)) / ww.sum()),
                     "retriggerShare": float(sum(ww[j] * (rows[i][4] > 0) for j, i in enumerate(idx)) / ww.sum())}
        out["perMission"] = fm
    else:
        out["freeSpinsPlayed"] = wsum(lambda r: r[5]) / Wt
        out["retriggerShare"] = wsum(lambda r: r[4] > 0) / Wt
        out["maxDialMean"] = wsum(lambda r: r[8]) / Wt
        for thr in (25, 50, 100):
            out[f"shareDialReaches{thr}"] = wsum(lambda r, t=thr: r[8] >= t) / Wt
        bands = np.array([[wt[i] * x for x in r[15]] for i, r in enumerate(rows)]).sum(axis=0)
        out["rtpByDialBand"] = {lbl: round(float(v / bands.sum()), 4) for lbl, v in zip(("<20", "20-49", "50-79", ">=80"), bands)}
        out["rtpShareDialGe20"] = float(bands[1:].sum() / bands.sum())
        out["freeWireBurn"] = wsum(lambda r: r[12]) / max(wsum(lambda r: r[14]), 1e-9)
        out["freeWireBlast"] = wsum(lambda r: r[13]) / max(wsum(lambda r: r[14]), 1e-9)
        steps = wsum(lambda r: r[16])
        out["winningStepsPerBook"] = steps / Wt
        if mode == "entrance_blackout":
            out["litShareOfWinningSteps"] = wsum(lambda r: r[17]) / max(steps, 1e-9)
        if mode == "entrance_orders":
            out["caseOpensPerBook"] = wsum(lambda r: r[18]) / Wt
            out["caseOpenCappedShare"] = wsum(lambda r: r[19]) / max(wsum(lambda r: r[18]), 1e-9)
            out["meanBankX"] = wsum(lambda r: r[20]) / max(wsum(lambda r: r[18]), 1e-9) / 100
        out["wincapBooks"] = int(sum(r[21] for r in rows))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--modes", default=",".join(MODES))
    ap.add_argument("--procs", type=int, default=3)
    ap.add_argument("--limit", type=int, default=None, help="only the first N books of each mode (quick test)")
    ap.add_argument("--out", default=os.path.join(LIB, "analysis_v2.json"))
    a = ap.parse_args(argv)
    res = {}
    for m in a.modes.split(","):
        t0 = time.time()
        res[m] = analyze_mode(m, max(1, min(a.procs, 3)), a.limit)
        print(f"== {m} ({time.time() - t0:.0f} s)")
        print(json.dumps(res[m], indent=1)[:6000])
        json.dump(res, open(a.out, "w"), indent=1)
    return res


if __name__ == "__main__":
    main()
