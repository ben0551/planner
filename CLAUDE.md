# Planner — Claude Code Guide

## Project overview

Family household management app: chores, meals, shopping, calendar, rewards.

- **Frontend**: Next.js 16.2.6 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: PocketBase 0.38.1 (SQLite, built-in auth, REST API)
- **Deploy**: Docker Compose — `planner-pb` (port 8090) + `planner-app` (port 3000)

## Repo structure

```
homebase/
├── app/                   # Next.js app (all frontend work happens here)
│   └── src/
│       ├── app/
│       │   ├── (auth)/    # login, register
│       │   ├── (dashboard)/ # chores, meals, shopping, calendar, rewards, settings
│       │   └── api/       # server-side routes (migrate, reset-pin, household-lookup)
│       ├── components/ui/ # shadcn/ui components
│       ├── context/auth.tsx  # useAuth() hook — user, membership, householdId
│       └── lib/
│           ├── pocketbase.ts  # getClient() singleton, all TypeScript types
│           └── utils.ts
├── pb/
│   ├── setup.mjs          # one-time schema creation (run on fresh install)
│   └── pb_data/           # PocketBase data (gitignored)
├── docker-compose.yml
└── .env.example
```

## PocketBase collections

| Collection | Key fields |
|---|---|
| `users` | id, email, name — `emailVisibility` must be `true` for child accounts |
| `households` | id, name, invite_token, custody_week |
| `memberships` | user, household, role (owner/member), pin, permissions (json), theme |
| `chores` | household, title, type (single/everyone/shared), scope, assignee, recurrence, due_date, deadline_time, points |
| `chore_completions` | chore, user, date (YYYY-MM-DD), points |
| `meals` | household, date, meal_type, recipe_name, notes |
| `meal_recipes` | household, name, meal_type, category, notes, ingredients, url |
| `shopping_items` | household, name, quantity, category, checked, meal |
| `goals` | household, user, title, target_points, reward_description, achieved, private |
| `calendar_events` | household, title, start, end, all_day, source, external_id, notes |

## PocketBase quirks (v0.38.1)

- **Select field values** are stored at `field.values` (top-level), NOT `field.options.values`. When patching collections, set both: `{ values: merged, options: { values: merged } }`.
- **emailVisibility** defaults to `false`. Child accounts need `emailVisibility: true` or parent token cannot see their email in membership expands.
- **Admin auth**: try `collections/_superusers/auth-with-password` first (v0.22+), fall back to `admins/auth-with-password`. See `app/src/app/api/_pb-admin.ts`.

## Schema migrations

All schema changes go in `app/src/app/api/migrate/route.ts` (POST handler).  
Users trigger it from **Settings → Sync Database**.  
The migrate route uses `getPbAdminToken()` from `_pb-admin.ts` — requires `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` in environment.

When adding a new field to a collection:
1. Add `{ name: "field_name", type: "text|bool|json|number" }` in the migrate route using `hasField()` guard
2. Add the field to the TypeScript interface in `lib/pocketbase.ts`
3. Update `pb/setup.mjs` so fresh installs get it too

## Auth and permissions

- `useAuth()` returns `{ user, membership, householdId }`
- `membership.role === "owner"` — can manage everything
- `membership.permissions` — per-page `"none" | "read" | "edit"` for kids
- Kid login: PIN entry → `/api/household-lookup` (admin-authed) → family picker → PIN verified client-side against `membership.pin`
- `localStorage` keys: `planner_household` (selected household), `planner_members` (cached member list) — these must NOT be cleared on logout (needed for family picker on fresh visit)

## Chore recurrence logic

Recurrence values: `none | daily | weekly | fortnightly | monthly | odd_week | even_week | my_week`

- `odd_week` / `even_week`: based on ISO week number (`getISOWeek()`), absolute — no drift
- `my_week`: compares against `household.custody_week` (odd/even), flips for other parent
- One-off chores (`recurrence === "none"`) with a past `due_date` are filtered from the active list
- When saving a chore: if `recurrence !== "none"`, send `due_date: null` to clear any stale date

## Next.js 16 rules

- Any page using `useSearchParams()` must wrap the consumer in `<Suspense>` — required for static generation
- `app/AGENTS.md` (auto-loaded): this is Next.js 16, not 13/14 — check `node_modules/next/dist/docs/` for current APIs

## Environment variables

```
NEXT_PUBLIC_POCKETBASE_URL   # PocketBase URL (browser-visible)
PB_ADMIN_EMAIL               # PocketBase superuser email (server-side only)
PB_ADMIN_PASSWORD            # PocketBase superuser password (server-side only)
```

Local dev: `app/.env.local`  
Docker: set in `.env` at repo root (loaded by docker-compose)

## Git / CI

- Branch: `master` — pushes to `main` on GitHub
- GitHub Actions builds and publishes Docker image to `ghcr.io/ben0551/planner/planner-app:latest` on push to `main`
- Docker on Windows (Git Bash): use `MSYS_NO_PATHCONV=1` prefix when calling `docker exec` with Unix paths (e.g. `--dir=/pb_data`)

## Pending features

- Profile photos for household members
- Chores page: tabular/grid view for desktop (like the meal planner)
- Calendar: agenda, week, and month views
