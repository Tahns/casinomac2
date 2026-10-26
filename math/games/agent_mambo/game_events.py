from src.events.events import update_global_mult_event, tumble_board_event  # noqa: F401  (re-exported)

# updateGlobalMult {index, type, globalMult:int}  -- SDK event, reused as is.

FUSE_PATH = "fusePath"
FUSE_BURN = "fuseBurn"
FUSE_BLAST = "fuseBlast"
FUSE_FIZZLE = "fuseFizzle"


def _cells(cells):
    """Visible rows 0..4 (NOT padded): this differs from winInfo/tumbleBoard, which add +1."""
    return [{"reel": r, "row": c} for r, c in cells]


def fuse_path_event(gamestate):
    f = gamestate.fuse
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": FUSE_PATH, "cells": _cells(f["path"]), "burned": f["burn"]}
    )


def fuse_burn_event(gamestate, new_cells):
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": FUSE_BURN,
            "burned": gamestate.fuse["burn"],
            "newCells": _cells(new_cells),
        }
    )


def fuse_blast_event(gamestate, removed):
    """removed: list of (reel, row) burnt cells that vanish (never scatters). No `replaced` field."""
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": FUSE_BLAST, "cells": _cells(removed)}
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
