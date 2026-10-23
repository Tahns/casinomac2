from copy import deepcopy

APPLY_TUMBLE_MULTIPLIER = "applyMultiplierToTumble"
UPDATE_GRID = "updateGrid"


def update_grid_mult_event(gamestate):
    """Pass updated position multipliers after a win."""
    event = {
        "index": len(gamestate.book.events),
        "type": UPDATE_GRID,
        "gridMultipliers": deepcopy(gamestate.position_multipliers),
    }
    gamestate.book.add_event(event)


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


def fuse_blast_event(gamestate, replaced):
    """replaced: list of (reel, row, symbolName) that turned into W."""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": FUSE_BLAST,
            "cells": [{"reel": r, "row": c, "replaced": n} for r, c, n in replaced],
        }
    )


def fuse_fizzle_event(gamestate):
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": FUSE_FIZZLE, "burned": gamestate.fuse["burn"]}
    )
