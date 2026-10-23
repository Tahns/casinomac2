from game_calculations import GameCalculations
from src.calculations.cluster import Cluster
import random
from game_events import (
    update_grid_mult_event,
    fuse_path_event,
    fuse_burn_event,
    fuse_blast_event,
    fuse_fizzle_event,
)
from src.events.events import update_freespin_event


class GameExecutables(GameCalculations):
    """Game dependent grouped functions."""

    def reset_grid_mults(self):
        """Initialize all grid position multipliers."""
        self.position_multipliers = [
            [0 for _ in range(self.config.num_rows[reel])] for reel in range(self.config.num_reels)
        ]

    def init_vein_grid(self):
        """Free spins: every cell starts as a 1x vein (design change, see PROGRESS.md)."""
        v = getattr(self.config, "fs_start_mult", 1)
        self.position_multipliers = [
            [v for _ in range(self.config.num_rows[reel])] for reel in range(self.config.num_reels)
        ]

    def update_grid_mults(self):
        """All positions start with 1x. If there is a win in that position, the grid point
        is 'activated' and all subsequent wins on that position will double the grid value."""
        if self.win_data["totalWin"] > 0:
            for win in self.win_data["wins"]:
                for pos in win["positions"]:
                    if True:
                        self.position_multipliers[pos["reel"]][pos["row"]] += getattr(self.config, "vein_step", 1)
                        self.position_multipliers[pos["reel"]][pos["row"]] = min(
                            self.position_multipliers[pos["reel"]][pos["row"]], self.config.maximum_board_mult
                        )
            update_grid_mult_event(self)

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
            pos_mult_grid=self.position_multipliers,
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
        """Board is dead (and no wincap). Blast if enough cells are burnt, else fizzle. Returns True
        if the board changed and must be re-evaluated."""
        f = getattr(self, "fuse", None)
        if not f or f["spent"]:
            return False
        f["spent"] = True
        if f["burn"] >= f["cfg"]["detmin"]:
            replaced = []
            for r, c in f["path"][: f["burn"]]:
                name = self.board[r][c].name
                if name not in ("S", "W"):
                    replaced.append((r, c, name))
            if replaced:
                for r, c, _ in replaced:
                    self.board[r][c] = self.create_symbol("W")
                self.get_special_symbols_on_board()
                fuse_blast_event(self, replaced)
                return True
        fuse_fizzle_event(self)
        return False
