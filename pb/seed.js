#!/usr/bin/env node
/**
 * Homebase PocketBase seed script
 *
 * Creates all required collections. Safe to run multiple times — skips
 * collections that already exist.
 *
 * Prerequisites:
 *   - PocketBase running on localhost:8090 (docker compose up -d)
 *   - Node.js 18+
 *
 * Usage:
 *   node pb/seed.js <admin-email> <admin-password>
 *
 *   Or via env vars:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password node pb/seed.js
 */

const PB_URL = (process.env.PB_URL ?? "http://localhost:8090").replace(/\/$/, "");
const [, , emailArg, passwordArg] = process.argv;
const email = process.env.ADMIN_EMAIL ?? emailArg;
const password = process.env.ADMIN_PASSWORD ?? passwordArg;

if (!email || !password) {
  console.error("Usage: node pb/seed.js <admin-email> <admin-password>");
  console.error("       ADMIN_EMAIL=... ADMIN_PASSWORD=... node pb/seed.js");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request(path, options = {}) {
  const res = await fetch(`${PB_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { data });
  return data;
}

async function authenticate() {
  // Try PocketBase 0.22+ superusers API first, then fall back to legacy admins API.
  // We try both regardless of the error code so version differences don't block us.
  const paths = [
    "/collections/_superusers/auth-with-password",
    "/admins/auth-with-password",
  ];
  let lastErr;
  for (const path of paths) {
    try {
      const res = await request(path, {
        method: "POST",
        body: { identity: email, password },
      });
      return res.token;
    } catch (err) {
      console.error(`  [${path}] →`, JSON.stringify(err.data ?? err.message));
      lastErr = err;
    }
  }
  throw new Error(
    "Could not authenticate. Check the error details above.\n" +
    "  - Verify credentials by logging into http://localhost:8090/_/\n" +
    "  - Make sure PocketBase is running: docker compose up -d"
  );
}

async function getCollections(auth) {
  const res = await request("/collections?perPage=200", { headers: { Authorization: auth } });
  return res.items ?? [];
}

async function createCollection(auth, definition) {
  return request("/collections", {
    method: "POST",
    headers: { Authorization: auth },
    body: definition,
  });
}

// ---------------------------------------------------------------------------
// Collection definitions
// ---------------------------------------------------------------------------

function buildCollections({ householdsId, usersId, mealsId, choresId }) {
  // Access rule: logged-in user must be a member of the record's household
  const memberRule = (field = "household") =>
    `@request.auth.id != "" && ${field}.memberships_via_household.user ?= @request.auth.id`;

  return [
    // ------------------------------------------------------------------
    // households
    // ------------------------------------------------------------------
    {
      name: "households",
      type: "base",
      // Keep rules simple — memberships doesn't exist yet when this is created,
      // so back-relation rules would fail validation.
      listRule: "@request.auth.id != \"\"",
      viewRule: "@request.auth.id != \"\"",
      createRule: "@request.auth.id != \"\"",
      updateRule: "@request.auth.id != \"\"",
      deleteRule: null,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "text", name: "invite_token", required: true },
      ],
    },

    // ------------------------------------------------------------------
    // memberships
    // ------------------------------------------------------------------
    {
      name: "memberships",
      type: "base",
      listRule: "@request.auth.id != \"\"",
      viewRule: "@request.auth.id != \"\"",
      createRule: "@request.auth.id != \"\"",
      updateRule: `@request.auth.id != "" && household.memberships_via_household.user ?= @request.auth.id`,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "household",
          required: true,
          collectionId: householdsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "user",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          type: "select",
          name: "role",
          required: true,
          maxSelect: 1,
          values: ["owner", "member"],
        },
        // pin is set by a parent for child accounts; null = full password login
        { type: "text", name: "pin" },
      ],
    },

    // ------------------------------------------------------------------
    // chores
    // ------------------------------------------------------------------
    {
      name: "chores",
      type: "base",
      listRule: memberRule(),
      viewRule: memberRule(),
      createRule: memberRule(),
      updateRule: memberRule(),
      deleteRule: memberRule(),
      fields: [
        {
          type: "relation",
          name: "household",
          required: true,
          collectionId: householdsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "text", name: "title", required: true },
        {
          // single   = one person completes it, marks it done for everyone
          // everyone = every household member must mark their own completion
          // shared   = split between assigned members, anyone can tick off
          type: "select",
          name: "type",
          required: true,
          maxSelect: 1,
          values: ["single", "everyone", "shared"],
        },
        {
          type: "relation",
          name: "assignee",
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          type: "select",
          name: "recurrence",
          required: true,
          maxSelect: 1,
          values: ["none", "daily", "weekly", "fortnightly", "monthly"],
        },
        { type: "date", name: "due_date" },
        // completed is only meaningful for "single" and "shared" type chores
        { type: "bool", name: "completed" },
      ],
    },

    // ------------------------------------------------------------------
    // chore_completions  (tracks per-user completion for "everyone" chores)
    // ------------------------------------------------------------------
    {
      name: "chore_completions",
      type: "base",
      listRule: "@request.auth.id != \"\"",
      viewRule: "@request.auth.id != \"\"",
      createRule: "@request.auth.id != \"\"",
      updateRule: "@request.auth.id = user",
      deleteRule: "@request.auth.id = user",
      fields: [
        {
          type: "relation",
          name: "chore",
          required: true,
          collectionId: choresId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "user",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        // date of completion (date portion only); allows per-day tracking for recurring chores
        { type: "date", name: "date", required: true },
      ],
    },

    // ------------------------------------------------------------------
    // meals
    // ------------------------------------------------------------------
    {
      name: "meals",
      type: "base",
      listRule: memberRule(),
      viewRule: memberRule(),
      createRule: memberRule(),
      updateRule: memberRule(),
      deleteRule: memberRule(),
      fields: [
        {
          type: "relation",
          name: "household",
          required: true,
          collectionId: householdsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "date", name: "date", required: true },
        {
          type: "select",
          name: "meal_type",
          required: true,
          maxSelect: 1,
          values: ["breakfast", "lunch", "dinner"],
        },
        { type: "text", name: "recipe_name", required: true },
        { type: "text", name: "notes" },
      ],
    },

    // ------------------------------------------------------------------
    // shopping_items
    // ------------------------------------------------------------------
    {
      name: "shopping_items",
      type: "base",
      listRule: memberRule(),
      viewRule: memberRule(),
      createRule: memberRule(),
      updateRule: memberRule(),
      deleteRule: memberRule(),
      fields: [
        {
          type: "relation",
          name: "household",
          required: true,
          collectionId: householdsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "text", name: "name", required: true },
        { type: "text", name: "quantity" },
        { type: "text", name: "category" },
        { type: "bool", name: "checked" },
        // optional link back to the meal that prompted adding this item
        ...(mealsId
          ? [{ type: "relation", name: "meal", collectionId: mealsId, maxSelect: 1, cascadeDelete: false }]
          : []),
      ],
    },

    // ------------------------------------------------------------------
    // calendar_events
    // ------------------------------------------------------------------
    {
      name: "calendar_events",
      type: "base",
      listRule: memberRule(),
      viewRule: memberRule(),
      createRule: memberRule(),
      updateRule: memberRule(),
      deleteRule: memberRule(),
      fields: [
        {
          type: "relation",
          name: "household",
          required: true,
          collectionId: householdsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "text", name: "title", required: true },
        { type: "date", name: "start", required: true },
        { type: "date", name: "end" },
        { type: "bool", name: "all_day" },
        {
          type: "select",
          name: "source",
          required: true,
          maxSelect: 1,
          values: ["manual", "google", "outlook"],
        },
        { type: "text", name: "external_id" },
        { type: "text", name: "notes" },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Connecting to PocketBase at ${PB_URL} …`);

  const token = await authenticate();
  const auth = `Bearer ${token}`;
  console.log("Authenticated.\n");

  const existing = await getCollections(auth);
  const byName = Object.fromEntries(existing.map((c) => [c.name, c]));

  // Resolve known collection IDs (may be null if not yet created)
  function resolveId(name) {
    return byName[name]?.id ?? null;
  }

  // We create in dependency order: households → memberships → chores →
  // chore_completions → meals → shopping_items → calendar_events
  //
  // Because some IDs aren't known until creation, we build definitions
  // incrementally and refresh the byName map after each creation.

  const ORDER = [
    "households",
    "memberships",
    "chores",
    "chore_completions",
    "meals",
    "shopping_items",
    "calendar_events",
  ];

  for (const name of ORDER) {
    if (byName[name]) {
      console.log(`  skip     ${name}`);
      continue;
    }

    const usersId = byName["users"]?.id ?? "_pb_users_auth_";
    const householdsId = byName["households"]?.id ?? null;
    const mealsId = byName["meals"]?.id ?? null;
    const choresId = byName["chores"]?.id ?? null;

    const definitions = buildCollections({ householdsId, usersId, mealsId, choresId });
    const def = definitions.find((d) => d.name === name);

    if (!def) {
      console.warn(`  warn     no definition for "${name}", skipping`);
      continue;
    }

    try {
      const created = await createCollection(auth, def);
      byName[name] = created;
      console.log(`  created  ${name}`);
    } catch (err) {
      console.error(`  FAILED   ${name}: ${err.message}`);
      if (err.data) console.error("           ", JSON.stringify(err.data, null, 2));
      process.exit(1);
    }
  }

  console.log("\nDone. All collections are ready.");
  console.log("\nNext steps:");
  console.log("  1. Go to http://localhost:8090/_/ and verify the collections.");
  console.log("  2. Start the app:  cd app && npm run dev");
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
