from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome


class GameStateOverride(GameExecutables):
    """Override or extend universal state.py functions."""

    def reset_book(self):
        super().reset_book()

    def assign_special_sym_function(self):
        self.special_symbol_functions = {"ST": [self.assign_star_prize]}

    def assign_star_prize(self, symbol):
        """Give a base-game Etoile its fixed prize (multiple of the bet)."""
        symbol.assign_attribute({"prize": get_random_outcome(self.config.star_values)})

    def check_game_repeat(self):
        """Verify final simulation outcomes satisfied all distribution/criteria conditions."""
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True
