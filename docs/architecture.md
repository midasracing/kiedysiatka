# Układ aplikacji i bezpieczna praca równoległa

To aplikacja statyczna React/Vite. Backend to okresowe importery publikujące
pliki JSON; nie ma osobnego serwera HTTP ani bazy danych.

| Katalog | Odpowiedzialność |
| --- | --- |
| `src/pages/` | ekrany i stan widoków |
| `src/components/` | komponenty i ich lokalne style |
| `src/styles/` | wejście globalnego CSS oraz bazowe style meczów |
| `src/services/` | odczyt JSON, przerwanie żądań i pamięć ostatnich danych |
| `src/data.js`, `src/feedUpdates.js` | normalizacja, identyfikacja i współdzielenie niezmienionych danych |
| `scripts/` | importery, wspólny zapis plików i przygotowanie danych do builda |
| `data/` | wersjonowane snapshoty źródeł |
| `public/` | logo, PWA, service worker i skompilowane animacje Rive |
| `motion/` | edytowalne źródła animacji Rive |
| `tests/` | testy jednostkowe JS i offline testy importerów |
| `e2e/` | scenariusze przeglądarkowe |
| `diagnostics/` | narzędzia audytu; wyniki lokalne w ignorowanym `artifacts/` |
| `docs/` | umowy danych, uruchamianie importerów i wyniki audytów |

`src/styles/index.css` zachowuje kolejność: baza meczów → `app.css` → `theme.css`.
Te dwa istniejące pliki pozostają na miejscu, aby ograniczyć konflikty z pracą
nad wyglądem. Style komponentów pozostają przy komponentach.

`src/data.js` nadal eksportuje `fetchLeague` i `flattenFeed`, więc istniejące
importy nie wymagają migracji. Pobieranie realizuje `services/leagueFeeds.js`:
niezmienione odpowiedzi nie są ponownie parsowane, niezmienione obiekty zachowują
referencje. Limit 15 sekund obejmuje żądanie i odczyt treści; przerwanie przez
ukrycie karty nadal działa. Nie zmieniono częstotliwości odświeżania danych.

`feed_io.atomic_json` jest wspólnym zapisem TAURON, VolleyStation i lig
międzynarodowych. Najpierw serializuje i synchronizuje plik tymczasowy w tym
samym katalogu, potem wykonuje atomową podmianę. Błąd zapisu zachowuje poprzedni
snapshot; tymczasowe pliki są sprzątane. Algorytmy scrapowania i schematy danych
pozostają bez zmian.

Nie przenosimy importerów ani `data/`: ich ścieżki są używane w workflowach,
instrukcjach i komendach lokalnych. Nie usuwamy źródeł `motion/` ani informacji
licencyjnych jako rzekomych duplikatów plików produkcyjnych.

## Praca równoległa

Pakiet audytu przygotowano na lokalnej gałęzi `perf/local-site-audit`,
od commita `8bc34d0`. Na prośbę właściciela połączono go następnie z frontendem
z `main` (`350b720`) na gałęzi integracyjnej `integration/site-audit-main`.
Zachowano nowy wybór kolejek i przywróconą stabilną tabelę. Wyniki starego
pomiaru oraz weryfikację integracji opisuje [audyt](performance-audit.md).

Przy kolejnych równoległych zmianach używaj osobnego worktree. Przed scaleniem
porównaj aktualny frontend z bazą gałęzi i uruchom testy połączonej wersji.

## Sprawdzanie zmian

```bash
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
python -m unittest tests.test_feed_io tests.test_international tests.test_refresh_tauron_table
```

Do testów Pythona wymagane są `beautifulsoup4` i `requests`. Pełne testy Betclic
mają oddzielne zależności w `requirements-betclic.txt`.

Do pomiaru produkcji uruchom `npm run preview -- --port 5182`, a następnie:

```bash
node diagnostics/profile-site.mjs before http://127.0.0.1:5182
# po zmianie kodu i ponownym npm run build:
node diagnostics/profile-site.mjs after http://127.0.0.1:5182
```

Narzędzie sprawdza mobilny widok 390×844 w Chromium, obciąża CPU 4×,
wykonuje po 120 klatek przewijania selektora i tabeli oraz zapisuje pomiary
wywołań RAF i zrzuty ekranu. Żądania do zewnętrznych domen są blokowane dla
powtarzalności. Nie jest to pomiar fizycznego telefonu ani gwarancja FPS.
