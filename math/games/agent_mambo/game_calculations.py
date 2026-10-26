from src.executables.executables import Executables
from src.calculations.board import Board
from src.config.config import Config
from game_geometry import GeometryMixin


class GameCalculations(GeometryMixin, Executables):
    """
    Overrides cluster evaluation so that every cluster is paid with the CURRENT global multiplier
    (there is no per-cell multiplier in Agent Mambo).

    GeometryMixin (game_geometry.py) adds the per-spin floor plan: layout draw + `layout` event in `draw_board`,
    geometry-aware `find_clusters`, `generate_wire_path`, `geo_cells`. Cluster positions stay COMPACT (the SDK emitters
    pad them); the win overlay is placed through `cluster_overlay` (geometric centroid, identical to the stock one on Mezzanine).
    """

    def evaluate_clusters_with_grid(
        self,
        config: Config,
        board: Board,
        clusters: dict,
        pos_mult_grid=None,
        global_multiplier: int = 1,
        return_data: dict = {"totalWin": 0, "wins": []},
    ) -> type:
        total_win = 0
        for sym in clusters:
            for cluster in clusters[sym]:
                syms_in_cluster = len(cluster)
                if (syms_in_cluster, sym) in config.paytable:
                    sym_win = config.paytable[(syms_in_cluster, sym)]
                    symwin_mult = sym_win * global_multiplier
                    total_win += symwin_mult
                    json_positions = [{"reel": p[0], "row": p[1]} for p in cluster]
                    central_pos = self.cluster_overlay(cluster)
                    return_data["wins"] += [
                        {
                            "symbol": sym,
                            "clusterSize": syms_in_cluster,
                            "win": symwin_mult,
                            "positions": json_positions,
                            "meta": {
                                "globalMult": global_multiplier,
                                "clusterMult": 1,
                                "winWithoutMult": sym_win,
                                "overlay": {"reel": central_pos[0], "row": central_pos[1]},
                            },
                        }
                    ]
                    for positions in cluster:
                        board[positions[0]][positions[1]].explode = True

        return_data["totalWin"] += total_win
        return board, return_data
