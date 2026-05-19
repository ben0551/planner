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
- Items have categories and optional quantities
- Tick items off as you shop; clear checked items in bulk
- Items can be linked to a specific meal

### Calendar
- Family calendar with manual event creation
- All-day events and timed events supported

### Rewards
- Points leaderboard showing all household members ranked by total points
- Weekly points tracker
- Goals: set a target point total with a reward description (e.g. "Pick the Friday night movie")
- Goals can be marked private — only visible to the owner and the specific child
- Owner can mark goals as achieved, edit, or delete them

### Kid accounts
- Kids log in with a 4-digit PIN — no email or password required
- On the login screen kids tap "I'm a kid", select their household, and enter their PIN
- Per-page permissions: owner controls what each kid can read or edit
- Kid accounts have their own theme colour

### Household management
- Invite family members via a shareable link
- Custody schedule setting (odd/even week) for split-custody households
- Sync Database button to apply schema updates after app upgrades

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

This runs both PocketBase and the Next.js app in containers.

**1. Clone the repo**

```bash
git clone https://github.com/ben0551/planner.git
cd planner
```

**2. Set up environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# The URL where PocketBase will be accessible — use your server's IP or domain for production
NEXT_PUBLIC_POCKETBASE_URL=http://your-server-ip:8090

# Your PocketBase superuser credentials — the account you create in the admin panel
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=your-admin-password
```

**3. Start the stack**

```bash
docker compose up -d
```

This starts:
- `planner-pb` — PocketBase on port `8090`
- `planner-app` — Next.js app on port `3000`

The app waits for PocketBase to pass its health check before starting.

**4. Create your PocketBase superuser account**

Open `http://your-server-ip:8090/_/` in a browser and create an admin account. Use the **same email and password** you put in `.env` — these credentials let Planner perform server-side operations like PIN resets and kid login lookups.

**5. Set up the database schema**

```bash
PB_EMAIL=admin@example.com PB_PASSWORD=your-admin-password node pb/setup.mjs
```

This creates all the collections (chores, meals, shopping, etc.) in PocketBase. Run it once on a fresh install only.

**6. Register your account**

Open `http://your-server-ip:3000` and click "Create Account". The first user automatically creates a household and becomes the owner.

---

### Option B — Local development

**Prerequisites:** Node.js 20+, Docker (for PocketBase), Git

**1. Start PocketBase**

```bash
docker compose up pocketbase -d
```

Or run the PocketBase binary directly if you have it:

```bash
./pocketbase serve --dir=./pb/pb_data
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

Edit `app/.env.local`:

```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=your-admin-password
```

**5. Install dependencies and start the dev server**

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## How to use Planner

### First-time setup (owner)

1. Register at `/register` — this creates your household and makes you the owner
2. Go to **Settings** to set your household name and custody schedule (if relevant)
3. Go to **Settings → Members** to add family members:
   - **Invite adults**: copy the invite link and send it — they register and join your household automatically
   - **Add child account**: enter the child's name, set a 4-digit PIN, and configure their permissions

### Daily use — adults

- **Today's chores**: the Chores tab shows this week. Tap a chore to mark it done. Tap again to undo.
- **Admin panel**: tap the shield icon in the Chores header to open the admin view. See each kid's chores for any day and toggle them directly.
- **Meals**: tap any meal slot in the weekly planner to add a meal. Use the Recipe Library to save meals for quick access.
- **Shopping**: add items as you think of them. Tick them off while shopping.
- **Rewards**: watch the leaderboard update as kids complete chores. Set goals with rewards to motivate them.

### Kid login

Kids don't need an email or password. On the login screen:

1. Tap **"I'm a kid — find my family"**
2. Select your household (usually only one option)
3. Enter your 4-digit PIN

### Keeping the schema up to date

After pulling a new version of Planner, go to **Settings → Sync Database**. This applies any schema changes to your PocketBase instance. It's safe to run multiple times — it only adds what's missing.

---

## Environment variables

| Variable | Where it's used | Description |
|---|---|---|
| `NEXT_PUBLIC_POCKETBASE_URL` | Browser + server | Full URL to your PocketBase instance |
| `PB_ADMIN_EMAIL` | Server-side only | PocketBase superuser email |
| `PB_ADMIN_PASSWORD` | Server-side only | PocketBase superuser password |

`PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` are only used by server-side API routes (PIN reset, kid login lookup, schema migration). They are never sent to the browser.

For local development, put these in `app/.env.local`.  
For Docker, put them in `.env` at the repo root.

---

## Project structure

```
planner/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # Login and registration pages
│   │   │   │   ├── login/        # Email login + kid PIN login
│   │   │   │   └── register/     # New account + household creation
│   │   │   ├── (dashboard)/      # Main app (requires auth)
│   │   │   │   ├── chores/       # Chore management + admin panel
│   │   │   │   ├── meals/        # Weekly meal planner + recipe library
│   │   │   │   ├── shopping/     # Shared shopping list
│   │   │   │   ├── calendar/     # Family calendar
│   │   │   │   ├── rewards/      # Leaderboard + goals
│   │   │   │   └── settings/     # Household settings + member management
│   │   │   └── api/              # Server-side API routes
│   │   │       ├── _pb-admin.ts  # Shared PocketBase admin auth helper
│   │   │       ├── migrate/      # Schema migration endpoint
│   │   │       ├── reset-pin/    # PIN reset endpoint
│   │   │       └── household-lookup/ # Kid login family lookup
│   │   ├── components/ui/        # shadcn/ui components
│   │   ├── context/
│   │   │   └── auth.tsx          # useAuth() — user, membership, householdId
│   │   └── lib/
│   │       ├── pocketbase.ts     # PocketBase client + all TypeScript types
│   │       └── utils.ts
│   ├── Dockerfile
│   └── package.json
├── pb/
│   ├── setup.mjs                 # One-time database schema creation script
│   └── pb_data/                  # PocketBase data directory (gitignored)
├── .github/                      # GitHub Actions (Docker image build + publish)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Docker image

On every push to `main`, GitHub Actions builds and publishes the app image to:

```
ghcr.io/ben0551/planner/planner-app:latest
```

To build locally:

```bash
cd app
docker build -t planner-app .
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

Odd/even weeks use ISO week numbers (absolute, no drift). "My week" uses the household's `custody_week` setting (odd or even) to determine which parent is "on".
