"""Analysis of gap_02_Q2_rules_sim.py output (Q2). usage: python3 gap_02_Q2_analyse.py main.pkl [layout.pkl]
Iso-scaling: k = cluster raw base mean / rule raw base mean; s* = Mission Meter step that gives the cluster bonus mean again."""
import sys, pickle, math, json
import math
def meter_total(steps, step=8, start=1, cap=100):
    t = 0.0
    m = start
    for x in steps:
        t += x * m
        m = min(m + step, cap)
    return t
def mean_sd(xs):
    n = len(xs); m = sum(xs) / n
    v = sum((x - m) ** 2 for x in xs) / n
    return m, math.sqrt(v)


CAP = 5000.0
R = pickle.load(open(sys.argv[1], "rb"))
base_rule = "cluster"
UNIT_MIN = 0.1   # smallest raw pay unit (L4, lowest tier / per way) before scaling, all rules


def pct(xs, q):
    s = sorted(xs)
    return s[min(len(s) - 1, int(len(s) * q))]


def base_stats(rule):
    b = R[rule]["base"]
    n = len(b)
    raw = [x[0] for x in b]
    m, sd = mean_sd(raw)
    hit = sum(1 for x in b if x[1] > 0) / n
    steps = sum(x[1] for x in b)
    nb = sum(x[3] for x in b)
    return dict(n=n, hit=hit, raw_mean=m, raw_sd=sd, steps_spin=steps / n, steps_hit=steps / max(1, sum(1 for x in b if x[1] > 0)),
                trig=sum(1 for x in b if x[2] >= 4) / n, s3=sum(1 for x in b if x[2] >= 3) / n, blast=nb / n,
                blast_paid=sum(x[4] for x in b) / max(1, nb), raw=raw)


def bonus_stats(rule, k, step, cap=100):
    rs = R[rule]["bonus"]
    tot = [min(CAP, k * meter_total(r[0], step, 1, cap)) for r in rs]
    m, sd = mean_sd(tot)
    return dict(mean=m, sd=sd, cv=sd / m if m else float("nan"), med=pct(tot, 0.5), p100=sum(t > 100 for t in tot) / len(tot),
                plt30=sum(t < 30 for t in tot) / len(tot), p0=sum(t == 0 for t in tot) / len(tot), tot=tot)


def bonus_shape(rule):
    rs = R[rule]["bonus"]
    fs = sum(r[1] for r in rs)
    steps = sum(len(r[0]) for r in rs)
    return dict(fs_round=fs / len(rs), win_spin=sum(r[2] for r in rs) / fs, steps_spin=steps / fs, steps_round=steps / len(rs),
                blast_spin=sum(r[3] for r in rs) / fs, blast_paid=sum(r[4] for r in rs) / max(1, sum(r[3] for r in rs)),
                cap_share=sum(1 for r in rs if len(r[0]) >= 13) / len(rs))


def solve_step(rule, k, target):
    """smallest-error meter step (0..80, 0.5 grid) so that the bonus mean equals target; returns step or None"""
    rs = R[rule]["bonus"]
    best = None
    prev = None
    for s2 in range(0, 161):
        s = s2 / 2
        m = sum(k * meter_total(r[0], s) for r in rs) / len(rs)
        if prev is not None and (prev[1] - target) * (m - target) <= 0:
            # linear interpolation
            if m == prev[1]:
                return s
            return prev[0] + (target - prev[1]) / (m - prev[1]) * (s - prev[0])
        prev = (s, m)
    return None if prev[1] < target else 0.0


out = {}
cb = base_stats(base_rule)
target_base = cb["raw_mean"]
cbo = bonus_stats(base_rule, 1.0, 8)
target_bonus = cbo["mean"]
print(f"reference cluster: base raw mean {target_base:.4f} hit {cb['hit']:.4f}; bonus mean at step 8 {target_bonus:.2f}")
rows = []
for rule in R:
    b = base_stats(rule)
    k = target_base / b["raw_mean"]
    sc = [min(CAP, k * x) for x in b["raw"]]
    n = len(sc)
    hit = b["hit"]
    p1 = sum(1 for x in sc if x > 1.0) / n
    p5 = sum(1 for x in sc if x >= 5.0) / n
    p10 = sum(1 for x in sc if x >= 10.0) / n
    m, sd = mean_sd(sc)
    bs = bonus_shape(rule)
    b8 = bonus_stats(rule, k, 8)           # same step 8 and iso-base scale
    b8raw = bonus_stats(rule, 1.0, 8)      # unscaled
    s_star = solve_step(rule, k, target_bonus)
    bs_star = bonus_stats(rule, k, s_star) if s_star is not None else None
    row = dict(rule=rule, hit=hit, steps_spin=b["steps_spin"], steps_hit=b["steps_hit"], raw_mean=b["raw_mean"], k=k,
               cv=sd / m, p_gt1=p1, p_ge5=p5, p_ge10=p10, ldw=(hit - p1) / hit if hit else float("nan"),
               trig=b["trig"], s3=b["s3"], blast=b["blast"], blast_paid=b["blast_paid"],
               unit_min=UNIT_MIN * k, max_base=max(sc),
               bonus_fs=bs["fs_round"], bonus_winspin=bs["win_spin"], bonus_steps_spin=bs["steps_spin"], bonus_steps_round=bs["steps_round"],
               bonus_blast=bs["blast_spin"], bonus_blast_paid=bs["blast_paid"], bonus_cap=bs["cap_share"],
               b8_mean=b8["mean"], b8_ratio=b8["mean"] / target_bonus, b8_cv=b8["cv"], b8_p100=b8["p100"], b8_plt30=b8["plt30"], b8_med=b8["med"],
               s_star=s_star)
    if bs_star:
        row.update(bs_mean=bs_star["mean"], bs_cv=bs_star["cv"], bs_p100=bs_star["p100"], bs_plt30=bs_star["plt30"], bs_med=bs_star["med"])
    rows.append(row)

hdr = "rule          hit%   st/sp st/hit rawmean   k     cv   P>1x%  P>=5x%  LDW%  trig%  blast%  pblast% unitmin | fs/rd win/sp st/sp st/rd cap% | b8mean  ratio  cv   P>100%  P<30%  med | s*   cv*   P>100*  P<30*"
print(hdr)
for r in rows:
    print(f"{r['rule']:12s} {100*r['hit']:5.1f} {r['steps_spin']:6.3f} {r['steps_hit']:5.2f} {r['raw_mean']:8.3f} {r['k']:6.3f} {r['cv']:5.2f} {100*r['p_gt1']:5.2f} {100*r['p_ge5']:6.3f} {100*r['ldw']:5.1f} {100*r['trig']:6.3f} {100*r['blast']:6.2f} {100*r['blast_paid']:6.1f} {r['unit_min']:7.4f} | "
          f"{r['bonus_fs']:5.1f} {100*r['bonus_winspin']:5.1f} {r['bonus_steps_spin']:5.2f} {r['bonus_steps_round']:5.1f} {100*r['bonus_cap']:4.1f} | {r['b8_mean']:8.1f} {r['b8_ratio']:5.2f} {r['b8_cv']:5.2f} {100*r['b8_p100']:5.1f} {100*r['b8_plt30']:5.1f} {r['b8_med']:6.1f} | "
          + (f"{r['s_star']:5.1f} {r['bs_cv']:5.2f} {100*r['bs_p100']:5.1f} {100*r['bs_plt30']:5.1f}" if r.get('bs_cv') is not None and r['s_star'] is not None else " n/a"))
json.dump(rows, open("rows.json", "w"), indent=1)

if len(sys.argv) > 2:
    L = pickle.load(open(sys.argv[2], "rb"))
    lays = []
    for (rule, ln), (h, t, st, n) in L.items():
        if ln not in lays:
            lays.append(ln)
    rules = []
    for (rule, ln) in L:
        if rule not in rules:
            rules.append(rule)
    print("\nLAYOUT deltas (hit / mean) vs 6x5 of the same rule; no wire, meter x1")
    print("rule         " + " | ".join(f"{ln:18s}" for ln in lays))
    for rule in rules:
        ref = L[(rule, "6x5 (30)")]
        rh, rm = ref[0] / ref[3], ref[1] / ref[3]
        cells = []
        for ln in lays:
            if (rule, ln) not in L:
                cells.append("n/a".ljust(18))
                continue
            h, t, st, n = L[(rule, ln)]
            cells.append(f"{100*h/n:4.1f}% {100*(h/n/rh-1):+4.0f}% {100*((t/n)/rm-1):+5.0f}%".ljust(18))
        print(f"{rule:12s} " + " | ".join(cells))
