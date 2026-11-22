# Zawodnicy TAURON Ligi i TAURON 1. Ligi

Składy są częścią istniejących odpowiedzi JSON:

- `data/tauron.json` → `teams[].players[]`
- `data/tauron1liga.json` → `teams[].players[]`

Każdy zawodnik ma `id`, `team_id`, `season_id`, `first_name`, `last_name`,
`full_name`, `number`, `position`, `photo`, `height_cm`, `weight_kg`,
`spike_reach_cm`, `block_reach_cm`, `standing_reach_cm`, `source_url`,
`roster_source_url` i `profile_checked_at`. Wymiary podano w cm, wagę w kg.
Nieopublikowane wartości pozostają `null`; brak zasięgu bloku nie oznacza zera.

Źródła podają pełne imię i nazwisko w jednym polu. API zachowuje je bez skracania
w `full_name`; podział na `first_name` i `last_name` następuje po pierwszej spacji
(`name_split_method: "first_space"`). Przy wieloczłonowych imionach ten podział
nie jest potwierdzony osobnymi polami źródła; nie korzystamy z domysłów ani słowników.

## Sposób wyszukiwania

1. ID klubów pochodzą z oficjalnych danych meczowych istniejącego importera.
2. Strona `https://www.tauronliga.pl/teams/id/<id>.html` lub odpowiednik
   `www.tauron1liga.pl` wskazuje aktualny sezon.
3. Tabela `#playerslist tbody tr` daje numer, pełne nazwisko, pozycję i link
   `/players/id/<id>/tour/<sezon>.html`. Nie używamy list uczestników meczów ani
   tabel kariery. Zdjęcia pochodzą z kart tego samego składu.
4. Profil sezonowy zawodnika daje opisane etykietami pola `div.number` / `h3`,
   np. „Wzrost”, „Waga”, „Zasięg z wyskoku do ataku”. Sprawdzamy nazwisko
   i przynależność do klubu, zanim połączymy parametry z zawodnikiem.

`roster_source_url` i `roster_checked_at` opisują ostatni udany odczyt listy klubu.
Skład jest odświeżany co dobę, parametry profili co tydzień. Przy awarii zachowujemy
ostatnie potwierdzone parametry i ich rzeczywiste daty. Nowe członkostwo w drużynie,
numery i pozycje pochodzą zawsze z odczytanej listy sezonowej.

```bash
python scripts/refresh_tauron.py --full-rosters
python scripts/refresh_tauron.py --league first --full-rosters
```

Zwykłe uruchomienia i istniejący workflow GitHub Actions także obsługują składy;
nie jest potrzebna osobna usługa ani klucz API.
