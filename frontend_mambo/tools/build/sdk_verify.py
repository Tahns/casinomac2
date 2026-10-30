"""Read-only SDK checks of the math upload set (WP11, called by tools/build/pack_math.mjs).

  math/env/bin/python frontend_mambo/tools/build/sdk_verify.py <publish_files dir> <configs dir>

For every mode of index.json it runs the SDK's own lookup-table checker (utils.rgs_verification.verify_lookup_format: uint64 weights,
payouts integer, >= 10 when non-zero, multiples of 10, weight sum <= uint64 max) and compares with the SDK sidecar
library/configs/books_<mode>.verification.json written when the books were verified: sha256 of the books file, md5 of the pickled payout
list (the SDK's "payout hash": books payouts == LUT payouts) and the number of entries. It is the fast path of the SDK's
execute_all_tests, WITHOUT its side effect (execute_all_tests rewrites library/stats_summary.json; this script writes nothing).
Prints one JSON object on stdout; exit code 1 on any failure.
"""
import hashlib
import json
import os
import pickle
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MATH = os.path.abspath(os.path.join(HERE, "..", "..", "..", "math"))
sys.path.insert(0, MATH)

from utils.rgs_verification import verify_lookup_format  # noqa: E402  (SDK code, read-only use)
from src.write_data.write_data import get_sha_256  # noqa: E402


def main():
    pub, cfg_dir = sys.argv[1], sys.argv[2]
    with open(os.path.join(pub, "index.json"), "r", encoding="UTF-8") as f:
        index = json.load(f)
    out = {"modes": {}, "fails": []}
    for m in index["modes"]:
        name = m["name"]
        res = {}
        try:
            _, payouts, weight_total, min_win, max_win = verify_lookup_format(os.path.join(pub, m["weights"]))
            res["lookup_format"] = "ok"
            res["entries"] = len(payouts)
            res["max_win"] = max_win / 100.0
            res["weight_total"] = int(weight_total)
            side = os.path.join(cfg_dir, f"books_{name}.verification.json")
            with open(side, "r", encoding="UTF-8") as f:
                ver = json.load(f)
            book_sha = get_sha_256(os.path.join(pub, m["events"]))
            pay_hash = hashlib.md5(pickle.dumps(payouts)).hexdigest()
            res["books_sha256"] = book_sha
            res["books_sha256_ok"] = book_sha == ver["file_hash"]
            res["payout_hash_ok"] = pay_hash == ver["payout_hash"]
            res["entries_ok"] = ver["num_entries"] == len(payouts)
            for k in ("books_sha256_ok", "payout_hash_ok", "entries_ok"):
                if not res[k]:
                    out["fails"].append(f"{name}: {k} is false")
        except AssertionError as e:
            out["fails"].append(f"{name}: SDK lookup check failed: {e}")
        except Exception as e:  # noqa: BLE001
            out["fails"].append(f"{name}: {type(e).__name__}: {e}")
        out["modes"][name] = res
    print(json.dumps(out))
    sys.exit(1 if out["fails"] else 0)


if __name__ == "__main__":
    main()
