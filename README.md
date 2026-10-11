# Planer budżetu social media

Aplikacja webowa zbudowana według PRD „Planer budżetu social media”. Marketer wpisuje roczny budżet, dzieli go procentowo między kanały social media i podaje oczekiwany ROI dla każdego kanału. Od razu widzi łączny koszt, prognozowany zwrot, przychód i ROI ważony oraz wykresy. Scenariusze można zapisywać i porównywać parami (A vs B).

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski
npm test         # testy jednostkowe (Vitest), w tym przykład kontrolny z PRD
npm run build    # typecheck + build produkcyjny do dist/
```

## Co jest zaimplementowane

| Wymaganie z PRD | Gdzie |
| --- | --- |
| FR-1 Budżet: walidacja, PLN/EUR/USD (tylko formatowanie), przeliczanie na żywo | `src/screens/Editor.tsx`, `src/lib/validation.ts` |
| FR-2 Kategorie: lista predefiniowana i własne (1–40 znaków, unikalne), przeciąganie lub ↑/↓, limit 1–15 | `src/screens/Editor.tsx` |
| FR-3 % budżetu (suwak lub pole, krok 0,1), % ROI (−100…1000), pasek „rozdysponowano / pozostało”, blokada zapisu > 100%, „Rozłóż resztę równo” | `src/lib/calc.ts` (`distributeRemainder`) |
| FR-4 Wyniki per kategoria i podsumowanie, ROI ważony | `src/lib/calc.ts` (`computeScenario`) |
| FR-5 Wykres pierścieniowy i słupkowy, tooltipy, stałe kolory kategorii, eksport PNG, tabela alternatywna | `src/components/*Chart*.tsx`, `src/lib/exportPng.ts` |
| FR-6 Zapis z nazwą i opisem, lista z wyszukiwaniem, otwórz / zmień nazwę / duplikuj / usuń, ostrzeżenie o niezapisanych zmianach | `src/screens/ScenarioList.tsx`, `src/App.tsx` |
| FR-7 Porównanie A vs B: zamiana A↔B, różnice B − A, oznaczenie kategorii tylko w jednym wariancie, wykres zgrupowany, wyróżnienie lepszego wariantu | `src/screens/Compare.tsx`, `src/lib/compare.ts` |

Obliczenia są wykonywane na liczbach dziesiętnych (`decimal.js`), a wartości trzymane jako napisy dziesiętne. Zaokrąglenie (2 miejsca dla kwot, 1 dla procentów) następuje tylko przy wyświetlaniu. Wszystkie widoki liczą wyniki jedną funkcją `computeScenario`.

## Decyzje dotyczące otwartych pytań

- **Logowanie:** MVP działa w trybie gościa. Scenariusze są zapisywane w `localStorage` przeglądarki. Dostęp do danych przechodzi przez interfejs `ScenarioRepository` (`src/lib/storage.ts`), więc można go podmienić na API z kontami (e-mail/hasło, Google) bez zmian w ekranach.
- **Eksport PDF/CSV:** poza MVP. Dostępny jest eksport wykresów do PNG.
- Zdarzenia analityczne (np. `compare_opened`, `first_save`) trafiają do `window.dataLayer`, jeśli jest podpięty (`src/lib/analytics.ts`).
