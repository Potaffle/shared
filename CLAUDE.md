# Potaffle shared

Brand assets, the TypeScript data contract and the rules every Potaffle session follows. Consumed by the app repos as a git submodule at `shared/`.

@RULES.md

- `brand/`: logos, fonts, icons. See `brand/README.md`.
- `contract/`: `menu.ts` (catalog, prices, stock keys) and `orders.ts` (Order, OrderLine, status, payment). Change these only when the backend schema changes, and tell the other sessions in the commit message.
- `RULES.md`: the rules. Edit only on Yazeed's instruction.

This repo is small on purpose. No build, no dependencies.
