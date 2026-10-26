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
    light_route_event,
    case_open_event,
)
from missions import PAY_SPIN_END, make_light_route, window_at, lens_covers
from src.events.events import update_freespin_event


class GameExecutables(GameCalculations):
    """Game dependent grouped functions."""

    # ------------------------------------------------------------------ mission state (set at the base trigger, see game_override)
    def active_mission(self):
        """Resolved parameters of the running free-spin mission (missions.mission_params), None in the base game."""
        if self.gametype == self.config.freegame_type:
            return self.mission_cfg
        return None

    def free_layout_id(self):
        """Plan of the free spins (always the home plan in v2.0): `missionAssigned.layout`."""
        return "mezzanine"

    def free_fuse_len(self):
        cfg = self.fuse_config(self.config.freegame_type)
        return int(cfg["len"]) if cfg else 0

    def fuse_config(self, gametype=None):
        """Wire parameters of the spin: the mission's own wire in free spins when it has one, else config.fuse_params."""
        gametype = gametype or self.gametype
        m = self.mission_cfg if gametype == self.config.freegame_type else None
        if m and m.get("fuse"):
            return m["fuse"]
        return self.config.fuse_params.get(gametype)

    def dial_params(self):
        """(start, step, cap) of the dial of the running mission; the v1 gm_* knobs when no mission is set."""
        m = self.mission_cfg
        if m:
            return m["dial_start"], m["dial_step"], m["dial_cap"]
        return self.config.gm_start, self.config.gm_step, self.config.gm_cap

    def start_global_mult(self):
        """Free spins start: the dial is set to its start value and announced."""
        self.global_multiplier = self.dial_params()[0]
        update_global_mult_event(self)

    def bump_global_mult(self):
        """After a winning step (paid at the current value, or banked for Sealed Orders): +dial step, capped. Free spins only."""
        if self.gametype != self.config.freegame_type or self.wincap_triggered or self.win_data["totalWin"] <= 0:
            return
        _, step, cap = self.dial_params()
        self.global_multiplier = min(self.global_multiplier + step, cap)
        update_global_mult_event(self)

    # ------------------------------------------------------------------ one spin
    def begin_spin(self):
        """Called right after `draw_board` (the reveal is out) and before the wire: resets the evaluation counter and, for a lens mission
        (Ballroom Blackout), announces the `lightRoute` BEFORE any outcome. Draws random numbers only for lens missions (v1 safe)."""
        self.eval_step = 0
        self.lens_route = None
        m = self.active_mission()
        if m and m.get("lens"):
            lens = m["lens"]
            self.lens_route = make_light_route(self.layout, lens["w"], lens["h"], lens["route_len"])
            light_route_event(self, self.lens_route)

    def lens_window(self):
        """Top-left GEOMETRIC cell of the window of the current evaluation step."""
        return window_at(self.lens_route, self.eval_step)

    def evaluate_clusters_with_grid(self, config, board, clusters, pos_mult_grid=None, global_multiplier=1, return_data=None):
        """Mission pay rules on top of the stock cluster pay (game_calculations.py):
        Sealed Orders: pay at x1 and flag the win `meta.banked` (winInfo.win == winWithoutMult);
        Ballroom Blackout: a cluster with a cell in the lit window pays x lens on top of the dial (integer), `meta.lit` / `meta.lensMult`."""
        if return_data is None:
            return_data = {"totalWin": 0, "wins": []}
        m = self.active_mission()
        banked = bool(m and m["pay"] == PAY_SPIN_END)
        n0, total0 = len(return_data["wins"]), return_data["totalWin"]
        board, return_data = super().evaluate_clusters_with_grid(
            config, board, clusters, pos_mult_grid, 1 if banked else global_multiplier, return_data
        )
        new = return_data["wins"][n0:]
        if banked:
            for w in new:
                w["meta"]["banked"] = True
        elif m and m.get("lens") and self.lens_route:
            lens = m["lens"]
            window = self.lens_window()
            total = 0.0
            for w in new:
                lit = any(lens_covers(self.layout, window, lens["w"], lens["h"], p["reel"], p["row"]) for p in w["positions"])
                mult = lens["mult"] if lit else 1
                w["win"] = round(w["win"] * mult, 2)
                w["meta"]["lit"] = lit
                w["meta"]["lensMult"] = mult
                total += w["win"]
            return_data["totalWin"] = total0 + total
        return board, return_data

    def get_clusters_update_wins(self):
        """Find clusters on board and update win manager."""
        clusters = self.find_clusters("wild")  # geometry-aware (game_geometry.py); identical to Cluster.get_clusters on Mezzanine
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
        self.eval_step += 1  # the next evaluation of this spin (tumble step / post-blast board) uses the next lens window

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
        cfg = self.fuse_config()
        self.fuse = None
        if not cfg:
            return
        path = self.generate_wire_path(cfg["len"])  # on the floor plan geometry (game_geometry.py); COMPACT (reel, row) cells
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

    # ------------------------------------------------------------------ Sealed Orders
    def open_case(self):
        """Sealed Orders: the board is dead and the wire has resolved, the envelope opens. Spin win = bank x dial (the dial AFTER this
        spin's steps). `caseOpen` comes before `setWin` (setWin.amount == caseOpen.win); on the cap `capped` is true and `wincap`
        follows. Nothing opens after `wincap` (the cap reached while banking at x1 is already a true lower bound of the payout)."""
        m = self.active_mission()
        if not (m and m["pay"] == PAY_SPIN_END) or self.wincap_triggered:
            return
        bank = round(self.win_manager.spin_win, 2)
        if bank <= 0:
            return
        mult = int(self.global_multiplier)
        paid = round(bank * mult, 2)
        self.win_manager.set_spin_win(paid)
        capped = self.win_manager.running_bet_win >= self.config.wincap
        case_open_event(self, round(bank * 100), mult, round(min(paid, self.config.wincap) * 100), capped)
        self.evaluate_wincap()
