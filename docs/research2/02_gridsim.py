"""Grid-shape proxy simulator for Agent Mambo (research only, not the SDK).
Uses the REAL strips (BR0/FR0), SDK-style stop positions (consecutive window), SDK-style tumble (refill from the
strip going upward), real paytable, wild joins any payer, S inert. Multiplier fixed at x1 (no meter, no wire).
Each shape = list per reel of ACTIVE rows (row index 0 = top); adjacency is geometric (uses true rows), gravity
compacts the active cells of a column (symbols skip over holes). Hex = odd columns shifted down half a cell.
Tubes = extra adjacency pairs.
usage: python3 02_gridsim.py [nspins] [BR0|FR0] [shape-name filter, "|" separated]
Research proxy only (not the SDK); see docs/research2/02_variable_grids.md section 3."""
import csv, random, sys
from multiprocessing import Pool

import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "math", "games", "agent_mambo", "reels") + os.sep
STR = {k: list(zip(*list(csv.reader(open(ROOT + k + ".csv"))))) for k in ("BR0", "FR0")}
for k in STR:
    STR[k] = list(STR[k]) + [STR[k][i] for i in range(2)]  # reels 7,8 reuse strips 0,1  # [reel][pos]
PAY = {'H1': (5.0, 12.5, 25.0, 60.0), 'H2': (2.0, 5.0, 10.0, 40.0), 'H3': (1.3, 3.2, 7.0, 30.0),
       'H4': (1.0, 2.5, 6.0, 20.0), 'L1': (0.6, 1.5, 4.0, 10.0), 'L2': (0.4, 1.2, 3.5, 8.0),
       'L3': (0.2, 0.8, 2.5, 5.0), 'L4': (0.1, 0.5, 1.5, 4.0)}


def tier(n):
    return 0 if n <= 5 else 1 if n <= 8 else 2 if n <= 12 else 3


def full(rows=5, cols=6):
    return [list(range(rows)) for _ in range(cols)]


def holes(rows, cols, hs):
    return [[r for r in range(rows) if (c, r) not in hs] for c in range(cols)]


SHAPES = {
    "6x5 full (30)": dict(act=full()),
    "6x4 lobby (24)": dict(act=full(4)),
    "6x6 (36)": dict(act=full(6)),
    "6x7 (42)": dict(act=full(7)),
    "atrium corners cut (26)": dict(act=holes(5, 6, {(0, 0), (5, 0), (0, 4), (5, 4)})),
    "pillars x4 (26)": dict(act=holes(5, 6, {(1, 1), (1, 3), (4, 1), (4, 3)})),
    "centre vault 2 holes (28)": dict(act=holes(5, 6, {(2, 2), (3, 2)})),
    "partition wall + door (26)": dict(act=holes(5, 6, {(2, 0), (2, 1), (2, 3), (2, 4)})),
    "skyline 3-4-5-5-4-3 bottom (24)": dict(act=[list(range(5 - h, 5)) for h in (3, 4, 5, 5, 4, 3)]),
    "6x5 hex adjacency (30)": dict(act=full(), hex=True),
    "6x5 + 2 tube pairs (30)": dict(act=full(), tubes=2),
    "5x5 square (25)": dict(act=[list(range(5)) for _ in range(5)]),
    "7x7 square (49)": dict(act=[list(range(7)) for _ in range(7)]),
    "4 cols x 8 rows tower (32)": dict(act=[list(range(8)) for _ in range(4)]),
    "8 cols x 4 rows wide (32)": dict(act=[list(range(4)) for _ in range(8)]),
    "wings: 4x5 core, wings light on edge win": dict(act=[[]] + [list(range(5))]*4 + [[]], wings=True),
    "dark edge columns, 4x5 lit (20)": dict(act=[[]] + [list(range(5))]*4 + [[]]),
}


def neighbours(c, r, hexg):
    out = [(c, r - 1), (c, r + 1), (c - 1, r), (c + 1, r)]
    if hexg:
        out = [(c, r - 1), (c, r + 1)]
        if c % 2 == 0:
            out += [(c - 1, r - 1), (c - 1, r), (c + 1, r - 1), (c + 1, r)]
        else:
            out += [(c - 1, r), (c - 1, r + 1), (c + 1, r), (c + 1, r + 1)]
    return out


def sim(args):
    name, strip, n, seed = args
    spec = SHAPES[name]
    act0 = spec["act"]
    hexg = spec.get("hex", False)
    rng = random.Random(seed)
    cols = len(act0)
    S = STR[strip]
    pos_all = None
    hits = 0
    tot = 0.0
    s4 = 0
    ssum = 0
    chain = 0
    for _ in range(n):
        act = [list(a) for a in act0]
        tubes = {}
        if spec.get("tubes"):
            cells = [(c, r) for c in range(cols) for r in act[c]]
            for _t in range(spec["tubes"]):
                a, b = rng.sample(cells, 2)
                while abs(a[0] - b[0]) + abs(a[1] - b[1]) < 3:
                    a, b = rng.sample(cells, 2)
                tubes.setdefault(a, []).append(b)
                tubes.setdefault(b, []).append(a)
        pos = [rng.randrange(len(S[c % len(S)])) for c in range(cols)]
        strips = [S[c % len(S)] for c in range(cols)]
        col = [[strips[c][(pos[c] + i) % len(strips[c])] for i in range(len(act[c]))] for c in range(cols)]
        scat = sum(x == 'S' for cc in col for x in cc)
        s4 += scat >= 4
        ssum += scat
        first = True
        spin_win = 0.0
        while True:
            grid = {}
            for c in range(cols):
                for i, r in enumerate(act[c]):
                    grid[(c, r)] = (c, i)
            win = 0.0
            dead = set()
            for sym in PAY:
                seen = set()
                for (c, r), (cc, i) in grid.items():
                    if col[cc][i] != sym or (c, r) in seen:
                        continue
                    comp = {(c, r)}
                    st = [(c, r)]
                    seen.add((c, r))
                    while st:
                        x, y = st.pop()
                        nb = neighbours(x, y, hexg) + tubes.get((x, y), [])
                        for u, v in nb:
                            if (u, v) in grid and (u, v) not in comp:
                                ci, ii = grid[(u, v)]
                                if col[ci][ii] == sym or col[ci][ii] == 'W':
                                    comp.add((u, v))
                                    st.append((u, v))
                                    if col[ci][ii] == sym:
                                        seen.add((u, v))
                    if len(comp) >= 5:
                        win += PAY[sym][tier(len(comp))]
                        dead |= comp
            if win == 0:
                break
            if first:
                hits += 1
                first = False
            spin_win += win
            chain += 1
            if spec.get("wings"):
                for wc, nc in ((0, 1), (5, 4)):
                    if not act[wc] and any((nc, r) in dead for r in act[nc]):
                        act[wc] = list(range(5))
                        pos[wc] = rng.randrange(len(strips[wc]))
                        col[wc] = [strips[wc][(pos[wc] + i) % len(strips[wc])] for i in range(5)]
            for c in range(cols):
                gone = sum(1 for r in act[c] if (c, r) in dead)
                if not gone:
                    continue
                keep = [col[c][i] for i, r in enumerate(act[c]) if (c, r) not in dead]
                new = []
                for _k in range(gone):
                    pos[c] = (pos[c] - 1) % len(strips[c])
                    new.insert(0, strips[c][pos[c]])
                col[c] = new + keep
        tot += spin_win
    return hits, tot, s4, ssum, chain


if __name__ == "__main__":
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 40000
    strip = sys.argv[2] if len(sys.argv) > 2 else "BR0"
    jobs = []
    names = [n for n in SHAPES if (len(sys.argv) < 4 or any(k in n for k in sys.argv[3].split('|')))]
    with Pool(4) as p:
        for nm in names:
            res = p.map(sim, [(nm, strip, N // 4, 1000 + k) for k in range(4)])
            h = sum(r[0] for r in res); t = sum(r[1] for r in res); s4 = sum(r[2] for r in res)
            ss = sum(r[3] for r in res); ch = sum(r[4] for r in res)
            ncell = nm.split("(")[-1].rstrip(")")
            print(f"{strip} | {nm:34s} | hit {100*h/N:5.1f}% | mean {t/N:6.3f}x | S>=4 {100*s4/N:5.2f}% | meanS {ss/N:4.2f} | steps/spin {ch/N:4.2f}", flush=True)
