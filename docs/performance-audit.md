# Lokalny audyt wydajności i porządku — 22.11.2026

Gałąź: `perf/local-site-audit`. Baza: `8bc34d0`.
Worktree: `/workspace/kiedysiatka-performance`.
Ten raport opisuje pierwotny audyt lokalny. Późniejszą integrację z nowym
frontendem zlecił właściciel; jej zakres znajduje się na końcu raportu.

## Zakres i zasada zachowania interfejsu

Sprawdzono cztery ekrany, selektor lig, przejścia między ligą i selektorem,
kalendarz, rozwijanie setów, aktualizacje wyników, ulubione, tabelę pełnoekranową,
przerwania animacji, ograniczone animacje oraz widoczność karty.
Testy mobilne obejmują Chromium i WebKit. To emulacja na komputerze, a nie
pomiar fizycznego iPhone'a lub Androida.

Geometria, kolory, typografia, czasy animacji, kolejność ekranów, filtry i schematy
JSON pozostały zachowane. Naprawiono błędne zachowanie w opisanych niżej
przypadkach. Testy importera działają offline: ten audyt nie odpytuje ponownie
wszystkich źródeł sportowych ani nie odświeża snapshotów w `data/`.

## Znaleziska i poprawki

| Problem | Skutek | Poprawka |
| --- | --- | --- |
| Geometria zakrzywionej tabeli przeliczana dla każdego dwupikselowego pasa w każdej klatce | powtarzane `pow`, `sin` i projekcja Y podczas przewijania | projekcja zapamiętana do kolejnej zmiany rozmiaru; zachowano kolejność działań zmiennoprzecinkowych i granice pasów |
| Czyszczenie i ponowne wypełnienie całego nieprzezroczystego canvasu | dwa przejścia przez to samo tło | pojedyncze wypełnienie istniejącym czarnym kolorem |
| Odczyty wymiarów etykiet przeplatane zapisami transformacji w selektorze | kolejne odczyty wymagają ponownego rozstrzygania stylów | wszystkie odczyty przed zapisami; transformacje pozostają takie same |
| WebKit mierzył selektor przed zakończeniem ładowania CSS | pierwsze przewinięcie było przycinane do zera i nadpisywało wybraną ligę | cel programowego centrowania pozostaje ważny do osiągnięcia pozycji; test odtwarza prowizoryczny układ |
| Reset błędu logo w efekcie po montażu | szybki błąd obrazka mógł zostać nadpisany i pozostawić uszkodzony obraz | stan błędu związany z konkretnym źródłem; nowe źródło może zostać pobrane bez resetującego efektu; komponent memoizowany |
| Żądanie JSON bez limitu czasu | jedna zawieszona liga blokowała zakończenie całego `Promise.all` | limit 15 s obejmuje pobieranie i odczyt treści; zachowano przerwanie przy ukryciu karty oraz ostatnie dane |
| Tablica JSON akceptowana jako obiekt feedu | błędna odpowiedź mogła zastąpić poprawny snapshot | niepoprawny format jest odrzucany przed aktualizacją pamięci |
| Bezpośredni zapis pliku TAURON i powielony kod zapisu w importerach | przerwany zapis mógł uszkodzić snapshot | wspólne `scripts/feed_io.py`: plik tymczasowy, `fsync`, zachowanie uprawnień, atomowa podmiana i sprzątanie |
| Nieaktywne style poprzedniej wyszukiwarki i przycisków | większy CSS i trudniejsza nawigacja po kodzie | usunięto 72 nieużywane gałęzie selektorów i nieużywany `IconButton`; zachowano używane gałęzie wspólnych reguł |

`src/services/` przejmuje transport i pamięć feedów. `src/data.js` zachowuje
istniejące eksporty, więc aktualne importy pozostają zgodne. Główne wejście CSS
jest w `src/styles/index.css`; bazowy plik meczów przeniesiono z katalogu głównego.
Rozproszone testy JS przeniesiono do `tests/`. Licencje, źródła Rive i potrzebne
skrypty diagnostyczne pozostają w repozytorium.

## Jakość testów

Produkcja rejestruje service worker, który może ominąć `page.route()` i podać
prawdziwe dane zamiast fixture'a. Testy UI blokują jego rejestrację; sam worker
ma osobne testy jednostkowe. To zmiana izolacji testów, nie zachowania PWA.

Test krótkiej animacji lig wstrzymuje jej odtwarzanie na czas odczytu klatek,
a następnie ją kończy. Zachowano asercje dotyczące transformacji i przebiegu.
Pomiar geometrii nagłówka czeka na ustalenie układu. Pomiar przepełnienia
ukrytych kart odbywa się po końcu istniejącego wejścia ekranu o 3 px.
Wspólny zegar testowy zatrzymuje czas po bezpiecznej dacie początkowej,
co usuwa wyścig „Cannot fast-forward to the past” w WebKit.

## Wielkość builda

| Plik wejściowy produkcji | Baza | Po audycie |
| --- | ---: | ---: |
| CSS | 50 789 B | 45 103 B |
| CSS gzip | 11 130 B | 10 100 B |
| JS | 299 593 B | 300 223 B |
| JS gzip | 93 942 B | 94 220 B |

CSS zmniejszył się o 11,2% (gzip o 9,3%). JS wzrósł o 630 B, w tym obsługa
limitów czasu i pamięć projekcji. Rive/WASM nie zmienił rozmiaru.

## Pomiary przewijania

Chromium 156, build produkcyjny, viewport 390×844, DPR 1, CPU spowolnione 4×.
Po rozgrzewce wykonano trzy naprzemienne próby każdej wersji, po 120 klatek
sterowania selektorem i tabelą. Poniżej mediany trzech prób.

| Pomiar | Baza | Po audycie |
| --- | ---: | ---: |
| Callback renderowania tabeli, średnio na wywołanie | 2,376 ms | 1,890 ms |
| Callback renderowania tabeli, percentyl 95 | 4,30 ms | 3,20 ms |
| Łączny czas callbacku tabeli w próbie | 285,1 ms | 226,8 ms |
| Przeliczenia stylów przy przewijaniu selektora | 81 | 28 |
| Wymuszone układy podczas prób przewijania | 0 | 0 |
| Odstęp między klatkami tabeli, percentyl 95 | 33,5 ms | 33,4 ms |
| Odstępy powyżej 25 ms podczas przewijania tabeli | 64/119 | 52/119 |

Koszt callbacku tabeli spadł o 20,4%; percentyl 95 odstępu między klatkami
pozostał zbliżony. Rasteryzacja nadal ogranicza ten obciążony scenariusz,
więc nie interpretujemy poprawy CPU jako gwarancji 60 FPS.

Po zamknięciu tabeli we wszystkich sześciu próbach: zero aktywnych animacji,
zero pozostałych canvasów, odblokowany dokument i przywrócone `inert=false`.
Nie odnotowano błędów JavaScript. Osobne zrzuty animowanej tabeli i widoku ligi
sprzed i po zmianie mają **zero różniących się pikseli**.

Surowe pomiary i obrazy są lokalnie w `diagnostics/artifacts/performance/`:
`clean-before1..3.json`, `clean-after1..3.json` i odpowiadające im PNG.
Narzędzie do odtworzenia pomiarów: `diagnostics/profile-site.mjs`.

## Wyniki weryfikacji

- 44 testy jednostkowe JS: OK.
- 27 testów Pythona dotyczących importerów i zapisu: OK.
- Build produkcyjny: OK.
- 98 scenariuszy UI w Chromium/WebKit: sprawdzone. W pełnym końcowym przebiegu
  97 przeszło; jeden test WebKit mierzył przepełnienie w trakcie istniejącego
  przesunięcia wejścia ekranu o 3 px. Po dodaniu oczekiwania na koniec tej
  animacji ten scenariusz przeszedł osobno w obu silnikach (2/2).
- Walidacja zapisanych feedów VolleyStation i scalania zapowiedzi/wyników: OK
  (II liga: 532 mecze / 54 drużyny, Pomorska III liga: 72 mecze / 9 drużyn).
- Bezpośrednie uruchomienie `--help` każdego importera po wydzieleniu wspólnego
  modułu: OK. Cztery zmodyfikowane pliki workflow: poprawna składnia YAML.

Nowe testy sprawdzają anulowanie i timeout pobierania, zachowanie pamięci po
błędnym JSON, atomowość zapisu po błędzie serializacji/podmiany, inicjalizację
selektora przed końcem CSS oraz awarię i zmianę źródła logo. Workflowy mają
uzupełnione zależności od `feed_io.py` i uruchamiają testy jego zapisu.
Nie wykonano testów klienta Betclic ani ponownego scrapowania wszystkich lig:
ich algorytmy i opublikowane dane nie zostały zmienione.

## Porównanie wyglądu

Porównano 18 zrzutów: sześć widoków przy szerokościach 320, 390 i 768 px,
w trybie ograniczonych animacji. Zewnętrzne logotypy zastąpiono jednakowymi
fixture'ami SVG, a zewnętrzne fonty wyłączono w obu próbach dla powtarzalności.
15 zrzutów jest identycznych piksel w piksel. W trzech pozostałych różniło się
6–22 pikseli na krawędziach renderowanych ikon/logo; bez przesunięcia układu.
Żaden zrzut nie wykazał zmiany geometrii ekranów.

Błąd ładowania logo i powrót do poprawnego źródła mają osobny test regresji.
Projekcja tabeli ma test ścisłej zgodności z pierwotnymi obliczeniami,
w tym niepełnego ostatniego pasa i różnych przesunięć.

## Ograniczenia i późniejsze scalenie

Największym pozostałym kosztem tabeli jest rasteryzacja wielu pasów `drawImage`.
Bieżąca poprawka redukuje obliczenia CPU przy zachowanej jakości obrazu.
Rive nadal wymaga pobrania WASM o wielkości około 2,24 MB (0,94 MB gzip).
Pomiary lokalne nie gwarantują stałych 60/120 FPS na wszystkich telefonach.

Na `main` równolegle powstaje nowy frontend. Przed scaleniem trzeba porównać
zmiany względem `8bc34d0`, zwłaszcza `src/main.jsx`, style, selektor i tabelę,
i powtórzyć testy na połączonej wersji. Zmiany backendu nie wymagają
przepisywania nowych ekranów. Szczegóły struktury: [architecture.md](architecture.md).


## Integracja z frontendem z `main`

Pakiet połączono z commitem `350b720` po zakończeniu lokalnego audytu.
Pozostawiono nowy selektor kolejek, usunięcie dawnego paska miesięcy i gradientu
oraz przywróconą stabilną tabelę bez wycofanej animacji REDLINE WARP.
Najnowsze snapshoty meczów i poprawki numeracji kolejek pochodzą z `main`.
Optymalizacja projekcji tabeli obejmuje istniejący renderer, zachowując jego
aktualny interfejs. Żadnego snapshotu `data/` nie zastąpiono starszą wersją.

Przed publikacją integracja przeszła 45 testów JS, 32 testy Pythona oraz build
produkcyjny. Historyczne pomiary powyżej dotyczą wcześniejszej bazy `8bc34d0`;
nie są nowymi pomiarami FPS frontendowej wersji po integracji.
