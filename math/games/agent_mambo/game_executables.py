from game_calculations import GameCalculations
from src.calculations.cluster import Cluster
import random
from game_events import (
    update_global_mult_event,
    blast_tumble_event,
    fuse_path_event,
    fuse_burn_event,
    fuse_blast_event,
    fuse_fizzle_event,
)
from src.events.events import update_freespin_event


class GameExecutables(GameCalculations):
    """Game dependent grouped functions."""

    def start_global_mult(self):
        """Free spins start: the meter is set to gm_start and announced."""
        self.global_multiplier = self.config.gm_start
        update_global_mult_event(self)

    def bump_global_mult(self):
        """After a winning step has been paid with the current value: +gm_step, capped. Free spins only."""
        if self.gametype != self.config.freegame_type or self.wincap_triggered or self.win_data["totalWin"] <= 0:
            return
        self.global_multiplier = min(self.global_multiplier + self.config.gm_step, self.config.gm_cap)
        update_global_mult_event(self)

    def get_clusters_update_wins(self):
        """Find clusters on board and update win manager."""
        clusters = Cluster.get_clusters(self.board, "wild")
        return_data = {
            "totalWin": 0,
            "wins": [],
        }
        self.board, self.win_data = self.evaluate_clusters_with_grid(
            config=self.config,
            board=self.board,
            clusters=clusters,
            global_multiplier=self.global_multiplier,
            return_data=return_data,
        )

        Cluster.record_cluster_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        self.win_manager.tumble_win = self.win_data["totalWin"]

    def update_freespin(self) -> None:
        """Called before a new reveal during freegame."""
        self.fs += 1
        update_freespin_event(self)
        self.win_manager.reset_spin_win()
        self.tumblewin_mult = 0
        self.win_data = {}

    # ---------------------------------------------------------------- Fuse Line
    def make_fuse_path(self):
        """One self-avoiding path per spin, from a random cell of reel 0 (right weight 2, up 1, down 1).
        Uses the SDK's seeded `random`, so books are reproducible. Emits fusePath right after reveal."""
        cfg = self.config.fuse_params.get(self.gametype)
        self.fuse = None
        if not cfg:
            return
        n_reels = self.config.num_reels
        while True:
            path = [(0, random.randrange(self.config.num_rows[0]))]
            while len(path) < cfg["len"]:
                reel, row = path[-1]
                opts, wts = [], []
                for dr, dc, w in ((1, 0, 2), (0, -1, 1), (0, 1, 1)):
                    nr, nc = reel + dr, row + dc
                    if nr < n_reels and 0 <= nc < self.config.num_rows[nr] and (nr, nc) not in path:
                        opts.append((nr, nc))
                        wts.append(w)
                if not opts:
                    break
                path.append(random.choices(opts, weights=wts)[0])
            if len(path) == cfg["len"]:
                break
        self.fuse = {"path": path, "burn": min(cfg["b0"], cfg["len"]), "cfg": cfg, "spent": False}
        fuse_path_event(self)

    def advance_fuse(self):
        """Called after a winning step once the tumble refill landed."""
        f = getattr(self, "fuse", None)
        if not f or f["spent"]:
            return
        new = min(f["burn"] + f["cfg"]["adv"], len(f["path"]))
        if new > f["burn"]:
            cells = f["path"][f["burn"] : new]
            f["burn"] = new
            fuse_burn_event(self, cells)

    def resolve_fuse(self):
        """Board is dead (and no wincap). Blast if enough cells are burnt: the burnt non-scatter cells
        vanish and new symbols drop in (fuseBlast, tumbleBoard); then the board is evaluated again.
        Returns True if the board changed and must be re-evaluated. No wild is ever created."""
        f = getattr(self, "fuse", None)
        if not f or f["spent"]:
            return False
        f["spent"] = True
        if f["burn"] >= f["cfg"]["detmin"]:
            removed = [(r, c) for r, c in f["path"][: f["burn"]] if self.board[r][c].name != "S"]
            if removed:
                for r, c in removed:
                    self.board[r][c].explode = True
                fuse_blast_event(self, removed)
                self.tumble_board()
                blast_tumble_event(self, removed)
                return True
        fuse_fizzle_event(self)
        return False
