/**
 * Migration script — adds new fields to existing collections.
 * Safe to run multiple times (skips fields that already exist).
 *
 * Usage:
 *   PB_EMAIL=admin@example.com PB_PASSWORD=yourpassword node pb/migrate.mjs
 */

const PB_URL = process.env.PB_URL ?? "http://localhost:8090";
const PB_EMAIL = process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_PASSWORD;

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error("Set PB_EMAIL and PB_PASSWORD environment variables.");
  process.exit(1);
}

let token = "";

async function api(path, method = "GET", body) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

async function getCollection(name) {
  const list = await api("collections?perPage=200");
  return list.items.find((c) => c.name === name);
}

async function addFieldIfMissing(collectionId, currentSchema, newField) {
  const exists = currentSchema.some((f) => f.name === newField.name);
  if (exists) {
    console.log(`  ↳ Field "${newField.name}" already exists, skipping.`);
    return false;
  }
  return true;
}

async function main() {
  const auth = await api("collections/_superusers/auth-with-password", "POST", {
    identity: PB_EMAIL,
    password: PB_PASSWORD,
  });
  token = auth.token;
  console.log("Authenticated.\n");

  // ── memberships: add permissions (JSON) field ──
  {
    const col = await getCollection("memberships");
    if (!col) { console.error("Collection 'memberships' not found."); }
    else {
      const schema = col.fields ?? col.schema ?? [];
      const needsPermissions = await addFieldIfMissing(col.id, schema, { name: "permissions" });
      if (needsPermissions) {
        const updated = [...schema, { name: "permissions", type: "json" }];
        await api(`collections/${col.id}`, "PATCH", { fields: updated });
        console.log("memberships: added 'permissions' field.");
      }
    }
  }

  // ── chores: add deadline_time (text) field ──
  {
    const col = await getCollection("chores");
    if (!col) { console.error("Collection 'chores' not found."); }
    else {
      const schema = col.fields ?? col.schema ?? [];
      const needsDeadline = await addFieldIfMissing(col.id, schema, { name: "deadline_time" });
      if (needsDeadline) {
        const updated = [...schema, { name: "deadline_time", type: "text" }];
        await api(`collections/${col.id}`, "PATCH", { fields: updated });
        console.log("chores: added 'deadline_time' field.");
      }
    }
  }

  // ── meal_recipes: add category and url fields ──
  {
    const col = await getCollection("meal_recipes");
    if (!col) { console.error("Collection 'meal_recipes' not found."); }
    else {
      const schema = col.fields ?? col.schema ?? [];
      for (const field of [{ name: "category", type: "text" }, { name: "url", type: "url" }]) {
        const needs = await addFieldIfMissing(col.id, schema, field);
        if (needs) {
          const updated = [...schema, field];
          await api(`collections/${col.id}`, "PATCH", { fields: updated });
          console.log(`meal_recipes: added '${field.name}' field.`);
        }
      }
    }
  }

  console.log("\nMigration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
