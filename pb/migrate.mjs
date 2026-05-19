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

  // ── chores: add deadline_time (text) field + odd_week/even_week recurrence values ──
  {
    const col = await getCollection("chores");
    if (!col) { console.error("Collection 'chores' not found."); }
    else {
      const schema = col.fields ?? col.schema ?? [];

      // Add deadline_time if missing
      const needsDeadline = await addFieldIfMissing(col.id, schema, { name: "deadline_time" });

      // Extend recurrence select to include odd_week / even_week / my_week
      const recurrenceField = schema.find((f) => f.name === "recurrence");
      const currentValues = recurrenceField?.options?.values ?? recurrenceField?.values ?? [];
      const newRecurrenceValues = ["odd_week", "even_week", "my_week"];
      const needsRecurrenceUpdate = newRecurrenceValues.some((v) => !currentValues.includes(v));

      if (needsDeadline || needsRecurrenceUpdate) {
        const updated = schema.map((f) => {
          if (f.name === "recurrence") {
            const values = [...new Set([...currentValues, ...newRecurrenceValues])];
            return { ...f, options: { ...(f.options ?? {}), values } };
          }
          return f;
        });
        if (needsDeadline) updated.push({ name: "deadline_time", type: "text" });
        await api(`collections/${col.id}`, "PATCH", { fields: updated });
        if (needsDeadline) console.log("chores: added 'deadline_time' field.");
        if (needsRecurrenceUpdate) console.log("chores: added odd_week / even_week / my_week recurrence values.");
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

  // ── households: add custody_week (text) field ──
  {
    const col = await getCollection("households");
    if (!col) { console.error("Collection 'households' not found."); }
    else {
      const schema = col.fields ?? col.schema ?? [];
      const needs = await addFieldIfMissing(col.id, schema, { name: "custody_week" });
      if (needs) {
        const updated = [...schema, { name: "custody_week", type: "text" }];
        await api(`collections/${col.id}`, "PATCH", { fields: updated });
        console.log("households: added 'custody_week' field.");
      }
    }
  }

  // ── memberships: add theme (text) field ──
  {
    const col = await getCollection("memberships");
    if (!col) { console.error("Collection 'memberships' not found."); }
    else {
      const schema = col.fields ?? col.schema ?? [];
      const needs = await addFieldIfMissing(col.id, schema, { name: "theme" });
      if (needs) {
        const existing = schema.filter((f) => f.name !== "permissions"); // already added
        // Also re-add permissions if not there yet (idempotent)
        const needsPerms = await addFieldIfMissing(col.id, schema, { name: "permissions" });
        const updated = [...schema];
        if (needsPerms) updated.push({ name: "permissions", type: "json" });
        updated.push({ name: "theme", type: "text" });
        await api(`collections/${col.id}`, "PATCH", { fields: updated });
        console.log("memberships: added 'theme' field.");
      }
    }
  }

  console.log("\nMigration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
