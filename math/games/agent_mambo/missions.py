"""Missions of Agent Mambo v2 (SYNTHESIS sections 2 and 8; WP8 MATH-MISSIONS).

Pure Python, no SDK import at module level (the SDK `get_random_outcome` is imported lazily), so tests and the front-end tools
can load it on its own.

A MISSION is the rule layer of a free-spin feature (all three share the cluster / tumble / wire core):

  briefing   THE BRIEFING      dial x1, +8 per winning step, cap 100; every winning step is paid at the CURRENT dial value, then
                               the dial rises (exactly the v1 rules: the 100k books of mode `bonus` stay valid).
  orders     SEALED ORDERS     winning steps are NOT paid: each is banked at x1 in an envelope (`winInfo.meta.banked`), the dial still
                               rises +7 per winning step; when the board is dead and the wire has resolved the envelope opens:
                               spin win = bank x dial (the dial AFTER that spin's steps); `caseOpen` event.
  blackout   BALLROOM BLACKOUT every free-spin board announces a `lightRoute` (window 2x2) BEFORE any outcome; window k is used at
                               evaluation step k (reveal board = 0, every tumble step and post-blast evaluation advances it); a
                               winning cluster with a cell in the window pays x4 on top of the dial (integers only); dial +3.
  fuse       THE LONG FUSE     (reserved fallback of Blackout, same key `fuse`, outfit `vault`) long pre-burnt wire: len 12, 5 burnt at
                               reveal, +2 per winning step, dial +2. Config level only.

The mission is drawn once per base trigger from `mission_weights` (40/30/30 in `base`; one mission per door mode). A single positive
weight draws NO random number, so a door whose weights are {'briefing': 1} replays v1 books bit for bit.

Calibration knobs (WP9 owns `calib_params.py`; every name is read with a default, the file may not exist):
  DIAL_STEP      {mission: int}   dial step per winning step            default {'briefing': 8, 'orders': 7, 'blackout': 3, 'fuse': 2}
  DIAL_START     int              dial at the start of the feature      default config.gm_start (1)
  DIAL_CAP       int              dial cap                              default config.gm_cap (100)
  LENS_MULT      int              Blackout lens multiplier (integer)    default 4
  LENS_SIZE      (w, h)           Blackout window                       default (2, 2)
  ROUTE_LEN      int              entries of a lightRoute               default 6
  FUSE_PARAMS    {mission: dict}  wire override {len, b0, adv, detmin}  default: briefing/orders/blackout = config.fuse_params, fuse = 12/5/2/3
  PAYTABLE_SCALE float | {sym: f} paytable scale, every entry rounded to 0.1x (min 0.1x)  default 1.0
  MISSION_WEIGHTS {mission: w}    mission mix of the `base` mode        default {'briefing': 40, 'orders': 30, 'blackout': 30}
  THIRD_MISSION  'blackout'|'fuse' which mission is the third door      default 'blackout'
  WILD_COUNT     {'BR0': n, 'FR0': n}  wilds per reel strip, read by tools/make_reels.py (WP9), NOT by the game code
Run-level overrides (JSON): env AM_CALIB = {"DIAL_STEP": {...}, "LENS_MULT": 4, ...} beats calib_params.py;
env AM_MISSION_WEIGHTS = flat {id: w} or per bet mode {mode: {id: w}} beats every other mission weight.
"""

import json
import math
import os
import random

try:  # WP9 creates this file; the game must not depend on it
    import calib_params as _calib_params
except ImportError:  # pragma: no cover - depends on the checkout
    _calib_params = None

ENV_CALIB = "AM_CALIB"
ENV_MISSION_WEIGHTS = "AM_MISSION_WEIGHTS"

HOME_MISSION = "briefing"
MISSION_ORDER = ("briefing", "orders", "blackout", "fuse")
PAY_STEP = "step"  # each winning step is paid at the current dial value
PAY_SPIN_END = "spinEnd"  # winning steps are banked at x1, the envelope opens when the board is dead

# Static part of the table (dial/lens/fuse numbers are resolved with the calibration knobs in `mission_params`).
MISSIONS = {
    "briefing": {"name": "The Briefing", "outfit": "lab", "pay": PAY_STEP, "lens": False, "door": "Stage Door"},
    "orders": {"name": "Sealed Orders", "outfit": "trench", "pay": PAY_SPIN_END, "lens": False, "door": "Coat Check"},
    "blackout": {"name": "Ballroom Blackout", "outfit": "casino", "pay": PAY_STEP, "lens": True, "door": "Service Stairs"},
    "fuse": {"name": "The Long Fuse", "outfit": "vault", "pay": PAY_STEP, "lens": False, "door": "Service Stairs", "reserved": True},
}
DEFAULT_DIAL_STEP = {"briefing": 8, "orders": 7, "blackout": 3, "fuse": 2}
DEFAULT_FUSE = {"fuse": {"len": 12, "b0": 5, "adv": 2, "detmin": 3}}
DEFAULT_MISSION_WEIGHTS = {"briefing": 40, "orders": 30, "blackout": 30}
DEFAULT_LENS = {"w": 2, "h": 2, "mult": 4}
DEFAULT_ROUTE_LEN = 6
# Base-game win buckets, a force key of the non-trigger base winners ({"bw": bucket}) that the base optimizer fences pin (SYNTHESIS 4,
# lever L14): "sub" = R <= stake (quiet ledger tick, never celebrated), "mid" = stake < R < 5x, "big" = R >= 5x (non-trigger wins).
BASE_BUCKET_EDGES = (1.0, 5.0)
BASE_BUCKETS = ("sub", "mid", "big")
# Base criteria / fences: 'v1' = the shipped v1 shares (wincap, freegame, 0, basegame), 'v2' = one criterion per pinned fence (mission, win
# bucket). 'v2' is the default since the base optimizer experiment met the SYNTHESIS 4 targets (PROGRESS.md, WP8); tools and tests that
# replay v1 books call GameConfig.set_base_profile('v1').
DEFAULT_BASE_PROFILE = "v2"
# v2 base profile: quota of the criterion of each bucket ('big' wins are 1 % of the winners and cost ~500 attempts per book: keep its quota small)
BASE_BUCKET_QUOTAS = {"sub": 0.24, "mid": 0.24, "big": 0.019}
# Door modes (index.json names carry no 'buy' / 'bet' / 'super' words): mode -> (mission, books)
DOOR_MODES = {
    "bonus": ("briefing", 100000),
    "entrance_orders": ("orders", 50000),
    "entrance_blackout": ("blackout", 50000),
    "entrance_fuse": ("fuse", 50000),
}
# Seed offsets per mode: random.seed(sim + 1 + offset). `base` and `bonus` stay at 0 (the 100k published `bonus` books and the WP7
# v1-replay tests are defined by it); the new doors get their own streams, far away from any sim index.
SEED_OFFSETS = {"base": 0, "bonus": 0, "entrance_orders": 1_000_000, "entrance_blackout": 2_000_000, "entrance_fuse": 3_000_000}


class MissionError(ValueError):
    """Bad mission id, bad weights or bad calibration value."""


# ------------------------------------------------------------------------------------------------------------ calibration
_env_cache = {}


def _env_calib():
    raw = os.environ.get(ENV_CALIB)
    if not raw:
        return {}
    if raw not in _env_cache:
        try:
            val = json.loads(raw)
        except ValueError as e:
            raise MissionError(f"{ENV_CALIB} is not valid JSON: {e}") from None
        if not isinstance(val, dict):
            raise MissionError(f"{ENV_CALIB} must be a JSON object")
        _env_cache.clear()
        _env_cache[raw] = val
    return _env_cache[raw]


def calib(name, default=None):
    """Calibration knob: env AM_CALIB first, then calib_params.<name> (WP9), then `default`."""
    env = _env_calib()
    if name in env:
        return env[name]
    return getattr(_calib_params, name, default)


def _merged(name, default):
    """A per-mission dict knob merged key by key over its default (a partial override keeps the other missions)."""
    val = calib(name, None)
    out = dict(default)
    if val is not None:
        if not isinstance(val, dict):
            raise MissionError(f"{name} must be a dict {{mission: value}}")
        out.update(val)
    return out


def check_mission_id(mission):
    if mission not in MISSIONS:
        raise MissionError(f"unknown mission {mission!r}; known: {list(MISSIONS)}")
    return mission


def _int_ge(name, value, low):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value != int(value) or value < low:
        raise MissionError(f"{name} must be an integer >= {low}, got {value!r}")
    return int(value)


def mission_params(mission, config=None):
    """Resolved parameters of one mission (a fresh dict):
    {id, name, outfit, pay, dial_start, dial_step, dial_cap, lens: None | {w, h, mult, route_len}, fuse: None | {len, b0, adv, detmin}}.
    `fuse` None means 'the free-game wire of config.fuse_params' (the v1 wire: the Briefing, Orders and Blackout use it)."""
    check_mission_id(mission)
    m = MISSIONS[mission]
    steps = _merged("DIAL_STEP", DEFAULT_DIAL_STEP)
    gm_start = getattr(config, "gm_start", 1)
    gm_cap = getattr(config, "gm_cap", 100)
    step = steps[mission]
    if mission == "briefing" and "briefing" not in (calib("DIAL_STEP", None) or {}):
        step = getattr(config, "gm_step", step)  # v1 knob stays the Briefing's source
    p = {
        "id": mission,
        "name": m["name"],
        "outfit": m["outfit"],
        "pay": m["pay"],
        "dial_start": _int_ge("DIAL_START", calib("DIAL_START", gm_start), 1),
        "dial_step": _int_ge(f"DIAL_STEP[{mission}]", step, 1),
        "dial_cap": _int_ge("DIAL_CAP", calib("DIAL_CAP", gm_cap), 1),
        "lens": None,
        "fuse": None,
    }
    if m["lens"]:
        size = calib("LENS_SIZE", (DEFAULT_LENS["w"], DEFAULT_LENS["h"]))
        p["lens"] = {
            "w": _int_ge("LENS_SIZE.w", size[0], 1),
            "h": _int_ge("LENS_SIZE.h", size[1], 1),
            "mult": _int_ge("LENS_MULT", calib("LENS_MULT", DEFAULT_LENS["mult"]), 2),  # integers only: payouts stay multiples of 0.1x
            "route_len": _int_ge("ROUTE_LEN", calib("ROUTE_LEN", DEFAULT_ROUTE_LEN), 1),
        }
    fuse = _merged("FUSE_PARAMS", DEFAULT_FUSE).get(mission)
    if fuse:
        f = {k: _int_ge(f"FUSE_PARAMS[{mission}].{k}", fuse[k], 0) for k in ("len", "b0", "adv", "detmin")}
        if f["len"] < 1:
            raise MissionError("fuse len must be >= 1")
        p["fuse"] = f
    if p["dial_start"] > p["dial_cap"]:
        raise MissionError("dial start above dial cap")
    return p


def paytable_scale_factor(sym):
    """PAYTABLE_SCALE for one symbol (float, or {symbol: float} with default 1.0)."""
    s = calib("PAYTABLE_SCALE", 1.0)
    if isinstance(s, dict):
        return float(s.get(sym, 1.0))
    return float(s)


def scale_paytable(paytable):
    """Return a new paytable with PAYTABLE_SCALE applied: every entry is rounded to a multiple of 0.1x (minimum 0.1x), and nudged up by
    one float step when needed so that the SDK's `int(value * 100)` in winInfo.meta.winWithoutMult cannot truncate it."""
    out = {}
    for (n, sym), v in paytable.items():
        f = paytable_scale_factor(sym)
        if f == 1.0:
            out[(n, sym)] = v
            continue
        c = max(round(round(v * f * 10) / 10, 1), 0.1)
        for _ in range(8):
            if int(c * 100) == round(c * 100):
                break
            c = math.nextafter(c, math.inf)
        out[(n, sym)] = c
    return out


# ------------------------------------------------------------------------------------------------------------ weights
def normalise_mission_weights(weights):
    """Validate {mission id: weight} and drop zero weights. None / {} means 'the Briefing only' (= v1)."""
    if weights is None or weights == {}:
        return {HOME_MISSION: 1}
    if not isinstance(weights, dict):
        raise MissionError(f"mission_weights must be a dict, got {type(weights).__name__}")
    out = {}
    for mid, w in weights.items():
        check_mission_id(mid)
        if isinstance(w, bool) or not isinstance(w, (int, float)) or w != w or w < 0 or w == float("inf"):
            raise MissionError(f"bad weight {w!r} for mission {mid!r}")
        if w > 0:
            out[mid] = w
    if not out:
        raise MissionError("mission_weights are all zero")
    return out


def _flat_or_per_mode(cfg, betmode):
    """`{id: w}` applies to every mode; `{bet mode: {id: w}}` only to the listed modes (others: Briefing only)."""
    if not cfg:
        return {HOME_MISSION: 1}
    if all(isinstance(v, dict) for v in cfg.values()):
        return cfg.get(betmode) or {HOME_MISSION: 1}
    return cfg


def resolve_mission_weights(config, betmode, conditions=None):
    """Weights of the trigger being drawn. Precedence: env AM_MISSION_WEIGHTS > distribution conditions['mission_weights'] >
    config.mission_weights (flat or per bet mode) > the Briefing only."""
    env = os.environ.get(ENV_MISSION_WEIGHTS)
    if env:
        try:
            cfg = json.loads(env)
        except ValueError as e:
            raise MissionError(f"{ENV_MISSION_WEIGHTS} is not valid JSON: {e}") from None
        return normalise_mission_weights(_flat_or_per_mode(cfg, betmode))
    if conditions and conditions.get("mission_weights") is not None:
        return normalise_mission_weights(conditions["mission_weights"])
    return normalise_mission_weights(_flat_or_per_mode(getattr(config, "mission_weights", None), betmode))


def draw_mission(weights, uniform=None):
    """Weighted draw with the SDK recipe (`get_random_outcome`: uniform(0, total), first cumulative >= roll). `uniform` defaults to the
    SDK-seeded `random.uniform`. A single positive weight consumes NO random number (v1 compatibility of the `bonus` door)."""
    w = normalise_mission_weights(weights)
    if len(w) == 1:
        return next(iter(w))
    uniform = uniform or random.uniform
    total = sum(w.values())
    roll = uniform(0, total)
    cumulative = 0.0
    chosen = None
    for mid, weight in w.items():
        chosen = mid
        cumulative += weight
        if cumulative >= roll:
            break
    return chosen


def announce_mission(weights, forced=None):
    """Whether `missionAssigned` is emitted: when the mode can draw several missions or its single mission is not the Briefing.
    `forced` (config.mission_event) True/False overrides. The `bonus` door ({'briefing': 1}) stays a v1 book."""
    if forced is not None:
        return bool(forced)
    w = normalise_mission_weights(weights)
    return len(w) > 1 or HOME_MISSION not in w


# ------------------------------------------------------------------------------------------------------------ the lens
def lens_covers(layout, window, w, h, reel, compact_row):
    """True when the cell (reel, COMPACT row) lies in the w x h window whose top-left GEOMETRIC cell is `window` = (reel, geo row)."""
    r0, g0 = window
    g = layout.cells[reel][compact_row]
    return r0 <= reel < r0 + w and g0 <= g < g0 + h


def make_light_route(layout, w, h, length, rng=random):
    """Route of `length` top-left GEOMETRIC cells (reel, geo row) of a w x h window that bounces diagonally over the board (the proxy of
    03_missions_proxy.py): random start among the windows that fit, random diagonal direction, reflect at the edges. Every entry is a window
    that fits `layout`. Uses the SDK-seeded `random`, generated right after the reveal (before any outcome is known)."""
    spots = layout.windows(w, h)
    if not spots:
        raise MissionError(f"no {w}x{h} window fits the layout {layout.id}")
    fits = set(spots)
    reel, row = spots[rng.randrange(len(spots))]
    dr = 1 if rng.random() < 0.5 else -1
    dg = 1 if rng.random() < 0.5 else -1
    route = []
    for _ in range(length):
        route.append((reel, row))
        for ndr, ndg in ((dr, dg), (-dr, dg), (dr, -dg), (-dr, -dg)):  # reflect: first free diagonal in this order
            if (reel + ndr, row + ndg) in fits:
                dr, dg = ndr, ndg
                break
        else:
            continue  # nowhere to go (single window): stay
        reel, row = reel + dr, row + dg
    return route


def window_at(route, step):
    """Window used at evaluation step `step`: route[step], and the last entry once the route is exhausted."""
    return route[min(step, len(route) - 1)]


# ------------------------------------------------------------------------------------------------------------ base buckets
def base_bucket(win):
    """Bucket of a non-trigger base win (x the stake): 'sub' (0 < win <= 1), 'mid' (1 < win < 5), 'big' (win >= 5)."""
    lo, hi = calib("BASE_BUCKET_EDGES", BASE_BUCKET_EDGES)
    if win <= lo:
        return BASE_BUCKETS[0]
    return BASE_BUCKETS[1] if win < hi else BASE_BUCKETS[2]
