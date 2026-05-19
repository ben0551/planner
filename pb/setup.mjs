/**
 * Run this script ONCE after first launch to create all PocketBase collections.
 * Usage: node pb/setup.mjs
 *
 * Prerequisites:
 *   1. PocketBase running at http://localhost:8090
 *   2. Admin account created at http://localhost:8090/_/
 *   3. Set env vars: PB_EMAIL and PB_PASSWORD (your admin credentials)
 */

const PB_URL = process.env.PB_URL ?? "http://localhost:8090";
const PB_EMAIL = process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_PASSWORD;

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error("Set PB_EMAIL and PB_PASSWORD environment variables.");
  process.exit(1);
}

async function api(path, method = "GET", body) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

let token = "";

async function main() {
  // Authenticate as admin
  const auth = await api("admins/auth-with-password", "POST", {
    identity: PB_EMAIL,
    password: PB_PASSWORD,
  });
  token = auth.token;
  console.log("Authenticated as admin.");

  const collections = [
    {
      name: "households",
      type: "base",
      schema: [
        { name: "name", type: "text", required: true },
        { name: "invite_token", type: "text", required: true },
      ],
    },
    {
      name: "memberships",
      type: "base",
      schema: [
        { name: "user", type: "relation", options: { collectionId: "_pb_users_auth_", maxSelect: 1 }, required: true },
        { name: "household", type: "relation", options: { collectionId: "households", maxSelect: 1 }, required: true },
        { name: "role", type: "select", options: { values: ["owner", "member"] }, required: true },
      ],
    },
    {
      name: "chores",
      type: "base",
      schema: [
        { name: "household", type: "relation", options: { collectionId: "households", maxSelect: 1 }, required: true },
        { name: "title", type: "text", required: true },
        { name: "emoji", type: "text" },
        { name: "assignee", type: "relation", options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "recurrence", type: "select", options: { values: ["none", "daily", "weekly", "fortnightly", "monthly"] } },
        { name: "due_date", type: "date" },
        { name: "completed", type: "bool" },
        { name: "points", type: "number", options: { min: 0 } },
      ],
    },
    {
      name: "meals",
      type: "base",
      schema: [
        { name: "household", type: "relation", options: { collectionId: "households", maxSelect: 1 }, required: true },
        { name: "date", type: "date", required: true },
        { name: "recipe_name", type: "text", required: true },
        { name: "notes", type: "text" },
      ],
    },
    {
      name: "shopping_items",
      type: "base",
      schema: [
        { name: "household", type: "relation", options: { collectionId: "households", maxSelect: 1 }, required: true },
        { name: "name", type: "text", required: true },
        { name: "quantity", type: "text" },
        { name: "category", type: "text" },
        { name: "checked", type: "bool" },
        { name: "meal", type: "relation", options: { collectionId: "meals", maxSelect: 1 } },
      ],
    },
    {
      name: "events",
      type: "base",
      schema: [
        { name: "household", type: "relation", options: { collectionId: "households", maxSelect: 1 }, required: true },
        { name: "title", type: "text", required: true },
        { name: "start", type: "date", required: true },
        { name: "end", type: "date" },
        { name: "all_day", type: "bool" },
        { name: "source", type: "select", options: { values: ["manual", "google", "outlook"] } },
        { name: "external_id", type: "text" },
        { name: "notes", type: "text" },
      ],
    },
    {
      name: "rewards",
      type: "base",
      schema: [
        { name: "household", type: "relation", options: { collectionId: "households", maxSelect: 1 }, required: true },
        { name: "user", type: "relation", options: { collectionId: "_pb_users_auth_", maxSelect: 1 }, required: true },
        { name: "points", type: "number", options: { min: 0 } },
      ],
    },
  ];

  for (const col of collections) {
    try {
      await api("collections", "POST", col);
      console.log(`Created collection: ${col.name}`);
    } catch (e) {
      if (e.message.includes("already exists")) {
        console.log(`Skipped (exists): ${col.name}`);
      } else {
        console.error(`Failed ${col.name}:`, e.message);
      }
    }
  }

  console.log("\nDone. Open http://localhost:8090/_ to review collections.");
}

main().catch((e) => { console.error(e); process.exit(1); });
