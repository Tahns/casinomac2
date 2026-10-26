"""Weighted analysis of publish_files books (run with env python): multiplier meter, wire rates, trigger freq, sessions.
usage: analyze.py [limit_books_per_mode]"""
import csv, io, json, os, sys, collections, random
import zstandard
HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "..", "library", "publish_files")
CAP = 100


def weights(mode):
    return {int(a): int(b) for a, b, _ in csv.reader(open(f"{PUB}/lookUpTable_{mode}_0.csv"))}


def books(mode):
    t = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(open(f"{PUB}/books_{mode}.jsonl.zst", "rb")))
    for line in t:
        yield json.loads(line)


def spins(ev):
    out, cur = [], None
    for e in ev:
        if e["type"] == "reveal":
            cur = [e]; out.append(cur)
        elif cur is not None:
            cur.append(e)
    return out


def base_stats():
    w = weights("base"); W = sum(w.values())
    n = sp_burn = sp_burn3 = sp_blast = sp_blast_pay = 0; trig = 0
    spw = 0.0
    c = collections.Counter()
    for b in books("base"):
        wt = w[b["id"]]
        for s in spins(b["events"]):
            if s[0]["gameType"] != "basegame":
                continue
            nb = sum(e["type"] == "fuseBurn" for e in s)
            bl = any(e["type"] == "fuseBlast" for e in s)
            mx = max([1] + [e["burned"] for e in s if e["type"] == "fuseBurn"])
            c["spins"] += wt
            c["burn>=2 (wire starts to burn)"] += wt * (nb > 0)
            c["burned>=3"] += wt * (mx >= 3)
            c["blast"] += wt * bl
        if any(e["type"] == "freeSpinTrigger" for e in b["events"]):
            c["trigger"] += wt
    S = c["spins"]
    print("BASE spins (weighted):", S / W, "(books with one base spin each:", W, ")")
    for k in ("burn>=2 (wire starts to burn)", "burned>=3", "blast"):
        print(f"  share of base spins with {k}: {c[k]/S:.4f}")
    print(f"  trigger: {c['trigger']/W:.5f}  => 1 in {W/c['trigger']:.1f} spins")


def bonus_stats():
    w = weights("bonus"); W = sum(w.values())
    c = collections.Counter(); finalmax = collections.Counter(); hist = collections.Counter()
    fs_spins = 0.0; blast_fs = 0.0; steps = collections.Counter(); chain = collections.Counter()
    start_spins = collections.Counter()
    for b in books("bonus"):
        wt = w[b["id"]]
        ev = b["events"]
        gm = [e["globalMult"] for e in ev if e["type"] == "updateGlobalMult"]
        mx = max(gm) if gm else 1
        finalmax[min(mx, 100)] += wt
        c["books"] += wt
        c["reach_cap"] += wt * (mx >= CAP)
        c["max>=50"] += wt * (mx >= 50)
        c["max>=25"] += wt * (mx >= 25)
        c["max>=10"] += wt * (mx >= 10)
        n_spins = 0; blasts = 0
        for s in spins(ev):
            if s[0]["gameType"] == "freegame":
                n_spins += 1
                blasts += any(e["type"] == "fuseBlast" for e in s)
                nwin = sum(e["type"] == "winInfo" for e in s)
                chain[min(nwin, 30)] += wt
        c["fs_spins"] += wt * n_spins
        c["fs_blast"] += wt * blasts
        c["wins>=1000x"] += wt * (b["payoutMultiplier"] >= 100000)
        # which part of payout is paid with mult>=20
        hi = 0.0
        for e in ev:
            if e["type"] == "winInfo":
                for x in e["wins"]:
                    if x["meta"]["globalMult"] >= 20:
                        hi += x["win"]
        c["rtp_mult>=20"] += wt * hi
        c["rtp_all"] += wt * b["payoutMultiplier"] / 100
    print("BONUS mean free spins played per purchase: %.2f; wire blast share of free spins: %.4f" % (c["fs_spins"] / W, c["fs_blast"] / c["fs_spins"]))
    for k in ("max>=10", "max>=25", "max>=50", "reach_cap"):
        print(f"  share of purchases whose meter reaches {k}: {c[k]/W:.4f}")
    print("  share of the RTP paid at meter >= 20: %.3f" % (c["rtp_mult>=20"] / c["rtp_all"]))
    print("  max meter histogram:", {k: round(v / W, 4) for k, v in sorted(finalmax.items())})
    print("  winning steps per free spin (share):", {k: round(v / sum(chain.values()), 4) for k, v in sorted(chain.items())})


def sessions(mode_n=(100, 300), n=100000, seed=3):
    w = weights("base")
    pay = {}
    for _, wt, p in csv.reader(open(f"{PUB}/lookUpTable_base_0.csv")):
        pay[int(p)] = pay.get(int(p), 0) + int(wt)
    import numpy as np
    vals = np.array(sorted(pay)); pr = np.array([pay[v] for v in vals], float); pr /= pr.sum()
    rng = np.random.default_rng(seed)
    for spins_n in mode_n:
        net = np.empty(n)
        for i in range(0, n, 5000):
            k = min(5000, n - i)
            draw = rng.choice(vals, size=(k, spins_n), p=pr)
            net[i:i + k] = draw.sum(axis=1) / 100.0 - spins_n
        print(f"SESSION {spins_n} spins bet 1: P(net>0)={np.mean(net>0):.3f} median net={np.median(net):.1f} mean={net.mean():.2f} p10={np.percentile(net,10):.1f} p90={np.percentile(net,90):.1f} P(<=-0.5*spins)={np.mean(net<=-0.5*spins_n):.3f}")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("all", "base"): base_stats()
    if what in ("all", "bonus"): bonus_stats()
    if what in ("all", "sessions"): sessions()
