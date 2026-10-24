# Potaffle rules for every Claude Code session

These rules apply in all Potaffle repositories. Each repo's `CLAUDE.md` imports this file with `@shared/RULES.md`.

## 1. Scope of edits

- A session edits only its own repository folder (for example `potaffle-app/backend/`). Everything else on the machine is read-only, including the sibling repos, which may be read for context.
- The `shared/` submodule inside a repo counts as inside that repo: a session may change files in it, commit inside `shared/`, push, then commit the submodule pointer bump in its own repo.
- Any other change outside the folder needs a written proposal (which files, what change, why) and is applied only after Yazeed replies with the explicit token `fsign`. Agreement in other words is not enough.

## 2. Git and GitHub

- Commit and push on the session's own repo freely, no token needed. Commit after each coherent change with a clear message.
- Read-only `gh` commands (status, list, view, api GET) are allowed. Any `gh` command that creates or changes something on GitHub (repos, settings, secrets, PRs, releases) needs `fsign` first.
- Branches: `main` is staging, `production` is prod. Promote by merging `main` into `production`. Never commit directly to `production`.
- Never commit secrets, tokens, passwords or `.env` files. Never paste a secret into chat; if one is pasted, say it is exposed and must be revoked.

## 3. Shared repo

- `shared/contract/` is the single source of truth for the data types (orders, lines, menu, stock). Import from the submodule; do not keep private copies.
- `shared/brand/` holds logos, fonts and icons. Copy into `public/` at build time or reference directly; do not fork them.
- At session start: `git submodule update --remote shared`. If the pointer moved, commit the bump before other work.

## 4. Supabase

- Sessions only ever use `potaffle-staging`. The access token lives in the shell as `SUPABASE_ACCESS_TOKEN`, scoped to staging only, and is referenced by name from `.mcp.json` and the CLI.
- No session holds production credentials. Production is changed only by GitHub Actions in the `backend` repo, triggered by pushes to `production`.
- Two projects, never one project with two schemas.

## 5. Product rules

- Everything stays on free tiers (Supabase Free, Cloudflare Pages, GitHub Free). The restaurant owner pays nothing monthly.
- Version one payments: Cash and CliQ only. Every QR order starts `pending`; staff approve at the counter. Counter orders start `approved`.
- The customer's phone number is the customer identity. Store it normalised as E.164 without spaces (`+9627XXXXXXXX`). Validate Jordanian mobiles (`7[789]` + 7 digits). Format only for display.
- Prices are computed and stored server-side; a client never sends a trusted total.
- Order lines snapshot name, modifiers and unit price at order time, so menu edits never change history.

## 6. Documentation

- `CLAUDE.md` holds standing facts and rules only. Temporary change requests go in the repo's `HANDOVER.md` queue until applied, then are removed.
- `HANDOVER.md` in each repo records state, decisions with dates and next steps so a fresh session can continue.
