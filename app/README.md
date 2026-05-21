# ✨ Planner — Household Management App

A family household management app covering chores, meals, shopping, calendar, tasks, goals, and notes.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · PocketBase 0.38

---

## Features

### 🏠 Dashboard
- Personalised greeting with time-of-day awareness
- **Progress ring** — SVG arc showing today's chore completion at a glance
- **Streak leaderboard** — rolling 30-day chore streaks per member with medal ranks
- Due tasks widget (overdue + due today)
- Upcoming calendar events
- Pinned notes widget
- Activity feed (recent household actions)
- Weekly points summary + all-time total

### ✅ Chores
- Per-member chore assignments with point values
- Recurrence: daily, weekly, fortnightly, monthly, odd/even ISO week, "my week" (custody-aware)
- Completion tracking with timestamps
- Admin view: day-column grid for the whole week
- Mobile: swipeable day tabs with chore cards

### 📋 Tasks
- Planner-native tasks with optional due dates and assignees
- Recurrence: daily, weekly, monthly — auto-resets each period
- Due/overdue badges; inline editing (title, due date, assignee, notes, recurrence)
- Visibility rules: owner sees all; members see unassigned + their own
- Filter tabs: pending / completed / all
- Tasks appear on the calendar grid

### 🍽️ Meal Planner
- Weekly grid (desktop) and day cards (mobile)
- Recipe library with categories, ingredients, and source URL
- "Add to shopping list" — pulls ingredients from the week's recipes into the shopping list
- Import recipe by URL (saves reference + guesses name)

### 🛒 Shopping List
- Add items with quantity, category, and target "good price"
- **Added by** attribution — violet badge shows who added each item (useful for reviewing kid suggestions)
- Inline editing for quantity, category, and good price
- Sort by: Category / Name / Added by
- Check off items; bulk-clear checked

### 📅 Calendar
- Month view with events and tasks overlaid per day
- Add events (all-day or timed) and tasks directly from the calendar
- **Google Calendar two-way sync** — connect once, events push/pull automatically
- Manual sync button + auto-sync on page load

### 🏆 Rewards & Goals
- Point-based reward system tied to chore completions
- Personal and household goals with target points and reward descriptions

### 📝 Notes / Pinboard
- Sticky-note style cards with 6 colour choices
- Pin important notes to surface them on the dashboard
- Per-member authorship

### ⚙️ Settings
- **Dark mode** toggle (persists across sessions, flash-free)
- Custody week setting (odd/even weeks) for blended families
- Google Calendar connect / disconnect / calendar picker
- Member management and invite links
- Sync Database (runs schema migrations without redeploying)

### 👨‍👩‍👧 Multi-user & Kids
- Owner + member roles with per-page permission levels (none / read / edit)
- PIN-based login for kids — no email required
- Activity feed logs chore and task completions

---

## Tech & Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Nunito font |
| Backend | PocketBase 0.38.1 (SQLite, built-in auth, REST API) |
| Deploy | Docker Compose — `planner-pb` (8090) + `planner-app` (3000) |
| CI/CD | GitHub Actions → Docker image → `ghcr.io/ben0551/planner/planner-app:latest` |
| HTTPS | Traefik v2 reverse proxy with Let's Encrypt |

### Schema migrations
All schema changes live in `app/src/lib/db-setup.ts` and run automatically on server startup via `instrumentation.ts`. Owners can also trigger manually from **Settings → Sync Database**.

---

## Environment Variables

```env
NEXT_PUBLIC_POCKETBASE_URL   # PocketBase URL (browser-visible)
PB_ADMIN_EMAIL               # PocketBase superuser email (server-side only)
PB_ADMIN_PASSWORD            # PocketBase superuser password (server-side only)

# Optional — Google Calendar sync
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
APP_URL                      # Public app URL (used as OAuth redirect)

# Traefik
DOMAIN                       # e.g. planner.yourdomain.com
```

---

## Running locally

```bash
cp .env.example .env
# fill in PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, NEXT_PUBLIC_POCKETBASE_URL

docker compose up -d
```

App → http://localhost:3000  
PocketBase admin → http://localhost:8090/_/

For frontend development:
```bash
cd app
npm install
npm run dev
```
