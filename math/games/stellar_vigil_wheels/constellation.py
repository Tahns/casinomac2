"""Pure game logic for the Nuit des Constellations bonus (no SDK dependency).

A 5x5 sky receives new stars each night. Neighbouring stars (8-neighbourhood) form
constellations; every star's value level rises with the size of its constellation.
Completing sky zones pays fixed multipliers (never progressive).
"""

import random

GRID = 5

# Fixed value ladder, in multiples of the bet.
LADDER = [0.2, 0.4, 0.6, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 50]
TOP_LEVEL = len(LADDER) - 1

# A constellation lifts each of its stars by at most this many levels.
CHAIN_CAP = 3

# Fixed zone multipliers (never progressive), in multiples of the bet.
ZONES = {
    "Horizon": {"cells": [(r, GRID - 1) for r in range(GRID)], "win": 20},
    "Meridien": {"cells": [(GRID // 2, row) for row in range(GRID)], "win": 100},
    "Quadrature": {"cells": [(0, 0), (GRID - 1, 0), (0, GRID - 1), (GRID - 1, GRID - 1)], "win": 1000},
    "Firmament": {"cells": [(r, c) for r in range(GRID) for c in range(GRID)], "win": 10000},
}


def neighbours(reel: int, row: int):
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            r, c = reel + dr, row + dc
            if 0 <= r < GRID and 0 <= c < GRID:
                yield r, c


class Sky:
    """State of the 5x5 sky during one bonus."""

    def __init__(self):
        self.base = {}  # (reel,row) -> base level
        self.conj = {}  # (reel,row) -> conjunction bonus levels
        self.zones_done = set()

    def empty_cells(self):
        return [(r, c) for r in range(GRID) for c in range(GRID) if (r, c) not in self.base]

    def components(self):
        """Return list of constellations, each a sorted list of cells."""
        seen, comps = set(), []
        for cell in sorted(self.base):
            if cell in seen:
                continue
            stack, comp = [cell], []
            seen.add(cell)
            while stack:
                cur = stack.pop()
                comp.append(cur)
                for nb in neighbours(*cur):
                    if nb in self.base and nb not in seen:
                        seen.add(nb)
                        stack.append(nb)
            comps.append(sorted(comp))
        return comps

    def levels(self):
        """Current level of every star, after chain bonus and conjunctions."""
        out = {}
        for comp in self.components():
            chain = min(CHAIN_CAP, len(comp) - 1)
            for cell in comp:
                out[cell] = min(TOP_LEVEL, self.base[cell] + chain + self.conj.get(cell, 0))
        return out

    def total_value(self) -> float:
        return sum(LADDER[lvl] for lvl in self.levels().values())

    def add_stars(self, new_stars):
        """Place stars [(cell, base_level)], applying conjunction bonuses. Returns number of conjunctions."""
        conjunctions = 0
        for cell, level in new_stars:
            touching = {nb for nb in neighbours(*cell) if nb in self.base}
            merged = len(self._roots(touching))
            self.base[cell] = level
            if merged >= 2:
                conjunctions += 1
                for comp in self.components():
                    if cell in comp:
                        for c in comp:
                            self.conj[c] = self.conj.get(c, 0) + 1
        return conjunctions

    def _roots(self, cells):
        """Group the given cells by constellation (before the new star is placed)."""
        comps = self.components()
        roots = set()
        for cell in cells:
            for idx, comp in enumerate(comps):
                if cell in comp:
                    roots.add(idx)
        return roots

    def new_zones(self):
        """Zones completed since the last call. Returns [(name, win)]."""
        done = []
        for name, zone in ZONES.items():
            if name not in self.zones_done and all(c in self.base for c in zone["cells"]):
                self.zones_done.add(name)
                done.append((name, zone["win"]))
        return done


def draw_night(sky: Sky, star_count_weights: dict, level_weights: dict, adjacency_bias: float):
    """Choose this night's stars: [(cell, base_level)]. Uses the global seeded RNG."""
    counts, cw = list(star_count_weights.keys()), list(star_count_weights.values())
    k = random.choices(counts, weights=cw)[0]
    empty = sky.empty_cells()
    k = min(k, len(empty))
    levels, lw = list(level_weights.keys()), list(level_weights.values())
    stars = []
    for _ in range(k):
        weights = []
        for cell in empty:
            near = any(nb in sky.base or any(nb == s[0] for s in stars) for nb in neighbours(*cell))
            weights.append(1.0 + adjacency_bias if near else 1.0)
        cell = random.choices(empty, weights=weights)[0]
        empty.remove(cell)
        stars.append((cell, random.choices(levels, weights=lw)[0]))
    return stars
