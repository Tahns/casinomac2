"""Freeze (and later verify) the published maths of Stellar Vigil.

The Rust optimizer does not reproduce its weights from one run to the next, and Stake Engine forbids
changing the maths after approval. So the files you submit must be archived, not regenerated.

  freeze:  env/bin/python games/stellar_vigil/tools/freeze_maths.py freeze [--archive DIR]
           -> checks the quality gates, then writes frozen/MANIFEST.json (hashes, stats, git commit).
              With --archive, also copies publish_files/ into DIR/<short hash>/ (the files are ~85 MB
              at 100k simulations, too big for git).
  verify:  env/bin/python games/stellar_vigil/tools/freeze_maths.py verify [--dir PATH]
           -> exits 1 if the files in PATH (default: library/publish_files) differ from the manifest.
"""

import argparse
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")
MANIFEST = os.path.join(GAME_DIR, "frozen", "MANIFEST.json")


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def hashes(directory: str) -> dict:
    return {name: sha256(os.path.join(directory, name)) for name in sorted(os.listdir(directory))}


def gates_pass() -> bool:
    r = subprocess.run(
        [sys.executable, "-m", "pytest", os.path.join(GAME_DIR, "tests", "test_quality_gates.py"), "-q", "-p", "no:cacheprovider"],
        capture_output=True,
        text=True,
    )
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip())
    return r.returncode == 0


def freeze(archive: str | None) -> int:
    if not os.path.isdir(PUB):
        print("no library/publish_files: run run.py first")
        return 1
    if not gates_pass():
        print("REFUSED: the quality gates fail; not freezing this run")
        return 1
    files = hashes(PUB)
    with open(os.path.join(GAME_DIR, "library", "stats_summary.json")) as f:
        stats = {m: {k: v[k] for k in ("rtp", "average_win", "std", "max_win")} for m, v in json.load(f).items()}
    commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=GAME_DIR).stdout.strip()
    manifest = {
        "frozen_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "git_commit_of_code": commit,
        "files_sha256": files,
        "stats": stats,
    }
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2)
    short = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:12]
    print(f"manifest written: {MANIFEST} (id {short})")
    if archive:
        dest = os.path.join(archive, short)
        shutil.copytree(PUB, dest)
        print(f"archived to {dest}")
    return 0


def verify(directory: str) -> int:
    with open(MANIFEST) as f:
        expected = json.load(f)["files_sha256"]
    actual = hashes(directory)
    bad = [n for n in sorted(set(expected) | set(actual)) if expected.get(n) != actual.get(n)]
    if bad:
        print("MISMATCH:", ", ".join(bad))
        return 1
    print(f"OK: {len(expected)} files match the manifest")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    fr = sub.add_parser("freeze")
    fr.add_argument("--archive")
    vr = sub.add_parser("verify")
    vr.add_argument("--dir", default=PUB)
    args = ap.parse_args()
    sys.exit(freeze(args.archive) if args.cmd == "freeze" else verify(args.dir))
