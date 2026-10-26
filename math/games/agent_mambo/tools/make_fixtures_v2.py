"""Front-end fixtures of the v2 library (WP9) into library/fixtures_out/ (the content team copies them into frontend_mambo/fixtures;
this tool never writes there).

  math/env/bin/python math/games/agent_mambo/tools/make_fixtures_v2.py [--procs 3] [--out library/fixtures_out] [--modes base,bonus,...]

For every mode and category: sample books as books_<mode>_sample.json (payoutMultiplier in x of the bet, a list of {id, payoutMultiplier,
events}) and books_<mode>_sample.jsonl (payoutMultiplier as the integer x100 of the SDK books, one book per line), exactly like
frontend_mambo/fixtures. Plus index.json, lookUpTable_<mode>_0.csv, shares.json and PICKS.md (ids per category, what each category shows).
Categories base: loss, subStake (0 < R <= 1x), win1to5, win5x, win15x, win100x, wincap, trigger, retrigger, layout_<id> (+ _tumble), mission_<id>,
banked, caseOpen, lightRoute, lit, wire blast / fizzle, dialCap. Doors: below100x, win100to300, win300plus, wincap, retrigger, dialCap,
mission specifics (banked, caseOpen, caseOpenCapped, wincapNoCaseOpen, lightRoute, lit), wire blast.
Book selection is deterministic (seed 11). Books are the final published books (after recompression), unchanged.
"""
import argparse
import io
import json
import multiprocessing as mp
import os
import random
import shutil
import sys

import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
LIB = os.path.join(GAME, "library")
PUB = os.path.join(LIB, "publish_files")
sys.path.insert(0, HERE)
CAP = 500000

# how many books per category (mode -> category -> count)
BASE_COUNTS = {
    "loss": 40, "subStake": 30, "win1to5": 30, "win5x": 25, "win15x": 15, "win100x": 8, "wincap": 3, "trigger": 25, "retrigger": 4,
    "layout_mezzanine": 12, "layout_atrium": 12, "layout_lobby": 12, "layout_annex": 12,
    "layout_mezzanine_tumble": 6, "layout_atrium_tumble": 8, "layout_lobby_tumble": 8, "layout_annex_tumble": 8,
    "mission_briefing": 8, "mission_orders": 8, "mission_blackout": 8, "banked": 8, "caseOpen": 8, "lightRoute": 8, "lit": 8,
    "wireBlastBase": 20, "wireFizzleBase": 10, "dialCap": 2,
}
DOOR_COUNTS = {
    "below100x": 25, "win100to300": 40, "win300plus": 30, "wincap": 3, "retrigger": 20, "dialCap": 8, "wireBlastFree": 20,
}
DOOR_EXTRA = {
    "bonus": {"mission_briefing": 6},
    "entrance_orders": {"mission_orders": 8, "banked": 10, "caseOpen": 15, "caseOpenCapped": 4, "wincapNoCaseOpen": 2},
    "entrance_blackout": {"mission_blackout": 8, "lightRoute": 10, "lit": 15},
}
DESC = {
    "loss": "no win (payout 0)", "subStake": "win that does not exceed the stake (0 < R <= 1x): quiet ledger tick, no celebration",
    "win1to5": "1x < R < 5x", "win5x": "5x <= R < 15x", "win15x": "15x <= R < 100x", "win100x": "100x <= R < 5000x",
    "wincap": "5000x cap reached (wincap event)", "trigger": "free spins triggered", "retrigger": "free-spin retrigger",
    "layout_mezzanine": "floor plan Mezzanine (30 cells, the home 6x5 plan; a base book of a multi-plan mode carries the layout event)", "layout_atrium": "floor plan Atrium (26 cells)",
    "layout_lobby": "floor plan Lobby (24 cells)", "layout_annex": "floor plan Annex (36 cells, 6 rows)",
    "layout_mezzanine_tumble": "Mezzanine with a winInfo + tumbleBoard (compact-padded positions)", "layout_atrium_tumble": "Atrium with winInfo + tumbleBoard (geo mapping)",
    "layout_lobby_tumble": "Lobby with winInfo + tumbleBoard", "layout_annex_tumble": "Annex with winInfo + tumbleBoard",
    "mission_briefing": "missionAssigned briefing (winInfo meta: globalMult, clusterMult, winWithoutMult)",
    "mission_orders": "missionAssigned orders (payTiming spinEnd; winInfo meta.banked)", "mission_blackout": "missionAssigned blackout (lens, lightRoute; winInfo meta.lit / lensMult)",
    "banked": "winInfo with meta.banked=true (Sealed Orders: never added to WIN)", "caseOpen": "caseOpen event (bank x dial, then setWin)",
    "caseOpenCapped": "caseOpen.capped=true followed by wincap", "wincapNoCaseOpen": "wincap reached by the banked amounts at x1: no caseOpen",
    "lightRoute": "lightRoute event (Ballroom Blackout window route, geometric rows)", "lit": "winInfo with meta.lit=true (cluster touches the window, x4)",
    "wireBlastBase": "wire blast in a base spin (fuseBlast, tumbleBoard refill, re-evaluation)", "wireFizzleBase": "wire burnt >= 2 cells in a base spin and fizzled",
    "wireBlastFree": "wire blast in a free spin", "dialCap": "dial reached the x100 cap",
    "below100x": "result under the 100x price (30x floor)", "win100to300": "100x < R < 300x", "win300plus": "R >= 300x (below the cap)",
}


def facts(b):
    """Category names of one book."""
    ev = b["events"]
    m = b["payoutMultiplier"]
    types = {}
    layout = None
    mission = None
    gt = "basegame"
    blast = {"basegame": False, "freegame": False}
    fizzle2 = {"basegame": False, "freegame": False}
    max_dial = 1
    banked = lit = capped_case = False
    for e in ev:
        t = e["type"]
        types[t] = types.get(t, 0) + 1
        if t == "reveal":
            gt = e["gameType"]
        elif t == "layout":
            layout = e["id"]
        elif t == "missionAssigned":
            mission = e["mission"]
        elif t == "fuseBlast":
            blast[gt] = True
        elif t == "fuseFizzle" and e["burned"] >= 2:
            fizzle2[gt] = True
        elif t == "updateGlobalMult":
            max_dial = max(max_dial, e["globalMult"])
        elif t == "caseOpen" and e["capped"]:
            capped_case = True
        elif t == "winInfo":
            for w in e["wins"]:
                mm = w.get("meta", {})
                banked = banked or bool(mm.get("banked"))
                lit = lit or bool(mm.get("lit"))
    return {"n": len(ev), "x100": m, "types": types, "layout": layout or "mezzanine", "mission": mission, "blast": blast, "fizzle2": fizzle2,
            "dial": max_dial, "banked": banked, "lit": lit, "capCase": capped_case, "hasLayoutEvent": layout is not None}


def categorize(mode, b):
    f = facts(b)
    x = f["x100"] / 100.0
    t = f["types"]
    cats = []
    if mode == "base":
        if x == 0:
            cats.append("loss")
        elif x <= 1.0:
            cats.append("subStake")
        elif x < 5:
            cats.append("win1to5")
        elif x < 15:
            cats.append("win5x")
        elif x < 100:
            cats.append("win15x")
        elif f["x100"] < CAP:
            cats.append("win100x")
        if "freeSpinTrigger" in t:
            cats.append("trigger")
        if "freeSpinRetrigger" in t:
            cats.append("retrigger")
        cats.append("layout_" + f["layout"])
        if "tumbleBoard" in t and "freeSpinTrigger" not in t:
            cats.append("layout_" + f["layout"] + "_tumble")
        if f["mission"]:
            cats.append("mission_" + f["mission"])
        if f["blast"]["basegame"]:
            cats.append("wireBlastBase")
        if f["fizzle2"]["basegame"]:
            cats.append("wireFizzleBase")
    else:
        if x < 100:
            cats.append("below100x")
        elif x < 300:
            cats.append("win100to300")
        elif f["x100"] < CAP:
            cats.append("win300plus")
        if "freeSpinRetrigger" in t:
            cats.append("retrigger")
        if f["blast"]["freegame"]:
            cats.append("wireBlastFree")
        mission = f["mission"] or ("briefing" if mode == "bonus" else None)
        if mission:
            cats.append("mission_" + mission)
    if f["x100"] >= CAP or "wincap" in t:
        cats.append("wincap")
        if "caseOpen" not in t and mode == "entrance_orders":
            cats.append("wincapNoCaseOpen")
    if f["banked"]:
        cats.append("banked")
    if "caseOpen" in t:
        cats.append("caseOpen")
    if f["capCase"]:
        cats.append("caseOpenCapped")
    if "lightRoute" in t:
        cats.append("lightRoute")
    if f["lit"]:
        cats.append("lit")
    if f["dial"] >= 100:
        cats.append("dialCap")
    return f["n"], cats


def work(lines):
    out = []
    for ln, (idx, line) in enumerate(lines):
        b = json.loads(line)
        out.append((b["id"], *categorize(MODE, b)))
    return out


MODE = None


def line_chunks(path, size=600):
    buf = []
    with open(path, "rb") as fh:
        rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
        for i, line in enumerate(rd):
            if not line.strip():
                continue
            buf.append((i, line))
            if len(buf) >= size:
                yield buf
                buf = []
    if buf:
        yield buf


def pick_ids(mode, rows, counts, rng):
    """rows: (id, n_events, cats). Short books first for the ordinary categories (<= 450 events in base, <= 1500 in doors)."""
    limit = 450 if mode == "base" else 1500
    pools = {c: [] for c in counts}
    seen = {c: 0 for c in counts}
    for bid, n, cats in rows:
        for c in cats:
            if c in pools:
                seen[c] += 1
                pools[c].append((bid, n))
    picks = {}
    special = {"wincap", "retrigger", "wincapNoCaseOpen", "caseOpenCapped", "dialCap"}
    for c, k in counts.items():
        pool = pools[c]
        rng.shuffle(pool)
        if c not in special:
            short = [p for p in pool if p[1] <= limit]
            pool = short if len(short) >= k else sorted(pool, key=lambda p: p[1])
        else:
            pool = sorted(pool, key=lambda p: p[1])[: max(k * 4, 20)]  # the shortest ones, then a seeded shuffle
            rng.shuffle(pool)
        picks[c] = [bid for bid, _ in pool[:k]]
    return picks, seen


def main(argv=None):
    global MODE
    ap = argparse.ArgumentParser()
    ap.add_argument("--procs", type=int, default=3)
    ap.add_argument("--out", default=os.path.join(LIB, "fixtures_out"))
    ap.add_argument("--modes", default="base,bonus,entrance_orders,entrance_blackout")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    rng = random.Random(11)
    allpicks, allseen = {}, {}
    for mode in a.modes.split(","):
        MODE = mode
        path = os.path.join(PUB, f"books_{mode}.jsonl.zst")
        counts = dict(BASE_COUNTS if mode == "base" else DOOR_COUNTS)
        counts.update(DOOR_EXTRA.get(mode, {}))
        rows = []
        with mp.get_context("fork").Pool(max(1, min(a.procs, 3))) as pool:
            for part in pool.imap(work, line_chunks(path)):
                rows.extend(part)
        picks, seen = pick_ids(mode, rows, counts, rng)
        wanted = {bid for ids in picks.values() for bid in ids}
        chosen = {}
        with open(path, "rb") as fh:
            rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
            for line in rd:
                if not line.strip():
                    continue
                # ids are the line numbers; parse only the wanted lines (cheap prefix test on the id field)
                b = json.loads(line) if _wanted(line, wanted) else None
                if b is not None and b["id"] in wanted:
                    chosen[b["id"]] = b
                    if len(chosen) == len(wanted):
                        break
        lst = [chosen[i] for i in sorted(chosen)]
        with open(os.path.join(a.out, f"books_{mode}_sample.json"), "w") as f:
            json.dump([{"id": b["id"], "payoutMultiplier": b["payoutMultiplier"] / 100, "events": b["events"]} for b in lst], f, separators=(",", ":"))
        with open(os.path.join(a.out, f"books_{mode}_sample.jsonl"), "w") as f:
            for b in lst:
                f.write(json.dumps({"id": b["id"], "payoutMultiplier": int(b["payoutMultiplier"]), "events": b["events"]}, separators=(",", ":")) + "\n")
        shutil.copy(os.path.join(PUB, f"lookUpTable_{mode}_0.csv"), os.path.join(a.out, f"lookUpTable_{mode}_0.csv"))
        allpicks[mode] = picks
        allseen[mode] = seen
        print(mode, len(lst), "books;", {c: f"{len(v)}/{seen[c]}" for c, v in picks.items()}, flush=True)
    shutil.copy(os.path.join(PUB, "index.json"), os.path.join(a.out, "index.json"))
    sh = os.path.join(LIB, "shares.json")
    if os.path.exists(sh):
        shutil.copy(sh, os.path.join(a.out, "shares.json"))
    with open(os.path.join(a.out, "PICKS.md"), "w") as f:
        f.write("# Book ids per category (books_<mode>_sample.json: payoutMultiplier in x of the bet; .jsonl: integer x100 like the SDK books)\n\n")
        f.write("Generated by math/games/agent_mambo/tools/make_fixtures_v2.py from the final published books (after recompression). Each list shows the ids\n"
                "picked for the category and, in brackets, how many books of the mode belong to it. A book can belong to several categories.\n"
                "`bonus` books are the v1 books (no `missionAssigned`, no `layout`): they play as The Briefing, step 8, Mezzanine.\n\n")
        for mode, d in allpicks.items():
            f.write(f"## {mode}\n")
            for c, ids in d.items():
                f.write(f"- **{c}** [{allseen[mode][c]} in the mode] ({DESC.get(c, '')}): {', '.join(map(str, ids[:40]))}\n")
            f.write("\n")
    print("wrote", a.out)


def _wanted(line, wanted):
    """The id of a book line is the first field: {"id": 123, ...}."""
    i = line.find('"id":')
    if i < 0 or i > 20:
        return True
    j = i + 5
    while line[j] == " ":
        j += 1
    k = j
    while line[k].isdigit():
        k += 1
    return int(line[j:k]) in wanted


if __name__ == "__main__":
    main()
