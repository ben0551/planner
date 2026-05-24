# Planner

A family household management app built for real daily use. Covers chores, meals, shopping, a family calendar, and a rewards system — with full support for kid accounts, PIN login, per-kid permissions, and split-custody scheduling.

---

## What it does

### Chores
- Create chores for the whole household, everyone, or a specific person
- Recurrence options: daily, weekly, fortnightly, monthly, odd weeks, even weeks, or "my week" (custody-aware)
- Kids earn points for completing chores; points feed into the leaderboard and goals
- Set an optional deadline time — useful for "clean your room before 8pm"
- Owner admin panel: mark or unmark any kid's chore for any day of the week
- Kids can only see and toggle their own assigned chores

### Meals
- Weekly meal planner — plan breakfast, lunch, and dinner for each day
- Recipe library: save your household's go-to meals with meal type, category, notes, ingredients, and a URL
- Add meals directly from the recipe library

### Shopping
- Shared shopping list across the household
- Items have quantity, category, and an optional **good price** target (green badge shown in-store)
- **Added by** attribution — shows which member added each item (useful for reviewing kid suggestions)
- Inline editing for quantity, category, and good price
- Sort by: Category / Name / Added by
- Tick items off as you shop; clear checked items in bulk
- Items can be linked to a specific meal

### Tasks
- Planner-native tasks with optional due dates and member assignment
- Recurrence: daily, weekly, monthly — auto-resets at the start of each period
- Due/overdue badges; inline editing (title, due date, assignee, notes, recurrence)
- Visibility: owner sees all; members see unassigned tasks + their own
- Filter tabs: pending / completed / all
- Tasks surface on the calendar grid and in the Today dashboard widget

### Calendar
- Family calendar with manual event creation
- All-day events and timed events supported
- **Google Calendar two-way sync** — connect once via OAuth; events push/pull automatically
- Incremental sync via Google's `syncToken` (full re-sync on 410 Gone)

### Rewards
- Points leaderboard showing all household members ranked by total points
- Weekly points tracker
- Goals: set a target point total with a reward description (e.g. "Pick the Friday night movie")
- Goals can be marked private — only visible to the owner and the specific child
- Owner can mark goals as achieved, edit, or delete them

### Notes / Pinboard
- Sticky-note style cards with 6 colour choices
- Pin important notes to surface them on the dashboard
- Per-member authorship

### Kid accounts
- Kids log in with a 4-digit PIN — no email or password required
- On the login screen kids tap "I'm a kid", select their household, and enter their PIN
- Per-page permissions: owner controls what each kid can read or edit
- Kid accounts have their own theme colour

### Dashboard
- Personalised greeting with time-of-day awareness
- **Progress ring** — SVG arc showing today's chore completion (done / total)
- **Streak leaderboard** — rolling 30-day chore streak per member with medal ranks
- Due tasks widget (overdue + due today, with one-tap complete)
- Upcoming calendar events
- Pinned notes widget
- **Activity feed** — recent household actions (chore completions, task completions)
- Weekly points summary + all-time total

### Household management
- Invite family members via a shareable link
- Custody schedule setting (odd/even week) for split-custody households
- **Dark mode** toggle — persists across sessions, flash-free (reads from localStorage before hydration)
- **Themes** — choose from a range of colour themes including a dynamic time-of-day theme
- Sync Database button to apply schema updates after app upgrades
- **Data export/import** — download all household data as JSON; import into a self-hosted instance
- **PWA / installable** — add to home screen on Android and iOS; supports web push notifications

### Multi-household / instance admin
- The instance admin (set via `ADMIN_EMAIL` env var) gets an Admin panel in the nav
- Signup control: toggle new registrations on/off
- Household approval queue: require approval before new households can access the app
- Push notification broadcast: send a notification to all subscribed households

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.6 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui component library |
| Backend | PocketBase 0.38 — SQLite database with built-in REST API and auth |
| Infrastructure | Docker Compose |

---

## Getting started

### Option A — Docker (recommended for self-hosting)

**1. Clone the repo**

```bash
git clone https://github.com/ben0551/planner.git
cd planner
```

**2. Set up environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in your values — see [Environment variables](#environment-variables) below.

**3. Start the stack**

```bash
docker compose up -d
```

This starts:
- `planner-pb` — PocketBase on port `8090`
- `planner-app` — Next.js app on port `3000`

**4. Create your PocketBase superuser account**

Open `http://your-server-ip:8090/_/` and create an admin account. Use the **same email and password** you put in `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` — these credentials let Planner perform server-side operations.

**5. Set up the database schema**

```bash
PB_EMAIL=admin@example.com PB_PASSWORD=your-admin-password node pb/setup.mjs
```

Run once on a fresh install. After that, use **Settings → Sync Database** for upgrades.

**6. Register your account**

Open `http://your-server-ip:3000` and click "Create Account". The first user automatically creates a household and becomes the owner.

---

### Option B — Local development

**Prerequisites:** Node.js 20+, Docker (for PocketBase), Git

**1. Start PocketBase**

```bash
docker compose up pocketbase -d
```

**2. Create the PocketBase admin account**

Open `http://localhost:8090/_/` and create your superuser.

**3. Set up the database schema**

```bash
PB_EMAIL=admin@example.com PB_PASSWORD=your-admin-password node pb/setup.mjs
```

**4. Configure the app environment**

```bash
cp .env.example app/.env.local
```

Edit `app/.env.local` with your local values.

**5. Install dependencies and start the dev server**

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PB_INTERNAL_URL` | Yes | URL Next.js uses server-side to reach PocketBase. Docker: `http://pocketbase:8090`. Local dev: `http://localhost:8090` |
| `PB_ADMIN_EMAIL` | Yes | PocketBase superuser email (the account you created at `/_/`) |
| `PB_ADMIN_PASSWORD` | Yes | PocketBase superuser password |
| `ADMIN_EMAIL` | Recommended | Email of the Planner user who should have the admin panel (signup toggle, approval queue, push broadcasts). This is your regular app login email, **not** the PocketBase superuser email. Changing this takes effect on container restart — no rebuild needed. |
| `APP_URL` | For Google Calendar | Public URL of this app, e.g. `https://planner.example.com`. Used as the Google OAuth redirect URI. |
| `DOMAIN` | For Traefik | Your domain name, e.g. `planner.example.com` |
| `GOOGLE_CLIENT_ID` | Optional | Global Google OAuth client ID — only used as a fallback when there is a single household on the instance. Multi-household deployments should enter credentials per-household in Settings. |
| `GOOGLE_CLIENT_SECRET` | Optional | Global Google OAuth client secret (same fallback rule as above) |
| `VAPID_PUBLIC_KEY` | For push notifications | VAPID public key. Generate with: `node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(k)"` |
| `VAPID_PRIVATE_KEY` | For push notifications | VAPID private key (keep secret, server-side only) |
| `VAPID_SUBJECT` | For push notifications | `mailto:` or `https:` URI, e.g. `mailto:you@example.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push notifications | Same value as `VAPID_PUBLIC_KEY` — must be set separately so the browser can subscribe |

> **Note:** `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time. All other variables are read at runtime from the running container — no rebuild needed when you change them.

For local development, put these in `app/.env.local`.  
For Docker, put them in `.env` at the repo root.

### Google Calendar setup (per household)

Each household owner sets up their own Google OAuth credentials directly in **Settings → Google Calendar**:

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (type: Web application)
3. Add an authorised redirect URI: `https://your-domain/api/google-calendar/callback`
4. Copy the Client ID and Client Secret into Settings → Google Calendar → credentials form
5. Click **Connect Google Calendar** and authorise

This keeps credentials isolated per household. The global `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars act as a fallback only when there is exactly one household on the instance.

### Push notifications setup

Push notifications require HTTPS (works on your public domain; `localhost` also works as a browser exception).

1. Generate VAPID keys:
   ```bash
   node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k);"
   ```
2. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to your `.env`
3. Deploy and go to **Settings → Sync Database** to create the `push_subscriptions` collection
4. Users will be prompted to allow notifications on their next login

---

## How to use Planner

### First-time setup (owner)

1. Register at `/register` — this creates your household and makes you the owner
2. Go to **Settings** to configure your household
3. Go to **Settings → Members** to add family members:
   - **Invite adults**: copy the invite link — they register and join automatically
   - **Add child account**: enter the child's name, set a 4-digit PIN, and configure permissions

### Kid login

1. Tap **"I'm a kid — find my family"** on the login screen
2. Select your household
3. Enter your 4-digit PIN

### Keeping the schema up to date

After pulling a new version, go to **Settings → Sync Database**. Safe to run multiple times — only adds what's missing.

---

## Project structure

```
planner/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # Login and registration pages
│   │   │   ├── (dashboard)/      # Main app (requires auth)
│   │   │   │   ├── admin/        # Instance admin panel
│   │   │   │   ├── chores/
│   │   │   │   ├── meals/
│   │   │   │   ├── shopping/
│   │   │   │   ├── calendar/
│   │   │   │   ├── rewards/
│   │   │   │   ├── tasks/
│   │   │   │   ├── notes/
│   │   │   │   └── settings/
│   │   │   └── api/
│   │   │       ├── _pb-admin.ts          # PocketBase admin auth helper
│   │   │       ├── admin/                # Signup settings, household approvals
│   │   │       ├── google-calendar/      # OAuth flow + sync routes
│   │   │       ├── push/                 # Web push subscribe + send
│   │   │       ├── migrate/              # Schema migration endpoint
│   │   │       └── household-lookup/     # Kid login family lookup
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── nav.tsx           # Sidebar + mobile nav
│   │   │   └── pwa.tsx           # Service worker registration + push subscribe
│   │   ├── context/auth.tsx      # useAuth() hook
│   │   └── lib/
│   │       ├── pocketbase.ts     # PocketBase client + TypeScript types
│   │       ├── google-calendar.ts # Google Calendar API helpers
│   │       ├── themes.ts         # Theme definitions + dynamic theme
│   │       └── utils.ts
│   ├── public/
│   │   ├── manifest.webmanifest  # PWA manifest
│   │   ├── icon.svg              # App icon
│   │   └── sw.js                 # Service worker
│   ├── Dockerfile
│   └── package.json
├── pb/
│   ├── setup.mjs                 # One-time schema creation
│   └── pb_data/                  # PocketBase data (gitignored)
├── .github/                      # GitHub Actions CI
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Docker image

On every push to `main`, GitHub Actions builds and publishes to:

```
ghcr.io/ben0551/planner/planner-app:latest
```

---

## Chore recurrence reference

| Option | When it appears |
|---|---|
| None (one-off) | Once, on the due date you set |
| Daily | Every day |
| Weekly | Same day each week |
| Fortnightly | Every two weeks |
| Monthly | Same date each month |
| Odd weeks | Weeks with an odd ISO week number |
| Even weeks | Weeks with an even ISO week number |
| My week | Based on the custody schedule — alternates between parents |
