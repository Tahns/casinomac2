"""Integrity tests on the published books (skipped if the library has not been generated)."""

import csv
import io
import json
import os

import pytest

zstandard = pytest.importorskip("zstandard")

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")
WINCAP_CENTS = 10000 * 100
COST = {"base": 1.0, "bonus": 80.0}
SAVER_FLOOR_CENTS = {"base": 100, "bonus": 8000}

pytestmark = pytest.mark.skipif(not os.path.isdir(PUB), reason="library not generated (run run.py)")


def load_lut(mode):
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        return [(int(a), int(b), int(c)) for a, b, c in csv.reader(f)]


def load(mode):
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as f:
        text = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f)).read()
    return [json.loads(line) for line in text.splitlines()], load_lut(mode)


@pytest.fixture(scope="module", params=["base", "bonus"])
def mode_data(request):
    books, lut = load(request.param)
    return request.param, books, lut


def test_lut_matches_books(mode_data):
    _, books, lut = mode_data
    assert len(books) == len(lut)
    for book, (sim_id, weight, mult) in zip(books, lut):
        assert book["id"] == sim_id
        assert weight > 0
        assert book["payoutMultiplier"] == mult


def test_payout_within_wincap(mode_data):
    _, books, _ = mode_data
    assert all(0 <= b["payoutMultiplier"] <= WINCAP_CENTS for b in books)


def test_event_indices_are_contiguous(mode_data):
    _, books, _ = mode_data
    for b in books[:5000]:
        assert [e["index"] for e in b["events"]] == list(range(len(b["events"])))


def test_final_win_event_matches_payout(mode_data):
    _, books, _ = mode_data
    for b in books:
        final = [e for e in b["events"] if e["type"] == "finalWin"]
        assert len(final) == 1
        assert final[0]["amount"] == b["payoutMultiplier"]


def test_no_jackpot_vocabulary_in_events(mode_data):
    _, books, _ = mode_data
    for b in books[:2000]:
        assert "jackpot" not in json.dumps(b["events"]).lower()


def test_bonus_total_is_sum_of_parts(mode_data):
    """freeSpinEnd amount == nightly payouts + saver top-up (until the win cap)."""
    _, books, _ = mode_data
    for b in books:
        ends = [e for e in b["events"] if e["type"] == "freeSpinEnd"]
        if not ends:
            continue
        nights = sum(e["amount"] for e in b["events"] if e["type"] == "nightPayout")
        top_up = sum(e["topUp"] for e in b["events"] if e["type"] == "saverWheel")
        assert ends[0]["amount"] == min(nights + top_up, WINCAP_CENTS)


def test_saver_wheel_is_consistent(mode_data):
    """The wheel only spins below the floor; 'saved' lifts the total exactly to the floor."""
    mode, books, _ = mode_data
    floor = SAVER_FLOOR_CENTS[mode]
    seen_saved = False
    for b in books:
        wheels = [e for e in b["events"] if e["type"] == "saverWheel"]
        assert len(wheels) <= 1
        for w in wheels:
            assert w["floor"] == floor
            assert w["segments"][w["segment"]] == ("saved" if w["saved"] else "empty")
            nights = sum(e["amount"] for e in b["events"] if e["type"] == "nightPayout")
            assert nights < floor  # the wheel is only offered below the floor
            if w["saved"]:
                seen_saved = True
                assert w["topUp"] == floor - nights
                assert w["total"] == floor
            else:
                assert w["topUp"] == 0
    if mode == "bonus":
        assert seen_saved


def test_stats_summary_rtp_is_on_target():
    """Weighted RTP from the lookup tables is 96% +/- 0.5% in both modes and the modes agree."""
    rtps = {}
    for mode in ("base", "bonus"):
        lut = load_lut(mode)
        total_w = sum(w for _, w, _ in lut)
        mean = sum(w * m for _, w, m in lut) / total_w / 100
        rtps[mode] = mean / COST[mode]
        assert abs(rtps[mode] - 0.96) < 0.005, (mode, rtps[mode])
    assert abs(rtps["base"] - rtps["bonus"]) < 0.005


def test_payout_equals_sum_of_components(mode_data):
    """ways + base stars + bonus nights (zones included) + saver top-up == payout, until the win cap."""
    _, books, _ = mode_data
    for b in books:
        ev = b["events"]
        parts = (
            sum(e["totalWin"] for e in ev if e["type"] == "winInfo")
            + sum(e["total"] for e in ev if e["type"] == "starPrizes")
            + sum(e["amount"] for e in ev if e["type"] == "nightPayout")
            + sum(e["topUp"] for e in ev if e["type"] == "saverWheel")
        )
        assert b["payoutMultiplier"] == min(parts, WINCAP_CENTS), b["id"]
