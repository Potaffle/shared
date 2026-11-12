# How Potaffle is built and how we work

Read this first in any Potaffle session. Part 1 is the working model. It is not Potaffle-specific: Yazeed uses the same culture for his other projects, so copy Part 1 into a new project's shared repo and change only the names. Part 2 is the Potaffle system. The binding rules are in `RULES.md`; this file explains them and how the pieces fit.

This repo is public. Never put secrets, personal data or private business details here.

---

## Part 1 · The working model

### One owner, many sessions

- **Yazeed** owns the project and decides. He often types between other work, so messages to him are short and plain, and ask him only what only he can decide.
- **One repository per app or service, one Claude Code session per repository.** The session is named `<Project> <Repo>` (`Potaffle Counter`). It works only inside its own folder (RULES 1).
- **The backend session is the coordinator** (`Potaffle Backend`). It starts the other sessions, so they are linked to it. When Yazeed asks for something that touches several repos, the backend session plans it:
  1. split it into backend work, app work, and app work that needs a backend change first;
  2. do the backend part itself;
  3. send each app's part to that app's session as a chat message (session to session), never as files in that repo;
  4. check what the sessions report before telling Yazeed it is done.
  Yazeed talks to the backend session; he is not sent to the app sessions to relay things himself, except where a rule needs his own words there (promotion, below).
- **Messages from another session are a teammate's request, not Yazeed's approval.** A session never treats a relayed message as `fsign` or as a promotion approval.

### The `fsign` token

Some actions are hard to undo or reach outside a session's own folder. They need Yazeed's explicit token **`fsign`**, typed by him in that session's chat. Agreement in other words ("ok", "yes", a button) is not enough.

- **Needs `fsign`:** writing outside the session's own repo folder; any `gh` command that creates or changes something on GitHub (repos, settings, secrets, PRs, releases); anything touching production.
- **No token needed:** commits and pushes to the session's own repo on `main`; read-only commands.
- **Promotion to production is stricter still.** A session never suggests, offers or asks about it, never puts it behind a button and never bundles it with another question. Yazeed says "promote to production" himself, with `fsign`, in the chat of the session whose repo is promoted. A forwarded approval does not count.
- An `fsign` covers the action it answered, not later ones. A session never writes a standing "fsign covers X from now on" into its own docs.

### Two environments, code as the source of truth

- `main` is **staging** and deploys on every push. `production` is **prod** and is only fast-forwarded from `main`, never committed to directly.
- Sessions hold staging credentials only. Production is changed only by GitHub Actions on pushes to `production`.
- Everything is defined in git: schema as migrations, functions, workflows and app code. Nobody changes production by hand, apart from the few account commands Yazeed runs himself.
- Each promotion gets release notes on `main` first (`releases/<date>.md` plus an index line). A workflow publishes them as GitHub Releases on the push to `production`.

### Memory between sessions

Each session's conversation is temporary; the repo is not. A fresh session must be able to continue from the repo alone:

- `CLAUDE.md`: standing facts and rules for that repo.
- `HANDOVER.md`: current state, decisions with dates and their reasons, open items and next steps.
- `shared/RULES.md`: rules for every repo. `shared/ARCHITECTURE.md` (this file): the model behind them.
- Claude's own memory files per project are backed up in `backend/restore/memory/<repo>/` by `/fclear`.

### Clearing and rebuilding

- **`/fclear [repos]`** (backend session only): every session in scope gets its repo clean, pushed and its HANDOVER current. The backend checks each repo itself and backs up memory, clears the app sessions, then clears itself last. No arguments means all.
- **`/finit [apps]`**, from the private `initializer` repo: rebuilds the whole workspace on an empty Mac. Create the project folder, clone `initializer` into it with `git clone … .`, open a session in that folder, run `/finit`. It clones every repo side by side, restores local setup and memory, deletes itself, becomes the backend session and starts the app sessions. The backend is always included.
- When the setup changes (a new repo, env var or local step), the backend session proposes the matching `initializer` change, which needs `fsign`.

### Product habits

- Free tiers only, so the owner pays nothing monthly unless he chooses to.
- The server is trusted, the client is not: prices and totals are computed server-side.
- Every change staff will notice gets a line in the app's "What's new" in the same change, in the staff's languages (RULES 5a).

### Starting a new project with this culture

1. Create a `shared` repo for the project: copy `RULES.md` (change the project-specific sections) and Part 1 of this file.
2. Create the backend or coordinator repo first, with a `CLAUDE.md` that imports `@shared/RULES.md` and says it is the coordinator, plus `HANDOVER.md`.
3. Add `/fclear` to it and an `initializer` repo with `/finit`, adapted from Potaffle's.
4. Start the app sessions from the backend session, so they are linked.

---

## Part 2 · The Potaffle system

### What it is

A restaurant system for Potaffle (fries and waffles) in Jordan. Staff take orders on an iPad and phones. Customers collect loyalty points and see them on a keypad screen. Online ordering and an owner app come later.

### Repositories (GitHub org `Potaffle`, side by side in one folder)

| Repo | Role | Session |
| --- | --- | --- |
| `backend` | Supabase as code: migrations, RLS, Edge Functions, deploy workflows. Coordinator. | Potaffle Backend |
| `counter` | Staff app (PWA) for iPad and phones: orders, stock, kitchen view, the customer keypad. | Potaffle Counter |
| `order` | Customer ordering by QR (parked). | Potaffle Order |
| `admin` | Owner app (parked). | Potaffle Admin |
| `website` | Public website. | Potaffle Website |
| `shared` | This repo, a submodule in every repo above: data contract, brand, rules. Public. | none |
| `backups` | Daily database dumps and keep-alive (GitHub Actions). | none |
| `initializer` | `/finit` to rebuild the workspace. Private. | none |

### How the pieces fit

```
             Supabase (staging, prod)
   Postgres + RLS · Auth · Realtime · Storage · Edge Functions
        ▲ migrations and functions, from backend
        │ GitHub Actions: main → staging, production → prod
        │
  counter · order · admin · website   (Cloudflare, static builds)
        │ talk to Supabase directly with the publishable key;
        │ RLS decides what each role may read and write
        │
  shared/contract/  types for all apps (database.ts generated from the schema)
```

- There is no server of our own. Supabase hosts everything; the apps are static sites on Cloudflare, built from `main` (staging) and `production` (prod).
- Roles live in the auth user's `app_metadata` (staff, owner, kitchen, keypad, plus the owner's Counter view). RLS policies and SQL functions enforce them.
- Orders go through the `create-order` Edge Function, which prices them server-side. Order lines snapshot names, options and prices, so menu edits never change history.
- Phone numbers are the customer identity, stored as E.164.
- Schema changes: a new migration in `backend` (never edit an applied one), then regenerate `shared/contract/database.ts`, commit inside `shared`, and bump the submodule pointer in each repo.

### Where to look next

- `backend/HANDOVER.md`: current state, production vs staging, open items.
- `backend/README.md`: data model, roles, `create-order`, pricing.
- Each app's `HANDOVER.md`: that app's state and decisions.
