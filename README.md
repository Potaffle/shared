# Potaffle shared

Shared between the Potaffle repositories (`potaffle-counter`, `order-qr`, `backend`) as a git submodule.

- `brand/`: logo set, fonts, icons and the colour tokens.
- `contract/`: TypeScript types for orders and the menu, the single source of truth all apps and the backend follow.
- `RULES.md`: working rules for every Claude Code session on this project.

Add to an app with `git submodule add https://github.com/Potaffle/shared shared`. Update with `git submodule update --remote shared` and commit the pointer.
