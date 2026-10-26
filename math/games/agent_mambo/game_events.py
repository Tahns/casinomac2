from src.events.events import update_global_mult_event, tumble_board_event  # noqa: F401  (re-exported)

# updateGlobalMult {index, type, globalMult:int}  -- SDK event, reused as is.

FUSE_PATH = "fusePath"
FUSE_BURN = "fuseBurn"
FUSE_BLAST = "fuseBlast"
FUSE_FIZZLE = "fuseFizzle"


def _cells(gamestate, cells):
    """GEOMETRIC visible rows of the frame (NOT padded; winInfo/tumbleBoard add +1 to COMPACT rows instead).
    `cells` are COMPACT (reel, row) tuples; the floor plan maps them (identity on Mezzanine)."""
    return gamestate.geo_cells(cells)


def fuse_path_event(gamestate):
    f = gamestate.fuse
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": FUSE_PATH, "cells": _cells(gamestate, f["path"]), "burned": f["burn"]}
    )


def fuse_burn_event(gamestate, new_cells):
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": FUSE_BURN,
            "burned": gamestate.fuse["burn"],
            "newCells": _cells(gamestate, new_cells),
        }
    )


def fuse_blast_event(gamestate, removed):
    """removed: list of (reel, row) burnt cells that vanish (never scatters). No `replaced` field."""
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": FUSE_BLAST, "cells": _cells(gamestate, removed)}
    )


def blast_tumble_event(gamestate, removed):
    """Standard tumbleBoard event for the post-blast refill. explodingSymbols uses PADDED rows (row+1), like
    every SDK tumbleBoard, because the symbols are removed from the same padded board."""
    special_attributes = list(gamestate.config.special_symbols.keys())
    from src.events.events import json_ready_sym

    exploding = sorted(
        ({"reel": r, "row": c + (1 if gamestate.config.include_padding else 0)} for r, c in removed),
        key=lambda x: x["reel"],
    )
    new_symbols = [[] for _ in range(gamestate.config.num_reels)]
    for r, syms in enumerate(gamestate.new_symbols_from_tumble):
        if syms:
            new_symbols[r] = [json_ready_sym(s, special_attributes) for s in syms]
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "tumbleBoard",
            "newSymbols": new_symbols,
            "explodingSymbols": exploding,
        }
    )


def fuse_fizzle_event(gamestate):
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": FUSE_FIZZLE, "burned": gamestate.fuse["burn"]}
    )


# ---------------------------------------------------------------------------------------------------------- v2 missions
MISSION_ASSIGNED = "missionAssigned"
LIGHT_ROUTE = "lightRoute"
CASE_OPEN = "caseOpen"


def mission_assigned_event(gamestate):
    """SYNTHESIS section 8 item 4, emitted after `freeSpinTrigger` and before the first `updateGlobalMult`.
    `lens` only for the Blackout; `layout` is the plan of the free spins (always the home plan in v2.0); `fuseLen` is the length
    of every `fusePath.cells` of the feature."""
    m = gamestate.mission_cfg
    event = {
        "index": len(gamestate.book.events),
        "type": MISSION_ASSIGNED,
        "mission": m["id"],
        "totalFs": int(gamestate.tot_fs),
        "dialStart": m["dial_start"],
        "dialStep": m["dial_step"],
        "dialCap": m["dial_cap"],
        "payTiming": m["pay"],
    }
    if m["lens"]:
        event["lens"] = {"w": m["lens"]["w"], "h": m["lens"]["h"], "mult": m["lens"]["mult"]}
    event["layout"] = gamestate.free_layout_id()
    event["fuseLen"] = gamestate.free_fuse_len()
    gamestate.book.add_event(event)


def light_route_event(gamestate, route):
    """SYNTHESIS section 8 item 6: right after the free-spin `reveal`, before `fusePath`. `route[k]` = top-left GEOMETRIC cell of the
    window at evaluation step k."""
    lens = gamestate.mission_cfg["lens"]
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": LIGHT_ROUTE,
            "w": lens["w"],
            "h": lens["h"],
            "lensMult": lens["mult"],
            "route": [{"reel": r, "row": g} for r, g in route],
        }
    )


def case_open_event(gamestate, bank_x100, mult, win_x100, capped):
    """SYNTHESIS section 8 item 7 (Sealed Orders): the envelope opens after the last tumble / blast of a spin with bank > 0, before
    `setWin`. win == bank x mult (clipped to the win cap, then `capped` is true and `wincap` follows)."""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": CASE_OPEN,
            "bank": int(bank_x100),
            "mult": int(mult),
            "win": int(win_x100),
            "capped": bool(capped),
        }
    )
