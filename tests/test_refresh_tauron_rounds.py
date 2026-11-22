"""Matchweek metadata from the official PLS fixture list, not dates or rounds of play."""
import unittest

from bs4 import BeautifulSoup

from scripts.refresh_tauron import parse_full_season


def card(game_id, date="22.11.2026 18:00"):
    return f'''<section data-game-id="{game_id}" data-team="2,3">
      <div class="game-box"><div class="game-date">{date}</div>
      <div class="game-team left">Home</div><div class="game-team right">Away</div>
      <div class="game-result"><span class="game-score">0</span><span class="game-score">0</span></div>
      </div></section>'''


class FixtureRoundTests(unittest.TestCase):
    def parse(self, page, key="men"):
        base = "https://www.tauron1liga.pl" if key == "first" else "https://www.tauronliga.pl"
        return parse_full_season(BeautifulSoup(page, "html.parser"), key, base)

    def test_both_leagues_use_matchweek_term_not_constant_round_of_play(self):
        page = '<section data-phase="RS" data-round="1">'
        page += '<section data-phase="RS" data-round="1" data-term="8">' + card(1) + '</section>'
        page += '<section data-phase="RS" data-round="1" data-term="9">' + card(2) + '</section></section>'
        for key in ("men", "first"):
            with self.subTest(league=key):
                self.assertEqual([(m["id"], m["round"]) for m in self.parse(page, key)], [("1", 8), ("2", 9)])

    def test_missing_heading_does_not_reuse_the_previous_matchweeks_heading(self):
        page = '<section data-phase="RS" data-term="7"><h4>Kolejka: 7</h2>' + card(1) + '</section>'
        page += '<section data-phase="RS" data-term="8">' + card(2) + '</section>'
        self.assertEqual([m["round"] for m in self.parse(page)], [7, 8])

    def test_legacy_headings_with_or_without_colon_and_whitespace(self):
        page = card(99) + '<h4>Kolejka: 3</h4>' + card(1)
        page += '<h3>KOLEJKA&nbsp; 4</h3>' + card(2)
        self.assertEqual([(m["id"], m["round"]) for m in self.parse(page)], [("1", 3), ("2", 4)])

    def test_postponement_does_not_change_the_official_matchweek(self):
        page = '<section data-phase="RS" data-term="2">' + card(1, "20.02.2027 18:00") + '</section>'
        page += '<section data-phase="RS" data-term="10">' + card(2) + '</section>'
        self.assertEqual([m["round"] for m in self.parse(page)], [2, 10])

    def test_invalid_term_and_playoffs_do_not_inherit_an_unrelated_heading(self):
        for term, phase in (("0", "RS"), ("unknown", "RS"), ("1", "PO")):
            with self.subTest(term=term, phase=phase):
                page = '<h4>Kolejka: 6</h4>'
                page += f'<section data-phase="{phase}" data-term="{term}">' + card(1) + '</section>'
                self.assertEqual(self.parse(page), [])


if __name__ == "__main__":
    unittest.main()
