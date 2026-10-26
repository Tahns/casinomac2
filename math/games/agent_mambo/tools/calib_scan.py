"""Short calibration samples of the doors (WP9): one subprocess per variant (env AM_CALIB), each = tools/mission_calib.py door.

  math/env/bin/python math/games/agent_mambo/tools/calib_scan.py --mission orders --n 2000 --variants '[{}, {"DIAL_STEP": {"orders": 5}}]'
  math/env/bin/python math/games/agent_mambo/tools/calib_scan.py --preset orders          # the Orders samples of the WP9 log
  math/env/bin/python math/games/agent_mambo/tools/calib_scan.py --preset blackout

Prints one line per variant: natural mean / median of the post-floor pool (gate window 70-140x), the PLAIN tilt estimate (lam, median,
P(R > price)) and the PINNED estimate (P(R > price) = 0.31: kappa, lam, median, 300x+ share). Uses --procs processes (default 3, cap 3).
A sample of 2000 books has a standard error of about 5 % on the mean and 1 point on P(R > price): use it to see direction, confirm on the
full pool (tools/reweight_doors.py --dry after create_books).
"""
import argparse
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable

PRESETS = {
    "orders": ("orders", [{}, {"DIAL_STEP": {"orders": 5}}, {"DIAL_STEP": {"orders": 9}}]),
    "blackout": ("blackout", [{}, {"DIAL_STEP": {"blackout": 2}}, {"DIAL_STEP": {"blackout": 4}}, {"LENS_MULT": 3}, {"LENS_MULT": 5}]),
}


def run_variant(mission, n, procs, variant, pin_over):
    env = dict(os.environ)
    env["AM_CALIB"] = json.dumps(variant)
    t0 = time.time()
    cmd = [PY, os.path.join(HERE, "mission_calib.py"), "door", "--mission", mission, "--n", str(n), "--procs", str(min(procs, 3)), "--pin-over", str(pin_over)]
    r = subprocess.run(cmd, env=env, capture_output=True, text=True)
    lines = [ln for ln in r.stdout.splitlines() if ln.startswith("{")]
    if r.returncode != 0 or not lines:
        return {"variant": variant, "error": (r.stderr or r.stdout)[-600:], "rc": r.returncode, "wall_s": round(time.time() - t0, 1)}
    out = json.loads(lines[-1])
    out["variant"] = variant
    out["wall_s"] = round(time.time() - t0, 1)
    return out


def fmt(o):
    if "error" in o:
        return f"{o['variant']}: ERROR {o['error']}"
    p = o.get("pinned", {})
    return (f"{json.dumps(o['variant']):38s} n={o['books']} err={o['reconcile_errors']} natural mean {o['natural_mean']:6.1f}x median {o['natural_median']:5.1f}x | "
            f"plain lam {o['lam']:.5f} med {o['median_x']:5.1f}x P>price {o['p_gt_price']*100:5.2f}% 30-60 {o['share_30_60']*100:4.1f}% 300+ {o['share_300_plus']*100:4.2f}% | "
            f"pinned kappa {p.get('kappa', float('nan')):.3f} lam {p.get('lam', float('nan')):.5f} med {p.get('median_x', float('nan')):5.1f}x "
            f"P>price {p.get('p_gt_price', float('nan'))*100:5.2f}% 300+ {p.get('share_300_plus', float('nan'))*100:4.2f}% | {o['ms_per_book_cpu']:.1f} ms/book {o['wall_s']}s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mission", choices=["orders", "blackout", "briefing", "fuse"])
    ap.add_argument("--preset", choices=list(PRESETS))
    ap.add_argument("--variants", default=None, help="JSON list of AM_CALIB dicts")
    ap.add_argument("--n", type=int, default=2000)
    ap.add_argument("--procs", type=int, default=3)
    ap.add_argument("--pin-over", type=float, default=0.31)
    a = ap.parse_args()
    if a.preset:
        mission, variants = PRESETS[a.preset]
    else:
        mission, variants = a.mission, json.loads(a.variants or "[{}]")
    for v in variants:
        print(fmt(run_variant(mission, a.n, a.procs, v, a.pin_over)), flush=True)


if __name__ == "__main__":
    main()
