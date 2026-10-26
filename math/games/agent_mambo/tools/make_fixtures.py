"""Build front-end fixtures from library/publish_files into frontend_mambo/fixtures. Run with the env python.
Writes index.json, lookUpTable CSVs, books_<mode>_sample.json (payoutMultiplier in x of bet) and .jsonl
(payoutMultiplier as integer x100 like the SDK books), PICKS.md. EVENTS.md is written by hand."""
import csv, io, json, os, random, shutil
import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "..", "library", "publish_files")
FIX = "/home/user/casinomac2/frontend_mambo/fixtures"
os.makedirs(FIX, exist_ok=True)
CAP = 100
KEEP = 300  # reservoir size per category


def books(mode):
    t = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(open(f"{PUB}/books_{mode}.jsonl.zst", "rb")))
    for line in t:
        yield json.loads(line)


def categories(b):
    ev = b["events"]
    m = b["payoutMultiplier"] / 100
    types = {e["type"] for e in ev}
    cats = []
    short = len(ev) <= 450
    gt = None
    blast = {"basegame": False, "freegame": False}
    fizzle = {"basegame": False, "freegame": False}
    burn2 = {"basegame": False, "freegame": False}
    for e in ev:
        if e["type"] == "reveal":
            gt = e["gameType"]
        elif e["type"] == "fuseBlast":
            blast[gt] = True
        elif e["type"] == "fuseFizzle" and e["burned"] >= 2:
            fizzle[gt] = True
        elif e["type"] == "fuseBurn":
            burn2[gt] = True
    gms = [e["globalMult"] for e in ev if e["type"] == "updateGlobalMult"]
    mx = max(gms) if gms else 1
    if "wincap" in types or m >= 5000:
        cats.append("wincap")
    if short:
        if m == 0: cats.append("zero")
        elif m < 2: cats.append("small")
        elif m < 20: cats.append("medium")
        elif m < 200: cats.append("big")
        else: cats.append("mega")
        if "freeSpinTrigger" in types: cats.append("trigger")
        if "freeSpinRetrigger" in types: cats.append("retrigger")
        if "tumbleBoard" in types: cats.append("tumble")
        if blast["basegame"]: cats.append("wireBlastBase")
        if fizzle["basegame"]: cats.append("wireFizzleBurnedBase")
        if blast["freegame"]: cats.append("wireBlastFree")
        if fizzle["freegame"]: cats.append("wireFizzleFree")
        if mx >= 50: cats.append("longChain50")
        if mx >= CAP: cats.append("meterCap")
        if blast["freegame"] and blast["basegame"]: cats.append("blastBaseAndFree")
    else:
        # long books are kept only for the special categories
        if "freeSpinRetrigger" in types and m < 2000: cats.append("retriggerLong")
        if mx >= 50 and m < 2500: cats.append("longChain50Long")
    return cats


COUNTS = {
    "base": {"zero": 60, "small": 50, "medium": 40, "big": 25, "mega": 10, "trigger": 25, "retrigger": 5, "tumble": 20,
             "wincap": 3, "wireBlastBase": 30, "wireFizzleBurnedBase": 12, "wireBlastFree": 10, "wireFizzleFree": 5,
             "longChain50": 5, "meterCap": 3, "blastBaseAndFree": 4},
    "bonus": {"small": 15, "medium": 80, "big": 90, "mega": 60, "retrigger": 30, "wincap": 3, "wireBlastFree": 30,
              "wireFizzleFree": 15, "longChain50": 20, "meterCap": 10, "retriggerLong": 5, "longChain50Long": 5},
}


def main():
    rng = random.Random(11)
    allpicks = {}
    for mode, counts in COUNTS.items():
        seen = {}
        pools = {c: [] for c in counts}
        for b in books(mode):
            for c in categories(b):
                if c not in pools:
                    continue
                n = seen[c] = seen.get(c, 0) + 1
                lim = 3000 if c == "wincap" else KEEP
                if len(pools[c]) < lim:
                    pools[c].append(b)
                else:
                    j = rng.randrange(n)
                    if j < lim:
                        pools[c][j] = b
        out, picks = {}, {}
        for c, k in counts.items():
            pool = pools[c][:]
            rng.shuffle(pool)
            if c == "wincap":
                pool.sort(key=lambda b: len(b["events"]))  # smallest first
            for b in pool[:k]:
                out[b["id"]] = b
                picks.setdefault(c, []).append(b["id"])
        lst = list(out.values())
        with open(f"{FIX}/books_{mode}_sample.json", "w") as f:
            json.dump([{"id": b["id"], "payoutMultiplier": b["payoutMultiplier"] / 100, "events": b["events"]} for b in lst], f, separators=(",", ":"))
        with open(f"{FIX}/books_{mode}_sample.jsonl", "w") as f:
            for b in lst:
                f.write(json.dumps({"id": b["id"], "payoutMultiplier": int(b["payoutMultiplier"]), "events": b["events"]}, separators=(",", ":")) + "\n")
        allpicks[mode] = picks
        print(mode, len(lst), {c: len(v) for c, v in picks.items()}, {c: seen.get(c, 0) for c in counts})
        shutil.copy(f"{PUB}/lookUpTable_{mode}_0.csv", f"{FIX}/lookUpTable_{mode}_0.csv")
    shutil.copy(f"{PUB}/index.json", f"{FIX}/index.json")
    desc = {
        "zero": "no win", "small": "win under 2x", "medium": "2x to 20x", "big": "20x to 200x", "mega": "200x or more",
        "trigger": "free spins triggered from base", "retrigger": "free-spin retrigger", "tumble": "has tumbleBoard (cascade)",
        "wincap": "5000x wincap reached (ends with wincap event; remaining free spins listed without evaluation)",
        "wireBlastBase": "bomb-timer wire blast in a BASE spin (fuseBlast, then tumbleBoard refill, then re-evaluation)",
        "wireFizzleBurnedBase": "wire burnt 2+ cells in a base spin but fizzled (did not reach 3 or nothing removable)",
        "wireBlastFree": "wire blast in a FREE spin", "wireFizzleFree": "wire fizzle with burned>=2 in a free spin",
        "longChain50": "global multiplier reached x50 or more in the feature", "meterCap": "global multiplier reached the x100 cap",
        "blastBaseAndFree": "base spin blast AND a free spin blast in the same book",
        "retriggerLong": "retrigger, long book (>450 events)", "longChain50Long": "multiplier >= x50, long book (>450 events)",
    }
    with open(f"{FIX}/PICKS.md", "w") as f:
        f.write("# Book ids per category (see books_*_sample.json; payoutMultiplier in x of bet; .jsonl in integer x100)\n\n")
        for mode, d in allpicks.items():
            f.write(f"## {mode}\n")
            for c, ids in d.items():
                f.write(f"- **{c}** ({desc.get(c, '')}): {', '.join(map(str, ids[:40]))}\n")
            f.write("\n")


if __name__ == "__main__":
    main()
