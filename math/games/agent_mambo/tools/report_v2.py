"""Markdown tables for MATH_REPORT.md from the JSON the pipeline leaves in library/ (WP9). Prints to stdout; nothing is invented.

  math/env/bin/python math/games/agent_mambo/tools/report_v2.py > /tmp/report_tables.md

Inputs: library/shares.json, analysis_v2.json, verify_v2.json, wp9_timing.jsonl, wp9_recompress.json, wp9_reweight.json, stats_summary.json.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.abspath(os.path.join(HERE, "..", "library"))
MODES = ["base", "bonus", "entrance_orders", "entrance_blackout"]
LABEL = {"base": "base", "bonus": "bonus (The Briefing, Stage Door)", "entrance_orders": "entrance_orders (Sealed Orders, Coat Check)",
         "entrance_blackout": "entrance_blackout (Ballroom Blackout, Service Stairs)"}


def load(name, default=None):
    p = os.path.join(LIB, name)
    return json.load(open(p)) if os.path.exists(p) else default


def pct(x, d=2):
    return "n/a" if x is None else f"{100 * x:.{d}f} %"


def main():
    sh, an, ve = load("shares.json", {}), load("analysis_v2.json", {}), load("verify_v2.json", {})
    rc, rw, st = load("wp9_recompress.json", {}), load("wp9_reweight.json", {}), load("stats_summary.json", {})
    print("### Results per mode (weighted by the final lookup tables)\n")
    print("| Mode | Cost | Books | RTP | Max win (odds) | Hit rate | Median | Mean | Std | P(R > 1x stake) / P(R > price) |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for m in MODES:
        s = sh.get(m)
        if not s:
            continue
        hit = pct(s.get("hit")) if m == "base" else "100 % (floor 30x)"
        p = pct(s["pGtStake"]) if m == "base" else pct(s["pGtPrice"])
        print(f"| {LABEL[m]} | {s['cost']:g}x | {s['books']:,} | {100 * s['rtp']:.4f} % | {s['maxWin']}x (1 / {s['oddsMax']:,}) | {hit} | {s['medianX']:g}x | {s['meanX']:.1f}x | {s['stdX']:.1f}x | {p} |")
    b = sh.get("base", {})
    if b:
        print("\n### Base game\n")
        print(f"- hit {pct(b['hit'])}, P(R > 1x) {pct(b['pGtStake'])}, sub-stake wins (0 < R <= 1x) {pct(b['subStakeShare'])}, exactly 1.0x {pct(b['exactlyStakeShare'])}, dead spins {pct(b['deadShare'])}, mean win of a hit {b['meanWinOfHitX']:.2f}x, trigger 1 in {b['triggerOneIn']:.1f}")
        print("\n| Floor plan | Share of spins | Hit | P(R > 1x) | Mean win | RTP points |\n|---|---|---|---|---|---|")
        for k, v in b["layoutStats"].items():
            print(f"| {k} | {pct(v['share'])} | {pct(v['hit'])} | {pct(v['pGtStake'])} | {v['meanX']:.3f}x | {100 * v['rtpPoints']:.2f} |")
        print("\n| Mission | Share of triggers | Share of spins | Mean book win | RTP points |\n|---|---|---|---|---|")
        for k, v in b["missionStats"].items():
            print(f"| {k} | {pct(b['mission'][k])} | {pct(v['shareOfSpins'], 3)} | {v['meanBookWinX']:.1f}x | {100 * v['rtpPoints']:.2f} |")
        a = an.get("base", {})
        if "buckets" in a:
            print("\n| Win | Spins | RTP points |\n|---|---|---|")
            for k, v in a["buckets"].items():
                print(f"| {k}x | {pct(v['share'], 3)} | {100 * v['rtpPoints']:.2f} |")
        if "sessions" in a:
            print("\n| Spins | Ends above start | Median net | Mean net | 10th / 90th percentile | Lost over half |\n|---|---|---|---|---|---|")
            for k, v in a["sessions"].items():
                print(f"| {k} | {pct(v['endsAboveStart'], 1)} | {v['medianNet']:.1f} | {v['meanNet']:.1f} | {v['p10']:.0f} / {v['p90']:.0f} | {pct(v['lostOverHalf'], 1)} |")
            print(f"\nP(no win in 10 spins) {pct(a['pNoWinIn10'], 1)}; free-game share of RTP {pct(a.get('freeGameRtpShare'), 1)}; base-spin wire burns {pct(a['baseSpinWire']['burn'], 1)}, blasts {pct(a['baseSpinWire']['blast'], 1)}")
    print("\n### Doors\n")
    print("| Door | Median | P(R > price) | 30-60x | 60-100x | 100-300x | 300x+ | p10 / p90 | Start spins 10 / 12 / 15 / 18+ |\n|---|---|---|---|---|---|---|---|---|")
    for m in MODES[1:]:
        s = sh.get(m)
        if not s:
            continue
        t = s["tierShare"]
        print(f"| {LABEL[m]} | {s['medianX']:g}x | {pct(s['pGtPrice'])} | {pct(s['share30to60'], 1)} | {pct(s['share60to100'], 1)} | {pct(s['share100to300'], 1)} | {pct(s['share300plus'], 2)} | {s['p10X']:g}x / {s['p90X']:g}x | "
              f"{pct(t.get('10'), 2)} / {pct(t.get('12'), 2)} / {pct(t.get('15'), 2)} / {pct(t.get('18+'), 2)} |")
    print("\n| Door | Free spins played | Retrigger share | Mean highest dial | Reaches x50 / x100 | RTP paid at dial >= 20 | Wire burn / blast (free) | Winning steps per book |\n|---|---|---|---|---|---|---|---|")
    for m in MODES[1:]:
        a = an.get(m)
        if not a:
            continue
        print(f"| {m} | {a['freeSpinsPlayed']:.1f} | {pct(a['retriggerShare'], 1)} | x{a['maxDialMean']:.1f} | {pct(a['shareDialReaches50'], 1)} / {pct(a['shareDialReaches100'], 1)} | {pct(a['rtpShareDialGe20'], 1)} | {pct(a['freeWireBurn'], 1)} / {pct(a['freeWireBlast'], 1)} | {a['winningStepsPerBook']:.1f} |")
    if "entrance_orders" in an:
        o = an["entrance_orders"]
        print(f"\nOrders: {o['caseOpensPerBook']:.2f} envelope openings per book, mean bank {o['meanBankX']:.2f}x, capped openings {pct(o['caseOpenCappedShare'], 2)}")
    if "entrance_blackout" in an:
        print(f"\nBlackout: lit share of winning steps {pct(an['entrance_blackout']['litShareOfWinningSteps'], 1)}")
    print("\n### Volatility (SDK stats_summary.json)\n")
    print("| Mode | std | skew | excess kurtosis | P(>=5000x) | prob_less_bet | non-zero hit |\n|---|---|---|---|---|---|---|")
    for m in MODES:
        s = st.get(m)
        if s:
            print(f"| {m} | {s.get('std')} | {s.get('skew')} | {s.get('excess_kurtosis')} | {s.get('prob5k')} | {s.get('prob_less_bet')} | {s.get('non_zero_hr')} |")
    print("\n### Reweight (tools/reweight_doors.py)\n")
    print("| Mode | lambda | kappa | effective books | P(R > price) | median |\n|---|---|---|---|---|---|")
    for m, s in rw.items():
        print(f"| {m} | {s['lam']:.6f} | {s['kappa']:.4f} | {s['effectiveBooks']:.0f} of {s['books']:,} | {pct(s['pGtPrice'])} | {s['medianX']:g}x |")
    print("\n### Book files\n")
    print("| Mode | zstd 3 | zstd 15 | ratio |\n|---|---|---|---|")
    tot3 = tot15 = 0
    for m, r in rc.items():
        print(f"| {m} | {r['bytes_before'] / 1e6:.1f} MB | {r['bytes_after'] / 1e6:.1f} MB | {r['bytes_before'] / r['bytes_after']:.2f} |")
        tot3 += r["bytes_before"]
        tot15 += r["bytes_after"]
    print(f"| total | {tot3 / 1e6:.1f} MB | {tot15 / 1e6:.1f} MB | {tot3 / max(tot15, 1):.2f} |")
    print("\n### Verification (every book)\n")
    for m, v in ve.items():
        print(f"- {m}: {v['books']:,} books, {v['errors']} errors, {v['wincapBooks']} wincap books, {v['seconds']} s")
    print("\n### Wall clock (UTC)\n")
    p = os.path.join(LIB, "wp9_timing.jsonl")
    if os.path.exists(p):
        print("| Step | Start | End | Wall (s) | Detail |\n|---|---|---|---|---|")
        for ln in open(p):
            r = json.loads(ln)
            extra = {k: v for k, v in r.items() if k not in ("stage", "start", "end", "wall_s")}
            print(f"| {r['stage']} | {r['start']} | {r['end']} | {r['wall_s']} | {extra if extra else ''} |")


if __name__ == "__main__":
    main()
