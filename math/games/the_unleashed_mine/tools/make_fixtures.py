"""Build frontend fixtures + stats from library/publish_files. Run with the env python."""
import csv, io, json, os, random, shutil
import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "..", "library", "publish_files")
FIX = "/home/user/casinomac2/frontend/fixtures"
os.makedirs(FIX, exist_ok=True)


def books(mode):
    t = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(open(f"{PUB}/books_{mode}.jsonl.zst", "rb")))
    for line in t:
        yield json.loads(line)


def kinds(b):
    ev = {e["type"] for e in b["events"]}
    return ev


def pick(mode, rng):
    p = {"zero": [], "small": [], "medium": [], "big": [], "mega": [], "trigger": [], "retrigger": [], "wincap": [], "tumble": []}
    for b in books(mode):
        m = b["payoutMultiplier"] / 100
        ev = kinds(b)
        n = len(b["events"])
        if n > 450:
            continue  # keep sample small
        if "wincap" in ev or m >= 5000:
            p["wincap"].append(b)
        if m == 0:
            p["zero"].append(b)
        elif m < 2:
            p["small"].append(b)
        elif m < 20:
            p["medium"].append(b)
        elif m < 200:
            p["big"].append(b)
        else:
            p["mega"].append(b)
        if "freeSpinTrigger" in ev:
            p["trigger"].append(b)
        if "freeSpinRetrigger" in ev:
            p["retrigger"].append(b)
        if "tumbleBoard" in ev:
            p["tumble"].append(b)
    return p


def build(mode, counts, rng, wincap_books):
    p = pick(mode, rng)
    out, picks = {}, {}
    for cat, k in counts.items():
        pool = p[cat] if cat != "wincap" else wincap_books
        rng.shuffle(pool)
        for b in pool:
            if len([1 for c in picks.values() for _ in c if _ is None]) > 0:
                pass
            if sum(1 for v in picks.get(cat, [])) >= k:
                break
            if b["id"] in out:
                picks.setdefault(cat, []).append(b["id"]); continue
            out[b["id"]] = {"id": b["id"], "payoutMultiplier": b["payoutMultiplier"] / 100, "events": b["events"]}
            picks.setdefault(cat, []).append(b["id"])
    return out, picks


def find_wincap(mode):
    r = []
    for b in books(mode):
        if b["payoutMultiplier"] >= 500000:
            r.append(b)
    return r


if __name__ == "__main__":
    rng = random.Random(7)
    allpicks = {}
    for mode, counts in {
        "base": {"zero": 90, "small": 60, "medium": 50, "big": 30, "mega": 15, "trigger": 30, "retrigger": 5, "tumble": 20, "wincap": 3},
        "bonus": {"small": 20, "medium": 90, "big": 90, "mega": 60, "retrigger": 30, "wincap": 3},
    }.items():
        out, picks = build(mode, counts, rng, find_wincap(mode))
        # trim to ~300
        ids = list(out)
        out_list = [out[i] for i in ids][:330]
        keep = {b["id"] for b in out_list}
        json.dump(out_list, open(f"{FIX}/books_{mode}_sample.json", "w"), separators=(",", ":"))
        allpicks[mode] = {c: [i for i in v if i in keep] for c, v in picks.items()}
        print(mode, len(out_list), {c: len(v) for c, v in allpicks[mode].items()})
        shutil.copy(f"{PUB}/lookUpTable_{mode}_0.csv", f"{FIX}/lookUpTable_{mode}_0.csv")
    shutil.copy(f"{PUB}/index.json", f"{FIX}/index.json")
    with open(f"{FIX}/PICKS.md", "w") as f:
        f.write("# Book ids per category (see books_*_sample.json; payoutMultiplier is in x of bet)\n\n")
        for mode, d in allpicks.items():
            f.write(f"## {mode}\n")
            for c, ids in d.items():
                f.write(f"- {c}: {', '.join(map(str, ids[:40]))}\n")
            f.write("\n")
