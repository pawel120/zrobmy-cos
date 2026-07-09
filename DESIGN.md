# BuildTogether — system kolorów i reguły

Źródło prawdy dla rebrandingu wizualnego. Kierunek: **ciepłe ocieplenie bez utraty
ostrego, inżynierskiego charakteru.** Ciemny motyw (light mode = później).

Trzy funkcjonalne kolory, nie więcej: **ogień** (energia/akcja), **fiolet**
(ludzie/społeczność), **róż** (destrukcja). Reszta to ciepłe neutralne (stone).
Dyscyplina jest ważniejsza niż paleta — patrz sekcja „Reguły".

---

## 1. Fundament

| | Wartość | Uwaga |
|---|---|---|
| Radius | `2px` | było `0` — ledwo zmiękczone, NIE 6px (6px = generyk) |
| Font body | Inter | bez zmian |
| Font display/mono | JetBrains Mono | bez zmian |
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

### Ogień — JEDYNY ciepły akcent: CTA + mechanika 🔥 + stan aktywny + focus
```
--ogien         #ff4500
--ogien-hover   #ff5a1f
--ogien-bg      rgba(255,69,0,.12)   /* tło tintowane */
--ogien-border  rgba(255,69,0,.45)
```

### Fiolet — drugi kolor: społeczność, status, obecność, faza, liczby ludzi
```
--fiolet         #a78bfa   /* tekst/ikona na ciemnym (violet-400, czytelny) */
--fiolet-solid   #7c3aed   /* wypełnienie chipa (tekst na nim: #ede9fe) */
--fiolet-bg      rgba(139,92,246,.14)
--fiolet-border  rgba(139,92,246,.42)
```
Uwaga: „głęboki" fiolet jest za ciemny na tekst — do tekstu ZAWSZE `#a78bfa`,
`#7c3aed` tylko jako wypełnienie z jasnym tekstem na wierzchu.

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
Podmiana istniejących zmiennych. Radius z `0px` na `2px`.
```
--background       20 14% 4%     /* #0c0a09 */
--foreground       48 8% 98%     /* #fafaf9 */
--card             24 10% 10%    /* #1c1917 */
--popover          24 8% 15%     /* #292524 */
--primary          48 8% 98%     /* zostaje neutralny — pomarańcz to akcent, nie primary */
--secondary        20 7% 15%     /* #292524 */
--muted            20 7% 15%
--muted-foreground 24 6% 64%     /* #a8a29e */
--accent           16 100% 50%   /* ogień #ff4500 */
--destructive      347 77% 50%   /* róż #e11d48 — BYŁO ogień, to jest fix */
--border           20 7% 15%     /* #292524 */
--input            20 7% 15%
--ring             16 100% 50%   /* focus = ogień */
--radius           2px
```
Dodatkowo w globals.css: `* { border-color }` z `#27272a` na `#292524`, tło
`html,body` z `#000` na `#0c0a09`, `::selection` i `:focus-visible` zostają ogień.

---

## 4. Reguły (to jest właściwa robota — nie hexy)

**R1. Proporcja 80/20.** Ogień dominuje (akcja/energia). Fiolet to najwyżej ~20%
powierzchni koloru — statusy, badge fazy, obecność, liczniki ludzi. Nigdy dwa
walczące akcenty w jednym komponencie.

**R2. Znaczenia są sztywne.**
- **Ogień** = akcja + energia: główne CTA, przycisk 🔥, stan aktywny/zaznaczony, focus ring.
- **Fiolet** = ludzie: „X w ekipie", online/obecność, badge fazy projektu, tagi społecznościowe.
- **Róż** = TYLKO destrukcja: „Usuń", „Odrzuć na zawsze". Nigdy dekoracyjnie.
- Nigdy: ogień na „Usuń", fiolet na „Usuń", róż na cokolwiek nie-destrukcyjnego.

**R3. Jedno główne CTA na widok.** Tylko jeden pomarańczowy przycisk-akcja na
ekran. Reszta = neutralny stone outline (`btn-primary`) albo ghost.

**R4. Neutral-first.** Domyślny przycisk jest neutralny (stone, hairline). Pomarańcz
rezerwujemy dla TEJ jednej akcji albo mechaniki ognia. Powściągliwość = premium.

**R5. Destrukcja zawsze z potwierdzeniem.** Róż + wzorzec „kliknij znowu" (już jest).

**R6. Tekst na kolorowym wypełnieniu** = najciemniejszy odcień tej samej rodziny
(nie czarny, nie szary). Na dark większość koloru używamy jako outline/tint, nie fill.

**R7. Rogi 2px na kontrolkach i kartach. Hairline 1px zostaje.** Bez wyjątków w górę
(żadnych 6–12px), bo wraca generyk.

**R8. Kontrast.** Fiolet i róż do tekstu w wersji jasnej (`-400`), nie „deep".
Każdy kolor-tekst na `--bg`/`--card` ma przejść WCAG AA (≥4.5:1 dla drobnego).

---

## 5. Mapa zmian w kodzie (do implementacji)
- `tailwind.config.js` → dodać rodziny `fiolet` i `danger`; `ogien` zostaje; neutralne z zinc na stone.
- `app/globals.css` → podmiana zmiennych z sekcji 3; `.accent-surface` zostaje (ogień);
  dodać `.community-surface` (fiolet); rozdzielić destrukcję na osobne style róż.
- Komponenty destrukcyjne (`admin-row-actions`, edycja projektu „Usuń", `report-row`,
  join „Odrzuć") → z ognia na `--danger`.
- Badge fazy projektu, „X w ekipie", obecność → `--fiolet`.
- `--radius` 0 → 2px (jedno miejsce, propaguje wszędzie).

Kolejność wdrożenia: 1) tokeny (tailwind + globals), 2) rozdzielenie destrukcji na róż,
3) wprowadzenie fioletu na statusy, 4) przegląd ekran po ekranie.
