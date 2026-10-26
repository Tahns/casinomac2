"""Pay-rule proxy simulator for Agent Mambo (research only, NOT the SDK, never edits math/).
Written for docs/research2/gap_02_Q2.md.  Reproduce: see the "Reproduce" block at the end of that file.
Question Q2 (docs/research2/gap_02_Q2.md): what does it cost to replace the cluster pay rule by a fallback rule?

Engine = same as docs/research2/02_gridsim.py: REAL strips BR0/FR0 (read from math/games/agent_mambo/reels),
SDK-style stops (consecutive window), SDK-style tumble (refill from the strip going upward), wild W joins any payer
(rule dependent), scatter S inert and never removed.  Added here: the real Mission Meter (free spins: start 1, +8 per
winning step, cap 100, persists over the round, retrigger on >=3 scatters with the real table) and the real bomb-timer
wire (len 8 self-avoiding path from reel 0, 1 cell burnt at reveal, +1 per winning step, blast on a dead board when
>=3 cells burnt: burnt non-scatter cells vanish, refill, board evaluated again, once per spin).
Because the meter and the wire do not change the board dynamics, every spin is stored as a list of RAW step pays and
the meter / paytable scale k are applied afterwards (linear), see analyse_q2.py.

usage:
  python3 rules_sim.py main  NBASE NBONUS OUT.pkl      # 6x5 with wire + meter, all rules
  python3 rules_sim.py layout NSPINS OUT.pkl           # layout deltas, no wire, no meter (like 02)
"""
import csv, os, sys, pickle, random, time
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("MAMBO_REELS") or os.path.join(HERE, "..", "..", "math", "games", "agent_mambo", "reels")  # MAMBO_REELS = override dir
ROOT = ROOT + os.sep
STR = {k: [list(c) for c in zip(*list(csv.reader(open(ROOT + k + ".csv"))))] for k in ("BR0", "FR0")}
for k in STR:
    STR[k] = STR[k][:6] + [STR[k][0], STR[k][1]]  # reels 7,8 reuse strips 0,1 (only used by 8-column layouts)
PAY = {'H1': (5.0, 12.5, 25.0, 60.0), 'H2': (2.0, 5.0, 10.0, 40.0), 'H3': (1.3, 3.2, 7.0, 30.0),
       'H4': (1.0, 2.5, 6.0, 20.0), 'L1': (0.6, 1.5, 4.0, 10.0), 'L2': (0.4, 1.2, 3.5, 8.0),
       'L3': (0.2, 0.8, 2.5, 5.0), 'L4': (0.1, 0.5, 1.5, 4.0)}
PAYERS = tuple(PAY)
FS_START = {10: 0.88, 12: 0.10, 15: 0.0178, 18: 0.00161, 20: 0.00059}   # weighted buy shares (MATH_REPORT.md)
RETRIG = {3: 5, 4: 8, 5: 10, 6: 12, 7: 15, 8: 18}


def tier_cluster(n):
    return 0 if n <= 5 else 1 if n <= 8 else 2 if n <= 12 else 3


def tier_path(n):
    return 0 if n <= 5 else 1 if n <= 7 else 2 if n <= 9 else 3


# ------------------------------------------------------------------ geometry
def orient(cells):
    """all unique rotations / reflections of a cell list, normalised to min corner 0,0"""
    out = set()
    pts = list(cells)
    for _ in range(4):
        pts = [(-y, x) for x, y in pts]
        for refl in (False, True):
            q = [(-x, y) for x, y in pts] if refl else pts
            mx = min(x for x, y in q); my = min(y for x, y in q)
            out.add(tuple(sorted((x - mx, y - my) for x, y in q)))
    return sorted(out)


SHAPES4 = {  # name -> base cells (dc, dr)
    "I4": [(0, 0), (1, 0), (2, 0), (3, 0)],
    "L4": [(0, 0), (0, 1), (0, 2), (1, 2)],
    "T4": [(0, 0), (1, 0), (2, 0), (1, 1)],
    "PL": [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)],
}
SHAPES5 = {
    "I5": [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)],
    "V5": [(0, 0), (0, 1), (0, 2), (1, 2), (2, 2)],
    "T5": [(0, 0), (1, 0), (2, 0), (1, 1), (1, 2)],
    "PL": [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)],
}


def neighbours(c, r, hexg):
    if not hexg:
        return [(c, r - 1), (c, r + 1), (c - 1, r), (c + 1, r)]
    out = [(c, r - 1), (c, r + 1)]
    if c % 2 == 0:
        out += [(c - 1, r - 1), (c - 1, r), (c + 1, r - 1), (c + 1, r)]
    else:
        out += [(c - 1, r), (c - 1, r + 1), (c + 1, r), (c + 1, r + 1)]
    return out


class Geo:
    def __init__(self, act, hexg=False, tubes=0, shapes=None):
        self.act = act
        self.ncol = len(act)
        self.hexg = hexg
        self.tubes = tubes
        self.cells = [(c, r) for c in range(self.ncol) for r in act[c]]
        self.idx = {cell: i for i, cell in enumerate(self.cells)}
        self.n = len(self.cells)
        self.colidx = [[self.idx[(c, r)] for r in act[c]] for c in range(self.ncol)]
        self.colof = [c for c, r in self.cells]
        self.nb = [[self.idx[x] for x in neighbours(c, r, hexg) if x in self.idx] for c, r in self.cells]
        self.shapes = {}
        if shapes and not hexg:
            for name, base in shapes.items():
                pl = []
                for o in orient(base):
                    for (c, r) in self.cells:
                        cs = [(c + dx, r + dy) for dx, dy in o]
                        if all(x in self.idx for x in cs):
                            pl.append(tuple(self.idx[x] for x in cs))
                self.shapes[name] = pl


def full(rows=5, cols=6):
    return [list(range(rows)) for _ in range(cols)]


def holes(rows, cols, hs):
    return [[r for r in range(rows) if (c, r) not in hs] for c in range(cols)]


# ------------------------------------------------------------------ rules
def ev_cluster(sym, g, tubes, flat=False):
    """cluster pays (flat=True: size is only a gate, award = tier-1 value of the symbol)"""
    pay = 0.0
    dead = set()
    nb = g.nb
    for s in PAYERS:
        seen = set()
        for i0 in range(g.n):
            if sym[i0] != s or i0 in seen:
                continue
            comp = {i0}
            st = [i0]
            seen.add(i0)
            while st:
                x = st.pop()
                nbs = nb[x]
                if tubes and x in tubes:
                    nbs = nbs + tubes[x]
                for u in nbs:
                    if u not in comp:
                        su = sym[u]
                        if su == s or su == 'W':
                            comp.add(u)
                            st.append(u)
                            if su == s:
                                seen.add(u)
            n = len(comp)
            if n >= 5:
                pay += PAY[s][0] if flat else PAY[s][tier_cluster(n)]
                dead |= comp
    return pay, dead


def ev_flat(sym, g, tubes, P):
    return ev_cluster(sym, g, tubes, flat=True)


def ev_shapes(sym, g, tubes, P):
    """pay by fixed shape: P['f'] = {shape: factor}; award = PAY[sym][0] * factor; greedy non-overlap per symbol"""
    cand = {}
    f = P["f"]
    for name, pls in g.shapes.items():
        fac = f[name]
        for cells in pls:
            s = None
            ok = True
            for i in cells:
                v = sym[i]
                if v == 'W':
                    continue
                if s is None:
                    s = v
                elif s != v:
                    ok = False
                    break
            if ok and s is not None and s in PAY:
                cand.setdefault(s, []).append((fac * PAY[s][0], cells, name))
    pay = 0.0
    dead = set()
    for s, lst in cand.items():
        lst.sort(key=lambda t: -t[0])
        used = set()
        for p, cells, name in lst:
            if used.isdisjoint(cells):
                used.update(cells)
                pay += p
                acc = P.get("acc")
                if acc is not None:
                    a = acc.setdefault(name, [0, 0.0])
                    a[0] += 1
                    a[1] += PAY[s][0]
        dead |= used
    return pay, dead


def _longest(starts, avail, nb, cap, budget=40000):
    best = []
    cnt = [0]

    def dfs(path, vis):
        cnt[0] += 1
        if len(path) > len(best):
            best[:] = path
        if len(path) >= cap or cnt[0] > budget:
            return
        for u in nb[path[-1]]:
            if u in avail and u not in vis:
                vis.add(u)
                path.append(u)
                dfs(path, vis)
                path.pop()
                vis.discard(u)
                if len(best) >= cap or cnt[0] > budget:
                    return

    for st in starts:
        dfs([st], {st})
        if len(best) >= cap or cnt[0] > budget:
            break
    return list(best)


def ev_path(sym, g, tubes, P):
    """pay along one connected self-avoiding path of same symbol (+wild); award by run length.
    anchored=True: the path must start on reel 0 (wire run from the left edge).  Greedy: longest path first."""
    anchored = P["anchored"]
    minlen = P.get("minlen", 5)
    pay = 0.0
    dead = set()
    nb = g.nb
    if tubes:
        nb = [nb[i] + tubes.get(i, []) for i in range(g.n)]
    for s in PAYERS:
        avail = {i for i in range(g.n) if sym[i] == s or sym[i] == 'W'}
        if len(avail) < minlen or all(sym[i] == 'W' for i in avail):
            continue
        # quick filter: need a component of >= minlen cells
        while True:
            comps = []
            left = set(avail)
            while left:
                a = left.pop()
                comp = {a}
                st = [a]
                while st:
                    x = st.pop()
                    for u in nb[x]:
                        if u in left:
                            left.discard(u)
                            comp.add(u)
                            st.append(u)
                if len(comp) >= minlen and any(sym[i] == s for i in comp):
                    comps.append(comp)
            if not comps:
                break
            best = []
            for comp in comps:
                starts = [i for i in comp if (not anchored or g.colof[i] == 0)]
                if not starts:
                    continue
                p = _longest(starts, comp, nb, 12)
                if len(p) > len(best) and any(sym[i] == s for i in p):
                    best = p
            if len(best) < minlen:
                break
            pay += PAY[s][tier_path(len(best))]
            dead.update(best)
            avail.difference_update(best)
    return pay, dead


def ev_scatter(sym, g, tubes, P):
    """SDK Scatter.get_scatterpay_wins: count of symbol + ALL wilds >= minN pays anywhere; all of them vanish"""
    minN = P["minN"]
    nw = [i for i in range(g.n) if sym[i] == 'W']
    cnt = {}
    for i in range(g.n):
        v = sym[i]
        if v in PAY:
            cnt.setdefault(v, []).append(i)
    pay = 0.0
    dead = set()
    for s, lst in cnt.items():
        n = len(lst) + len(nw)
        if n >= minN:
            d = n - minN
            t = 0 if d <= 1 else 1 if d <= 3 else 2 if d <= 7 else 3
            pay += PAY[s][t]
            dead.update(lst)
            dead.update(nw)
    return pay, dead


def ev_scatter_ps(sym, g, tubes, P):
    """pay-anywhere with a PER-SYMBOL minimum count (SDK paytable keys are (count, symbol), so this is supported)"""
    mins = P["mins"]
    nw = [i for i in range(g.n) if sym[i] == 'W']
    cnt = {}
    for i in range(g.n):
        v = sym[i]
        if v in PAY:
            cnt.setdefault(v, []).append(i)
    pay = 0.0
    dead = set()
    for s, lst in cnt.items():
        n = len(lst) + len(nw)
        if n >= mins[s]:
            d = n - mins[s]
            t = 0 if d <= 1 else 1 if d <= 3 else 2 if d <= 7 else 3
            pay += PAY[s][t]
            dead.update(lst)
            dead.update(nw)
    return pay, dead


def ps_mins(tail=0.03, cells=30):
    """smallest count n per symbol with P(Binomial(cells, p_sym + p_wild) >= n) <= tail on BR0"""
    from math import comb
    allv = [x for col in STR["BR0"][:6] for x in col]
    pw = allv.count('W') / len(allv)
    out = {}
    for sname in PAYERS:
        p = allv.count(sname) / len(allv) + pw
        for n in range(1, cells + 1):
            t = sum(comb(cells, k) * p ** k * (1 - p) ** (cells - k) for k in range(n, cells + 1))
            if t <= tail:
                out[sname] = n
                break
    return out


def ev_ways(sym, g, tubes, P):
    """SDK Ways.get_ways_data (left to right from reel 0, the symbol itself must be on reel 0; wilds add ways);
    pay = unit(sym) * f(kind) * ways; positions of reels 0..kind-1 (symbol + wilds) vanish"""
    kmin = P["kmin"]
    fk = P["fk"]
    cols = g.colidx
    nc = g.ncol
    wild = [[i for i in col if sym[i] == 'W'] for col in cols]
    first = {sym[i] for i in cols[0] if sym[i] in PAY}
    pay = 0.0
    dead = set()
    for s in first:
        ways = 1
        kind = 0
        pos = []
        for c in range(nc):
            m = [i for i in cols[c] if sym[i] == s]
            k = len(m) + len(wild[c])
            if k == 0:
                break
            kind += 1
            ways *= k
            pos += m + wild[c]
        if kind >= kmin:
            pay += PAY[s][0] * fk[min(kind, 6)] * ways
            dead.update(pos)
    return pay, dead


PS_MINS = ps_mins(0.03)
RULES = {
    # name: (evaluator, shapes-dict for geometry, params)
    "cluster": (lambda sym, g, t, P: ev_cluster(sym, g, t), None, {}),
    "c_flat": (ev_flat, None, {}),
    "path_any": (ev_path, None, {"anchored": False}),
    "path_wire": (ev_path, None, {"anchored": True}),
    "path_wire4": (ev_path, None, {"anchored": True, "minlen": 4}),
    "path_wire3": (ev_path, None, {"anchored": True, "minlen": 3}),
    "scatter7": (ev_scatter, None, {"minN": 7}),
    "scatter8": (ev_scatter, None, {"minN": 8}),
    "scatter9": (ev_scatter, None, {"minN": 9}),
    "scatter10": (ev_scatter, None, {"minN": 10}),
    "scatter11": (ev_scatter, None, {"minN": 11}),
    "scatter_ps": (ev_scatter_ps, None, {"mins": PS_MINS}),
    "scatter_ps5": (ev_scatter_ps, None, {"mins": ps_mins(0.05)}),
    "scatter_ps8": (ev_scatter_ps, None, {"mins": ps_mins(0.08)}),
    "ways3": (ev_ways, None, {"kmin": 3, "fk": {3: 1, 4: 3, 5: 9, 6: 27}}),
    "ways4": (ev_ways, None, {"kmin": 4, "fk": {4: 1, 5: 3, 6: 9}}),
    "ways5": (ev_ways, None, {"kmin": 5, "fk": {5: 1, 6: 3}}),
    "ways6": (ev_ways, None, {"kmin": 6, "fk": {6: 1}}),
    "shape_steep": (ev_shapes, SHAPES4, {"f": {"L4": 1.0, "T4": 2.0, "I4": 4.0, "PL": 10.0}}),
    "shape_bal": (ev_shapes, SHAPES4, {"f": {"L4": 1.0, "T4": 3.0, "I4": 3.0, "PL": 20.0}}),
    "shape_noL": (ev_shapes, {k: v for k, v in SHAPES4.items() if k != "L4"}, {"f": {"T4": 1.0, "I4": 2.0, "PL": 6.0}}),
    "shape5": (ev_shapes, SHAPES5, {"f": {"I5": 1.0, "V5": 1.5, "T5": 2.0, "PL": 3.0}}),
}


def set_shape_factors(name, f):
    RULES[name][2]["f"].update(f)


# ------------------------------------------------------------------ engine
def make_path(rng, g, plen=8):
    """SDK make_fuse_path on a rectangular grid: from a random reel-0 row, right w2, up w1, down w1, self-avoiding"""
    rows = [len(a) for a in g.act]
    while True:
        path = [(0, rng.randrange(rows[0]))]
        while len(path) < plen:
            c, r = path[-1]
            opts, wts = [], []
            for dc, dr, w in ((1, 0, 2), (0, -1, 1), (0, 1, 1)):
                nc_, nr = c + dc, r + dr
                if nc_ < g.ncol and 0 <= nr < rows[nc_] and (nc_, nr) not in path:
                    opts.append((nc_, nr))
                    wts.append(w)
            if not opts:
                break
            path.append(rng.choices(opts, weights=wts)[0])
        if len(path) == plen:
            return [g.idx[x] for x in path]


def tumble(sym, pos, strips, g, dead):
    for c in range(g.ncol):
        ci = g.colidx[c]
        gone = 0
        for i in ci:
            if i in dead:
                gone += 1
        if not gone:
            continue
        keep = [sym[i] for i in ci if i not in dead]
        st = strips[c]
        new = []
        p = pos[c]
        for _ in range(gone):
            p = (p - 1) % len(st)
            new.insert(0, st[p])
        pos[c] = p
        vals = new + keep
        for j, i in enumerate(ci):
            sym[i] = vals[j]


def play_spin(g, ev, P, strip, rng, wire):
    """one spin (base or free): returns (steps, scat, blast, blast_paid, hit) ; steps = list of raw step pays"""
    S = STR[strip]
    strips = [S[c % len(S)] for c in range(g.ncol)]
    pos = [rng.randrange(len(strips[c])) for c in range(g.ncol)]
    sym = [None] * g.n
    for c in range(g.ncol):
        for j, i in enumerate(g.colidx[c]):
            sym[i] = strips[c][(pos[c] + j) % len(strips[c])]
    tubes = None
    if g.tubes:
        tubes = {}
        for _ in range(g.tubes):
            a, b = rng.sample(range(g.n), 2)
            while abs(g.cells[a][0] - g.cells[b][0]) + abs(g.cells[a][1] - g.cells[b][1]) < 3:
                a, b = rng.sample(range(g.n), 2)
            tubes.setdefault(a, []).append(b)
            tubes.setdefault(b, []).append(a)
    path = make_path(rng, g) if wire else None
    burn = 1
    spent = not wire
    steps = []
    blast = False
    blast_paid = False
    after_blast = False
    while True:
        pay, dead = ev(sym, g, tubes, P)
        if pay > 0:
            steps.append(pay)
            if after_blast:
                blast_paid = True
                after_blast = False
            tumble(sym, pos, strips, g, dead)
            if not spent:
                burn = min(burn + 1, 8)
            continue
        after_blast = False
        if not spent:
            spent = True
            if burn >= 3:
                removed = {path[j] for j in range(burn) if sym[path[j]] != 'S'}
                if removed:
                    blast = True
                    after_blast = True
                    tumble(sym, pos, strips, g, removed)
                    continue
        break
    scat = sum(1 for v in sym if v == 'S')
    return steps, scat, blast, blast_paid


def run_base(args):
    rule, n, seed, wire = args
    ev0, shp, P = RULES[rule]
    ev = lambda sym, g, t, P_=P, ev0=ev0: ev0(sym, g, t, P_)
    g = Geo(full(), shapes=shp)
    rng = random.Random(seed)
    out = []
    for _ in range(n):
        steps, scat, blast, bp = play_spin(g, ev, P, "BR0", rng, wire)
        out.append((sum(steps), len(steps), scat, blast, bp))
    return out


def run_bonus(args):
    rule, nrounds, seed = args[:3]
    fixed = args[3] if len(args) > 3 else None
    ev0, shp, P = RULES[rule]
    ev = lambda sym, g, t, P_=P, ev0=ev0: ev0(sym, g, t, P_)
    g = Geo(full(), shapes=shp)
    rng = random.Random(seed)
    starts = list(FS_START)
    wts = [FS_START[s] for s in starts]
    rounds = []
    for _ in range(nrounds):
        tot = fixed or rng.choices(starts, weights=wts)[0]
        fs = 0
        allsteps = []
        spins_win = 0
        blasts = 0
        bpaid = 0
        per_spin_steps = []
        while fs < tot:
            fs += 1
            steps, scat, blast, bp = play_spin(g, ev, P, "FR0", rng, True)
            allsteps.extend(steps)
            per_spin_steps.append(len(steps))
            spins_win += bool(steps)
            blasts += blast
            bpaid += bp
            if scat >= 3 and fs <= 400:
                tot += RETRIG[min(scat, 8)]
        rounds.append((allsteps, fs, spins_win, blasts, bpaid))
    return rounds


def run_layout(args):
    rule, lname, spec, n, seed = args
    ev0, shp, P = RULES[rule]
    ev = lambda sym, g, t, P_=P, ev0=ev0: ev0(sym, g, t, P_)
    g = Geo(spec["act"], hexg=spec.get("hex", False), tubes=spec.get("tubes", 0), shapes=shp)
    rng = random.Random(seed)
    hits = 0
    tot = 0.0
    nst = 0
    for _ in range(n):
        steps, scat, blast, bp = play_spin(g, ev, P, "BR0", rng, False)
        hits += bool(steps)
        tot += sum(steps)
        nst += len(steps)
    return rule, lname, hits, tot, nst, n


LAYOUTS = {
    "6x5 (30)": dict(act=full()),
    "6x4 (24)": dict(act=full(4)),
    "6x6 (36)": dict(act=full(6)),
    "6x7 (42)": dict(act=full(7)),
    "corners cut (26)": dict(act=holes(5, 6, {(0, 0), (5, 0), (0, 4), (5, 4)})),
    "pillars (26)": dict(act=holes(5, 6, {(1, 1), (1, 3), (4, 1), (4, 3)})),
    "4x8 tower (32)": dict(act=[list(range(8)) for _ in range(4)]),
    "8x4 wide (32)": dict(act=[list(range(4)) for _ in range(8)]),
    "2 tube pairs (30)": dict(act=full(), tubes=2),
    "hex adjacency (30)": dict(act=full(), hex=True),
}

if __name__ == "__main__":
    mode = sys.argv[1]
    rules = os.environ.get("RULES")
    rules = rules.split(",") if rules else list(RULES)
    if mode == "main":
        NB, NR, OUT = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
        if os.environ.get("FACTORS"):
            import json
            for k, v in json.loads(os.environ["FACTORS"]).items():
                set_shape_factors(k, v)
        res = {}
        with Pool(4) as p:
            for r in rules:
                t = time.time()
                b = sum(p.map(run_base, [(r, NB // 4, 1000 + k, True) for k in range(4)]), [])
                nb_ = NR // 4
                bo = sum(p.map(run_bonus, [(r, nb_, 5000 + k) for k in range(4)]), [])
                res[r] = dict(base=b, bonus=bo)
                print(r, "done in", round(time.time() - t), "s", flush=True)
                pickle.dump(res, open(OUT, "wb"))
    elif mode == "layout":
        N, OUT = int(sys.argv[2]), sys.argv[3]
        if os.environ.get("FACTORS"):
            import json
            for k, v in json.loads(os.environ["FACTORS"]).items():
                set_shape_factors(k, v)
        jobs = []
        for r in rules:
            for ln, spec in LAYOUTS.items():
                if os.environ.get("LAYOUTS") and ln not in os.environ["LAYOUTS"].split("|"):
                    continue
                if r.startswith("shape") and spec.get("hex"):
                    continue
                for k in range(4):
                    jobs.append((r, ln, spec, N // 4, 77 + k))
        agg = {}
        with Pool(4) as p:
            for rule, ln, h, t, st, n in p.imap_unordered(run_layout, jobs):
                a = agg.setdefault((rule, ln), [0, 0.0, 0, 0])
                a[0] += h; a[1] += t; a[2] += st; a[3] += n
        pickle.dump(agg, open(OUT, "wb"))
        print("layout done")
