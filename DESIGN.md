# BuildTogether — system kolorów i reguły

Źródło prawdy dla rebrandingu wizualnego. Kierunek po repozycjonowaniu (2026-07):
**ciepły, miękki premium** — apka dla ogólnego rynku twórców i inwestorów, nie
studencko-hackathonowa. Ciemny motyw (light mode = później).

Dwa funkcjonalne kolory, nie więcej: **ember** (energia/akcja/🔥) i **róż**
(destrukcja). Fiolet USUNIĘTY (gryzł się z różem). Reszta to ciepłe neutralne
(stone). Dyscyplina ważniejsza niż paleta — patrz „Reguły".

---

## 1. Fundament

| | Wartość | Uwaga |
|---|---|---|
| Radius | `8px` kontrolki / `12px` karty | miękka skóra po repozycjonowaniu |
| Font body | Inter | bez zmian |
| Font display | Space Grotesk | mono (JetBrains) tylko do liczb |
| Hairline | 1px | nadal główny element konstrukcyjny |
| Motion | `fire-pop`, `toast-in` | bez zmian |

---

## 2. Tokeny kolorów (hex — dla tailwind.config.js)

### Neutralne — ciepły grafit (stone), zamiast zimnej czerni/zinc
```
--bg           #0c0a09   /* strona (stone-950) — było #000 */
--card         #1c1917   /* karta (stone-900) */
--raised       #292524   /* hover/popover (stone-800) */
--line         #292524   /* hairline 1px — było zinc-800 #27272a */
--line-strong  #44403c   /* krawędź hover (stone-700) */
--text         #fafaf9   /* stone-50 */
--text-muted   #a8a29e   /* stone-400 */
--text-dim     #78716c   /* stone-500 */
```

### Ember (klasa `ogien` w kodzie) — JEDYNY ciepły akcent: CTA + 🔥 + aktywny + focus
```
--ogien         #f97316   /* zmiękczone z neonowego #ff4500 */
--ogien-hover   #fb923c
--ogien-bg      rgba(249,115,22,.12)
--ogien-border  rgba(249,115,22,.45)
```

### Róż — WYŁĄCZNIE destrukcja (usuwanie), rozdzielone od ognia
```
--danger         #fb7185   /* tekst/ikona na ciemnym (rose-400) */
--danger-solid   #e11d48   /* wypełnienie „na pewno usuń" (tekst: #fff1f2) */
--danger-bg      rgba(225,29,72,.14)
--danger-border  rgba(225,29,72,.45)
```

### Zarezerwowane (nie używać teraz)
```
zielony  → tylko prawdziwy „sukces/zapisano", jeśli kiedyś zajdzie potrzeba
```

---

## 3. Tokeny shadcn (HSL — dla globals.css `:root`)
Podmiana istniejących zmiennych. Radius `8px` (kontrolki; karty rounded-lg 12px).
```
--background       20 14% 4%     /* #0c0a09 */
--foreground       48 8% 98%     /* #fafaf9 */
--card             24 10% 10%    /* #1c1917 */
--popover          24 8% 15%     /* #292524 */
--primary          48 8% 98%     /* zostaje neutralny — pomarańcz to akcent, nie primary */
--secondary        20 7% 15%     /* #292524 */
--muted            20 7% 15%
--muted-foreground 24 6% 64%     /* #a8a29e */
--accent           25 95% 53%    /* ember #f97316 */
--destructive      347 77% 50%   /* róż #e11d48 — BYŁO ogień, to jest fix */
--border           20 7% 15%     /* #292524 */
--input            20 7% 15%
--ring             25 95% 53%    /* focus = ember */
--radius           8px
```
Dodatkowo w globals.css: `* { border-color }` z `#27272a` na `#292524`, tło
`html,body` z `#000` na `#0c0a09`, `::selection` i `:focus-visible` zostają ogień.

---

## 4. Reguły (to jest właściwa robota — nie hexy)

**R1. Jeden akcent.** Ember to jedyny kolor akcji. Statusy/fazy = neutralne pille
(stone). Żadnego drugiego koloru dekoracyjnego.

**R2. Znaczenia są sztywne.**
- **Ember** = akcja + energia: główne CTA, przycisk 🔥, stan aktywny/zaznaczony, focus ring.
- **Róż** = TYLKO destrukcja: „Usuń", „Odrzuć na zawsze". Nigdy dekoracyjnie.
- Nigdy: ember na „Usuń", róż na cokolwiek nie-destrukcyjnego.

**R3. Jedno główne CTA na widok.** Tylko jeden pomarańczowy przycisk-akcja na
ekran. Reszta = neutralny stone outline (`btn-primary`) albo ghost.

**R4. Neutral-first.** Domyślny przycisk jest neutralny (stone, hairline). Pomarańcz
rezerwujemy dla TEJ jednej akcji albo mechaniki ognia. Powściągliwość = premium.

**R5. Destrukcja zawsze z potwierdzeniem.** Róż + wzorzec „kliknij znowu" (już jest).

**R6. Tekst na kolorowym wypełnieniu** = najciemniejszy odcień tej samej rodziny
(nie czarny, nie szary). Na dark większość koloru używamy jako outline/tint, nie fill.

**R7. Rogi: 8px kontrolki, 12px karty, tagi pille (rounded-full). Hairline 1px zostaje.**

**R8. Kontrast.** Róż do tekstu w wersji jasnej (`-400`), nie „deep".
Każdy kolor-tekst na `--bg`/`--card` ma przejść WCAG AA (≥4.5:1 dla drobnego).

---

## 5. Słownik (repozycjonowanie)
- Fazy projektu (klucze DB legacy): luzna_rozkmina=„Pomysł", kodzimy_hackathon=„Budujemy",
  walidujemy=„Walidujemy rynek", lecimy_po_hajs=„Szukamy finansowania", dziala=„Działa".
  Istniejąca baza wymaga: `alter type project_phase add value if not exists 'walidujemy';`
  oraz `... 'dziala';`
- Hero: „Zbudujmy coś razem." Dwie ścieżki: „Mam pomysł" / „Chcę budować".
- Zakaz slangu studenckiego; „Czym się zajmujesz" zamiast „Wydział"; fallback „Twórca".
- Nav: Projekty · Ludzie · Wiadomości · Powiadomienia · Profil (+Admin);
  Ustawienia na własnym profilu, Wyloguj w Ustawieniach.

Planowane (niewdrożone): oś „Szukamy" (ekipy/klientów/finansowania/feedbacku — nowa
kolumna multi), Typ (Open Source/Komercyjny/Non-profit), flaga profilu „Szukam projektu".
