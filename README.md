# HomeBase

Household planner — chores, meals, shopping, calendar.

## Stack
- **PocketBase** (backend, auth, real-time)
- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS + shadcn/ui**

## Getting started

### 1. Start PocketBase
```bash
docker compose up -d
```
PocketBase admin UI: http://localhost:8090/_

On first launch, create your admin account there.

### 2. Set up the database schema
```bash
cd pb
PB_EMAIL=admin@example.com PB_PASSWORD=yourpassword node setup.mjs
```

### 3. Run the Next.js app
```bash
cd app
npm run dev
```
App: http://localhost:3000

Register at `/register` — the first user creates a household and becomes the owner.  
Invite family members via **Settings → Invite member**.

## NAS deployment
Add the `app` service to `docker-compose.yml` once ready to ship.
