"""Proxy simulator for the 03 multi-bonus study (research only, NOT the SDK, NOT the final math).

What it models: a 6x5 cluster/tumble bonus on the REAL FR0 strip, SDK-style stop windows and tumble refill from
the strip (new symbols read upward from the stop position), the real paytable, wild joins any payer, scatter inert,
retrigger on 3+ scatters on the final board of a spin (5/8/10/12/15/18 spins), win cap 5000x.
The bomb-timer wire follows the SDK rules (self-avoiding path from reel 0, burn per winning step, one blast per
spin on a dead board, burnt non-scatter cells vanish, no wild). It leaves out the lookup-table reweighting.
So the absolute level is NOT the published math; only compare variants with each other. Each variant has one
parameter tuned so that its mean bonus win equals the Briefing baseline mean (equal-RTP comparison).

usage: python3 03_missions_proxy.py [bonuses_per_variant]      (about 3.5 min on 4 cores for 32000)
       python3 03_missions_proxy.py dial                       (volatility dial of the plain ratchet bonus)
       python3 03_missions_proxy.py cover                      (Cover Blown: meter step x unmask spacing, about 3 min)
Internal variant ids: 'timebomb' = Locked Case, 'lineup' = Cover Blown, 'searchlight', 'cold' (rejected), 'briefing'
(Demolition Run is 'briefing' with a long pre-burnt wire).
"""
import csv, random, sys, math, os
from multiprocessing import Pool

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "math", "games", "agent_mambo", "reels")
NC, NR = 6, 5
PAY = {'H1': (5.0, 12.5, 25.0, 60.0), 'H2': (2.0, 5.0, 10.0, 40.0), 'H3': (1.3, 3.2, 7.0, 30.0),
       'H4': (1.0, 2.5, 6.0, 20.0), 'L1': (0.6, 1.5, 4.0, 10.0), 'L2': (0.4, 1.2, 3.5, 8.0),
       'L3': (0.2, 0.8, 2.5, 5.0), 'L4': (0.1, 0.5, 1.5, 4.0)}
RETRIG = {3: 5, 4: 8, 5: 10, 6: 12, 7: 15, 8: 18}
CAP = 5000.0


def load(name):
    rows = list(csv.reader(open(os.path.join(ROOT, name + ".csv"))))
    return [list(c) for c in zip(*rows)]  # [reel][pos]


FR0 = load("FR0")
PAYERS = list(PAY)


def tier(n):
    return 0 if n <= 5 else 1 if n <= 8 else 2 if n <= 12 else 3


def stage_strips(k):
    """Line-Up: stage k removes the k lowest payers (L4, L3, L2, L1) from the refill pool.
    Each removed position is replaced by a remaining payer, chosen with the strip's own frequencies (fixed seed)."""
    order = ['L4', 'L3', 'L2', 'L1']
    gone = set(order[:k])
    rnd = random.Random(777 + k)
    keep = [s for s in PAYERS if s not in gone]
    w = [sum(1 for r in FR0 for x in r if x == s) for s in keep]
    out = []
    for r in FR0:
        out.append([rnd.choices(keep, w)[0] if x in gone else x for x in r])
    return out


STAGES = [FR0] + [stage_strips(k) for k in range(1, 5)]

NB = {}
for c in range(NC):
    for r in range(NR):
        L = []
        if c > 0: L.append((c - 1, r))
        if c < NC - 1: L.append((c + 1, r))
        if r > 0: L.append((c, r - 1))
        if r < NR - 1: L.append((c, r + 1))
        NB[(c, r)] = L


def evaluate(col):
    """returns list of (symbol, cells, base_win) and the set of cells to remove."""
    out = []
    for sym in PAYERS:
        seen = set()
        for c in range(NC):
            for r in range(NR):
                if col[c][r] != sym or (c, r) in seen:
                    continue
                comp = {(c, r)}
                seen.add((c, r))
                st = [(c, r)]
                while st:
                    x = st.pop()
                    for u in NB[x]:
                        if u in comp:
                            continue
                        v = col[u[0]][u[1]]
                        if v == sym or v == 'W':
                            comp.add(u)
                            st.append(u)
                            if v == sym:
                                seen.add(u)
                if len(comp) >= 5:
                    out.append((sym, comp, PAY[sym][tier(len(comp))]))
    return out


def make_path(rng, length):
    while True:
        path = [(0, rng.randrange(NR))]
        while len(path) < length:
            c, r = path[-1]
            opts, wts = [], []
            for dc, dr, w in ((1, 0, 2), (0, -1, 1), (0, 1, 1)):
                nc, nr = c + dc, r + dr
                if nc < NC and 0 <= nr < NR and (nc, nr) not in path:
                    opts.append((nc, nr))
                    wts.append(w)
            if not opts:
                break
            path.append(rng.choices(opts, wts)[0])
        if len(path) == length:
            return path


DEFAULT_WIRE = dict(len=8, b0=1, adv=1, detmin=3)


def route_cols(rng, n=40, wc=2, wr=2):
    """telegraphed searchlight route: a wc x wr window that bounces diagonally across the board, one position per
    evaluation step of the spin (announced at reveal, like the wire)"""
    c0 = rng.randrange(NC - wc + 1)
    r0 = rng.randrange(NR - wr + 1)
    dc = 1 if rng.random() < 0.5 else -1
    dr = 1 if rng.random() < 0.5 else -1
    out = []
    for _ in range(n):
        out.append({(c, r) for c in range(c0, c0 + wc) for r in range(r0, r0 + wr)})
        if not 0 <= c0 + dc <= NC - wc:
            dc = -dc
        c0 += dc
        if not 0 <= r0 + dr <= NR - wr:
            dr = -dr
        r0 += dr
    return out


def play(rng, variant, P):
    """one whole bonus -> (total win in x bet, spins played, winning steps, max meter)"""
    strips = STAGES[0]
    stage = 0
    spins_left = P.get('spins', 10)
    total = 0.0
    M = P.get('m0', 1)
    played = 0
    wsteps = 0
    mmax = M
    smax = 0
    while spins_left > 0 and played < 250:
        spins_left -= 1
        played += 1
        pos = [rng.randrange(len(strips[c])) for c in range(NC)]
        col = [[strips[c][(pos[c] + i) % len(strips[c])] for i in range(NR)] for c in range(NC)]
        bank = 0.0
        steps = 0
        lit = route_cols(rng, 40, *P.get('win', (2, 2))) if variant == 'searchlight' else None
        wcfg = P.get('wire', DEFAULT_WIRE)
        wpath = make_path(rng, wcfg['len']) if wcfg else None
        burn = wcfg['b0'] if wcfg else 0
        spent = not wcfg
        while True:
            cl = evaluate(col)
            if not cl:
                if not spent:
                    spent = True
                    if burn >= wcfg['detmin']:
                        dead = {cell for cell in wpath[:burn] if col[cell[0]][cell[1]] != 'S'}
                        if dead:
                            for c in range(NC):
                                gone = sum(1 for r in range(NR) if (c, r) in dead)
                                if not gone:
                                    continue
                                keep = [col[c][r] for r in range(NR) if (c, r) not in dead]
                                new = []
                                p_ = pos[c]
                                for _k in range(gone):
                                    p_ = (p_ - 1) % len(strips[c])
                                    new.insert(0, strips[c][p_])
                                pos[c] = p_
                                col[c] = new + keep
                            continue
                break
            base = 0.0
            if variant == 'searchlight':
                region = lit[min(steps, len(lit) - 1)]
                for sym, comp, bw in cl:
                    f = P['f'] if (comp & region) else 1.0
                    base += bw * f
            else:
                base = sum(bw for _, _, bw in cl)
            if variant == 'timebomb':
                bank += base
            else:
                total += base * M
            steps += 1
            wsteps += 1
            M = min(M + P['step'], P.get('cap', 100))
            mmax = max(mmax, M)
            if variant == 'lineup':
                ns = min(4, int((M - 1) // P['unmask']))
                if ns != stage:
                    stage = ns
                    smax = max(smax, stage)
                    strips = STAGES[stage]
            if total >= CAP:
                break
            if not spent:
                burn = min(burn + wcfg['adv'], wcfg['len'])
            dead = set()
            for _, comp, _ in cl:
                dead |= comp
            for c in range(NC):
                gone = sum(1 for r in range(NR) if (c, r) in dead)
                if not gone:
                    continue
                keep = [col[c][r] for r in range(NR) if (c, r) not in dead]
                new = []
                p = pos[c]
                for _k in range(gone):
                    p = (p - 1) % len(strips[c])
                    new.insert(0, strips[c][p])
                pos[c] = p
                col[c] = new + keep
        if variant == 'timebomb':
            total += bank * M
        if variant == 'cold' and steps == 0:
            M = max(P.get('m0', 1), M // 2)
        if total >= CAP:
            total = CAP
            break
        ns = sum(1 for c in range(NC) for r in range(NR) if col[c][r] == 'S')
        if ns >= 3 and P.get('retrig', True):
            spins_left += RETRIG[min(ns, 8)]
    return min(total, CAP), played, wsteps, mmax, smax


def job(args):
    variant, P, n, seed = args
    rng = random.Random(seed)
    res = [play(rng, variant, P) for _ in range(n)]
    return res


def stats(res):
    t = sorted(r[0] for r in res)
    n = len(t)
    mean = sum(t) / n
    sd = math.sqrt(sum((x - mean) ** 2 for x in t) / n)
    q = lambda p: t[min(n - 1, int(p * n))]
    ge = lambda x: 100.0 * sum(1 for v in t if v >= x) / n
    c = [v for v in t if v >= 30.0]  # what a 30x buy floor keeps (rejection sampling in the SDK)
    cm = sum(c) / len(c) if c else 0.0
    csd = math.sqrt(sum((x - cm) ** 2 for x in c) / len(c)) if c else 0.0
    return dict(cmean=cm, csd=csd, ccv=csd / cm if cm else 0, mean=mean, sd=sd, cv=sd / mean if mean else 0, med=q(0.5), p10=q(0.1), p90=q(0.9), p99=q(0.99),
                ge30=ge(30), ge100=ge(100), ge300=ge(300), ge1000=ge(1000), le10=100 - ge(10.0000001),
                spins=sum(r[1] for r in res) / n, wsteps=sum(r[2] for r in res) / n, mmax=sum(r[3] for r in res) / n)


def run(pool, variant, P, n, seed=1):
    chunks = 8
    per = n // chunks
    parts = pool.map(job, [(variant, P, per, seed * 1000 + k) for k in range(chunks)])
    return stats([x for p in parts for x in p])


def tune(pool, variant, base_P, key, values, target, n):
    best = None
    for v in values:
        P = dict(base_P)
        P[key] = v
        s = run(pool, variant, P, n, seed=5)
        err = abs(s['cmean'] - target) / target
        print(f"    tune {variant} {key}={v}: post-floor mean {s['cmean']:.1f} (target {target:.1f}); raw mean {s['mean']:.1f}", flush=True)
        if best is None or err < best[0]:
            best = (err, v, s)
    P = dict(base_P)
    P[key] = best[1]
    return P


def dial():
    N, NT, tgt = 16000, 4000, 98.2
    with Pool(4) as pool:
        print("| Briefing dial: start spins | tuned meter step | post-floor mean | cv | median | p90 | <30x | >=100x | >=300x | >=1000x | spins played |")
        print("|---|---|---|---|---|---|---|---|---|---|---|")
        for sp, steps in ((5, [12, 16, 20, 26, 32]), (7, [8, 10, 13, 16, 20]), (10, [8]), (15, [4, 5, 6, 7]), (20, [3, 4, 5, 6])):
            best = None
            for st in steps:
                P = dict(spins=sp, m0=1, step=st, cap=100)
                s = run(pool, 'briefing', P, NT, seed=5)
                if best is None or abs(s['cmean'] - tgt) < abs(best[1]['cmean'] - tgt):
                    best = (P, s)
            P = best[0]
            s = run(pool, 'briefing', P, N, seed=21)
            print(f"| {sp} | {P['step']} | {s['cmean']:.1f} | {s['ccv']:.2f} | {s['med']:.1f} | {s['p90']:.1f} | {100-s['ge30']:.1f}% | {s['ge100']:.1f}% | {s['ge300']:.2f}% | {s['ge1000']:.2f}% | {s['spins']:.1f} |", flush=True)


def _cover_job(args):
    st, un, n, seed = args
    rng = random.Random(seed)
    P = dict(spins=10, m0=1, step=st, cap=100, unmask=un)
    return [play(rng, 'lineup', P) for _ in range(n)]


def cover():
    """Cover Blown: how often does the first unmask happen at a given post-floor mean? (20 000 bonuses per setting)"""
    with Pool(4) as pool:
        print("| meter step | unmask every | post-floor mean | cv | median | below 30x | 300x+ | 1000x+ | reach 1 unmask | 2 | 3 | 4 |")
        print("|---|---|---|---|---|---|---|---|---|---|---|---|")
        for st in (1, 2, 3, 4):
            for un in (4, 6, 8, 12, 16, 24, 32):
                parts = pool.map(_cover_job, [(st, un, 2500, 100 + k) for k in range(8)])
                res = [x for q in parts for x in q]
                s = stats(res)
                n = len(res)
                r = [100.0 * sum(1 for x in res if x[4] >= k) / n for k in (1, 2, 3, 4)]
                print(f"| {st} | {un} | {s['cmean']:.1f} | {s['ccv']:.2f} | {s['med']:.1f} | {100-s['ge30']:.1f}% | {s['ge300']:.2f}% | {s['ge1000']:.2f}% | {r[0]:.1f}% | {r[1]:.1f}% | {r[2]:.1f}% | {r[3]:.1f}% |", flush=True)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "dial":
        dial()
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cover":
        cover()
        sys.exit(0)
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 24000
    NT = max(4000, N // 4)
    with Pool(4) as pool:
        base_P = dict(spins=10, m0=1, step=8, cap=100)
        b = run(pool, 'briefing', base_P, N, seed=11)
        tgt = b['cmean']
        print(f"BRIEFING baseline P={base_P}: raw mean {b['mean']:.1f}, post-floor(>=30x) mean {tgt:.1f}", flush=True)
        rows = [('Briefing (ratchet)', base_P, b)]
        # Cold Trail: meter +u per winning step, halves after a spin with no winning step
        P = tune(pool, 'cold', dict(spins=10, m0=1, step=8, cap=100), 'step', [14, 20, 28, 36, 48], tgt, NT)
        rows.append(('Cold Trail (meter halves on a dead spin)', P, run(pool, 'cold', P, N, seed=12)))
        # Demolition Run: same ratchet meter, but the wire is long and pre-burnt, so almost every dead board blasts
        P = tune(pool, 'briefing', dict(spins=10, m0=1, step=3, cap=100, wire=dict(len=12, b0=5, adv=2, detmin=3)), 'step', [1, 2, 3, 4], tgt, NT)
        rows.append(('Demolition Run (long pre-burnt wire, blast on most dead boards)', P, run(pool, 'briefing', P, N, seed=16)))
        # Time Bomb: spin win banked, paid x final meter of the spin; shorter bonus
        best = None
        for sp in (10,):
            P0 = dict(spins=sp, m0=1, step=2, cap=100)
            P = tune(pool, 'timebomb', P0, 'step', [6, 7, 8, 9], tgt, NT)
            s = run(pool, 'timebomb', P, NT, seed=6)
            if best is None or abs(s['cmean'] - tgt) < abs(best[1]['cmean'] - tgt):
                best = (P, s)
        rows.append(('Locked Case (bank, pay x meter at spin end)', best[0], run(pool, 'timebomb', best[0], N, seed=13)))
        # Searchlight: x f on clusters touching a lit 2x2 window; the window bounces diagonally on a telegraphed route
        best = None
        for f in (2, 3, 4):
            P = tune(pool, 'searchlight', dict(spins=10, m0=1, step=4, cap=100, f=f, win=(2, 2)), 'step', [2, 3, 4, 5, 6], tgt, NT)
            s_ = run(pool, 'searchlight', P, NT, seed=7)
            if best is None or abs(s_['cmean'] - tgt) < abs(best[1]['cmean'] - tgt):
                best = (P, s_)
        rows.append(('Searchlight (x f if cluster touches the lit 2x2 window)', best[0], run(pool, 'searchlight', best[0], N, seed=14)))
        # Line-Up: one low payer unmasked every `unmask` meter points
        P = tune(pool, 'lineup', dict(spins=10, m0=1, step=4, cap=100, unmask=8), 'unmask', [28, 32, 36, 40, 44, 48], tgt, NT)
        rows.append(('Cover Blown (low symbols leave the pool as meter rises)', P, run(pool, 'lineup', P, N, seed=15)))
    print()
    print("| Mission (proxy) | tuned params | raw mean | post-floor mean | post-floor cv | median | p90 | p99 | <30x | >=100x | >=300x | >=1000x | spins played | win steps | mean peak meter |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for name, P, s in rows:
        pp = {k: v for k, v in P.items() if k in ('spins', 'step', 'unmask', 'f')}
        if P.get('wire') and P['wire'] != DEFAULT_WIRE:
            pp['wire'] = '12/5/2/3'
        print(f"| {name} | {pp} | {s['mean']:.1f} | {s['cmean']:.1f} | {s['ccv']:.2f} | {s['med']:.1f} | {s['p90']:.1f} | {s['p99']:.0f} | {100-s['ge30']:.1f}% | {s['ge100']:.1f}% | {s['ge300']:.2f}% | {s['ge1000']:.2f}% | {s['spins']:.1f} | {s['wsteps']:.1f} | {s['mmax']:.0f} |")
