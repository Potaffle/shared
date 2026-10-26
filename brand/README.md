# Potaffle brand assets

- `logos/`: the full logo set from the designer. `logo_horizontal.svg` is the one used in app headers; `logo_symbol-only.svg` for icons and favicons; `logo_vertical.svg` and `logo_wordmark-only.svg` for print and splash screens.
- `fonts/`: Archivo (Latin, variable weight) and Almarai (Arabic, 400/700/800), woff2, subset by unicode range. Declare them with `@font-face` as in `staff-dashboard/src/styles.css`.
- `icons/`: `favicon.ico` (the vertical logo on a transparent square, 16 to 64 px; every app links it as its tab icon, Yazeed 2026-10-26), PWA icons (192, 512, 512 maskable) and the apple-touch-icon.

Colours: gold `#E8A427`, dark gold `#B4791B`, ink `#1F1C1C`, light surface `#F4F1EC`, light border `#E4DCCF`, muted text `#6B5E4E`. Dark theme: screen `#1F1C1C`, card `#2A2523`, border `#463E39`, surface `#332D2A`, text `#F4F1EC`, muted `#B5A894`.
Shapes: 24px card radius, pill (999px) buttons, 44px+ tap targets.
