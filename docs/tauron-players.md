# Zawodnicy TAURON Ligi i TAURON 1. Ligi

Składy są częścią istniejących odpowiedzi JSON:

- `data/tauron.json` → `teams[].players[]`
- `data/tauron1liga.json` → `teams[].players[]`

Każdy zawodnik ma `id`, `team_id`, `season_id`, `first_name`, `last_name`,
`full_name`, `number`, `position`, `photo`, `height_cm`, `weight_kg`,
`spike_reach_cm`, `source_url`,
`roster_source_url` i `profile_checked_at`. Wymiary podano w cm, wagę w kg.
Brakujące wartości u pojedynczego zawodnika pozostają `null`.
Źródła nie publikują zasięgu w bloku ani zasięgu stojąc: scraper nie wyszukuje
tych parametrów, a API nie zawiera pól `block_reach_cm` i `standing_reach_cm`.

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

## Audyt 22.11.2026

Porównano 30 list klubowych i 450 profili z zapisanym HTML źródła; dodatkowo
sprawdzono online pięć profili z obu lig, w tym ponownie dostępny profil
Marcela Schadacha. Nazwiska, członkostwo w drużynie, sezon, numery, pozycje,
linki zdjęć i opublikowane parametry zgadzają się z odpowiedziami API.
Nie jest to ponowne pobranie wszystkich 450 stron w tej samej chwili.

| Dane | TAURON Liga (207 osób) | TAURON 1. Liga (243 osoby) |
| --- | ---: | ---: |
| Numer i pozycja | 207 | 243 |
| Wzrost | 207 | 236 |
| Waga | 207 | 236 |
| Zasięg ataku | 206 | 233 |
| Zdjęcie inne niż grafika zastępcza | 200 | 232 |

We wszystkich sprawdzonych profilach brak etykiet zasięgu bloku i zasięgu
stojąc. Usunięto ich wyszukiwanie oraz puste pola z API, również ze starych
składów używanych przy awarii źródła. Pozostawiono dostępne parametry nawet
wtedy, gdy część zawodników nie ma ich uzupełnionych na stronie.
