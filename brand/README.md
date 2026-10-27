# Potaffle brand assets

- `logos/`: the full logo set from the designer. `logo_horizontal.svg` is the one used in app headers; `logo_symbol-only.svg` for icons and favicons; `logo_vertical.svg` and `logo_wordmark-only.svg` for print and splash screens.
- `fonts/`: Archivo (Latin, variable weight) and Almarai (Arabic, 400/700/800), woff2, subset by unicode range. Declare them with `@font-face` as in `staff-dashboard/src/styles.css`.
- `icons/`: `favicon.ico` (the vertical logo on a transparent square, 16 to 64 px; every app links it as its tab icon, Yazeed 2026-10-26), and one app-icon set per app from Yazeed's design of 2026-10-27 ("Potaffle App Icons"), each with `icon.svg` (1024 master), `icon-1024.png`, `icon-512.png`, `icon-512-maskable.png`, `icon-192.png`, `apple-touch-icon.png` (180), all full-bleed on #1F1C1C so the OS applies its own corner mask:
  - `icons/potaffle/`: the customer app "Potaffle" (logo symbol on dark). Not built yet; kept here until it starts.
  - `icons/orders/`: the staff dashboard, installed as "Potaffle Orders" (yellow receipt).
  - `icons/admin/`: the owner app, installed as "Potaffle Admin" (three yellow bars).
  The old generic `icon-*.png` / `apple-touch-icon.png` at the top level are superseded by these.

Colours: gold `#E8A427`, dark gold `#B4791B`, ink `#1F1C1C`, light surface `#F4F1EC`, light border `#E4DCCF`, muted text `#6B5E4E`. Dark theme: screen `#1F1C1C`, card `#2A2523`, border `#463E39`, surface `#332D2A`, text `#F4F1EC`, muted `#B5A894`.
Shapes: 24px card radius, pill (999px) buttons, 44px+ tap targets.
