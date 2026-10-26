"""Recompress the published book files with a higher zstd level (WP9; SYNTHESIS 7: level 15, fallback 3 if too slow).

  math/env/bin/python math/games/agent_mambo/tools/recompress.py [--level 15] [--threads 3] [--modes base,bonus,...] [--probe MB] [--dry]

Per mode (library/publish_files/books_<mode>.jsonl.zst):
  1. stream-decompress the source, hash the PLAIN stream (sha256) while compressing it at --level into books_<mode>.jsonl.zst.tmp;
  2. decompress the tmp file again and compare the plain sha256 (a recompression must never change one byte of the books);
  3. os.replace (the source is never opened for writing: v1 files may be hard links elsewhere);
  4. refresh `file_hash` of library/configs/books_<mode>.verification.json (payout_hash and num_entries are payload-only and unchanged).
After the last mode the caller runs generate_configs (run.py does) so config.json carries the new book hashes.

--probe MB: only measure compression speed and ratio of the first MB megabytes of the first mode at level 3 and at --level (nothing written)
            to decide the level: projected time = plain size / speed.
Writes library/wp9_recompress.json (sizes, seconds, plain hashes).
"""
import argparse
import hashlib
import io
import json
import os
import sys
import time

import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.abspath(os.path.join(HERE, "..", "library"))
PUB = os.path.join(LIB, "publish_files")
CFG = os.path.join(LIB, "configs")
CHUNK = 1 << 20


def sha_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(CHUNK)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def plain_sha(path):
    h = hashlib.sha256()
    n = 0
    with open(path, "rb") as f, zstandard.ZstdDecompressor().stream_reader(f) as r:
        while True:
            b = r.read(CHUNK)
            if not b:
                break
            h.update(b)
            n += len(b)
    return h.hexdigest(), n


def recompress(path, level, threads):
    tmp = path + ".tmp"
    h = hashlib.sha256()
    n = 0
    t0 = time.time()
    comp = zstandard.ZstdCompressor(level=level, threads=threads)
    with open(path, "rb") as fin, zstandard.ZstdDecompressor().stream_reader(fin) as rd, open(tmp, "wb") as fout:
        with comp.stream_writer(fout, closefd=False) as w:
            while True:
                b = rd.read(CHUNK)
                if not b:
                    break
                h.update(b)
                n += len(b)
                w.write(b)
    t_comp = time.time() - t0
    t1 = time.time()
    check, n2 = plain_sha(tmp)
    assert check == h.hexdigest() and n2 == n, f"{path}: recompressed stream differs from the source"
    t_ver = time.time() - t1
    before = os.path.getsize(path)
    os.replace(tmp, path)
    return {"plain_bytes": n, "plain_sha256": check, "bytes_before": before, "bytes_after": os.path.getsize(path),
            "compress_s": round(t_comp, 1), "verify_s": round(t_ver, 1), "level": level}


def probe(path, megabytes, level, threads):
    limit = megabytes << 20
    out = {}
    for lv in (3, level):
        comp = zstandard.ZstdCompressor(level=lv, threads=threads)
        sink = io.BytesIO()
        n = 0
        t0 = time.time()
        with open(path, "rb") as fin, zstandard.ZstdDecompressor().stream_reader(fin) as rd, comp.stream_writer(sink, closefd=False) as w:
            while n < limit:
                b = rd.read(CHUNK)
                if not b:
                    break
                w.write(b)
                n += len(b)
        dt = time.time() - t0
        out[lv] = {"plain_mb": round(n / 1e6, 1), "out_mb": round(sink.tell() / 1e6, 2), "ratio": round(n / max(sink.tell(), 1), 2), "mb_per_s": round(n / 1e6 / dt, 1)}
    return out


def refresh_sidecar(mode):
    p = os.path.join(CFG, f"books_{mode}.verification.json")
    if not os.path.exists(p):
        return None
    v = json.load(open(p))
    v["file_hash"] = sha_file(os.path.join(PUB, f"books_{mode}.jsonl.zst"))
    with open(p, "w", encoding="utf-8") as f:
        json.dump(v, f, indent=2)
    return v["file_hash"]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--level", type=int, default=15)
    ap.add_argument("--threads", type=int, default=3)
    ap.add_argument("--modes", default="base,bonus,entrance_orders,entrance_blackout")
    ap.add_argument("--probe", type=int, default=0, help="MB of plain stream to time (no write)")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args(argv)
    threads = max(1, min(a.threads, 3))
    modes = [m for m in a.modes.split(",") if os.path.exists(os.path.join(PUB, f"books_{m}.jsonl.zst"))]
    if a.probe:
        print(json.dumps(probe(os.path.join(PUB, f"books_{modes[0]}.jsonl.zst"), a.probe, a.level, threads)))
        return 0
    report_path = os.path.join(LIB, "wp9_recompress.json")
    report = json.load(open(report_path)) if os.path.exists(report_path) else {}
    for m in modes:
        path = os.path.join(PUB, f"books_{m}.jsonl.zst")
        if a.dry:
            print(m, os.path.getsize(path))
            continue
        print(f"recompress {m} level {a.level} threads {threads} ({os.path.getsize(path) / 1e6:.1f} MB)", flush=True)
        r = recompress(path, a.level, threads)
        r["file_sha256"] = refresh_sidecar(m)
        report[m] = r
        json.dump(report, open(report_path, "w"), indent=1)
        print(f"  {m}: {r['bytes_before'] / 1e6:.1f} -> {r['bytes_after'] / 1e6:.1f} MB, compress {r['compress_s']} s, verify {r['verify_s']} s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
