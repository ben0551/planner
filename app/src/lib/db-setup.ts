import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";

const PB_USERS_ID = "_pb_users_auth_";

async function pbApi(token: string, path: string, method = "GET", body?: object) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

function hasField(fields: any[], name: string) {
  return fields.some((f: any) => f.name === name);
}

function rel(collectionId: string) {
  return { type: "relation", collectionId, maxSelect: 1, options: { collectionId, maxSelect: 1 } };
}

function sel(values: string[]) {
  return { type: "select", values, options: { values } };
}

export async function ensureSchema(): Promise<string[]> {
  let token: string;
  try {
    token = await getPbAdminToken();
  } catch (err: any) {
    return [`Schema setup skipped: ${err.message}`];
  }

  const log: string[] = [];

  const allCollections = await pbApi(token, "collections?perPage=200");
  const byName: Record<string, any> = {};
  for (const c of allCollections.items ?? []) byName[c.name] = c;

  async function ensureCollection(def: { name: string; fields: any[] }): Promise<string> {
    if (byName[def.name]) return byName[def.name].id as string;
    const created = await pbApi(token, "collections", "POST", { ...def, type: "base" });
    byName[created.name] = created;
    log.push(`Created collection: ${created.name}`);
    return created.id as string;
  }

  async function addMissingFields(name: string, newFields: any[]) {
    const col = byName[name];
    if (!col) return;
    const existing: any[] = col.fields ?? col.schema ?? [];
    const toAdd = newFields.filter((f) => !hasField(existing, f.name));
    if (toAdd.length === 0) return;
    const updated = [...existing, ...toAdd];
    await pbApi(token, `collections/${col.id}`, "PATCH", { fields: updated });
    toAdd.forEach((f) => log.push(`${name}: added field ${f.name}`));
    byName[name] = { ...col, fields: updated };
  }

  // ── create missing collections (order matters for relations) ──

  const householdsId = await ensureCollection({
    name: "households",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "invite_token", type: "text", required: true },
      { name: "custody_week", type: "text" },
    ],
  });

  await ensureCollection({
    name: "memberships",
    fields: [
      { name: "user", ...rel(PB_USERS_ID), required: true },
      { name: "household", ...rel(householdsId), required: true },
      { name: "role", ...sel(["owner", "member"]), required: true },
      { name: "pin", type: "text" },
      { name: "permissions", type: "json" },
      { name: "theme", type: "text" },
    ],
  });

  const choresId = await ensureCollection({
    name: "chores",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "title", type: "text", required: true },
      { name: "type", ...sel(["single", "everyone", "shared"]) },
      { name: "scope", type: "text" },
      { name: "assignee", ...rel(PB_USERS_ID) },
      { name: "recurrence", ...sel(["none", "daily", "weekly", "fortnightly", "monthly", "odd_week", "even_week", "my_week"]) },
      { name: "due_date", type: "text" },
      { name: "deadline_time", type: "text" },
      { name: "completed", type: "bool" },
      { name: "points", type: "number" },
    ],
  });

  await ensureCollection({
    name: "chore_completions",
    fields: [
      { name: "chore", ...rel(choresId) },
      { name: "user", ...rel(PB_USERS_ID) },
      { name: "date", type: "text" },
      { name: "points", type: "number" },
    ],
  });

  const mealsId = await ensureCollection({
    name: "meals",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "date", type: "text", required: true },
      { name: "meal_type", type: "text" },
      { name: "recipe_name", type: "text", required: true },
      { name: "notes", type: "text" },
    ],
  });

  await ensureCollection({
    name: "meal_recipes",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "name", type: "text", required: true },
      { name: "meal_type", type: "text" },
      { name: "category", type: "text" },
      { name: "notes", type: "text" },
      { name: "ingredients", type: "text" },
      { name: "url", type: "text" },
    ],
  });

  await ensureCollection({
    name: "shopping_items",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "name", type: "text", required: true },
      { name: "quantity", type: "text" },
      { name: "category", type: "text" },
      { name: "checked", type: "bool" },
      { name: "meal", ...rel(mealsId) },
      { name: "added_by", ...rel(PB_USERS_ID) },
      { name: "good_price", type: "text" },
      { name: "meal_note", type: "text" },
    ],
  });

  await ensureCollection({
    name: "goals",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "user", ...rel(PB_USERS_ID) },
      { name: "title", type: "text", required: true },
      { name: "target_points", type: "number" },
      { name: "reward_description", type: "text" },
      { name: "achieved", type: "bool" },
      { name: "private", type: "bool" },
    ],
  });

  await ensureCollection({
    name: "calendar_events",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "title", type: "text", required: true },
      { name: "start", type: "text", required: true },
      { name: "end", type: "text" },
      { name: "all_day", type: "bool" },
      { name: "source", type: "text" },
      { name: "external_id", type: "text" },
      { name: "notes", type: "text" },
    ],
  });

  await ensureCollection({
    name: "tasks",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "title", type: "text", required: true },
      { name: "due_date", type: "text" },
      { name: "notes", type: "text" },
      { name: "completed", type: "bool" },
      { name: "assigned_to", ...rel(PB_USERS_ID) },
      { name: "created_by", ...rel(PB_USERS_ID) },
    ],
  });

  await ensureCollection({
    name: "notes",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "user", ...rel(PB_USERS_ID) },
      { name: "content", type: "text", required: true },
      { name: "color", type: "text" },
      { name: "pinned", type: "bool" },
    ],
  });

  await ensureCollection({
    name: "activity_log",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "user", ...rel(PB_USERS_ID) },
      { name: "description", type: "text", required: true },
      { name: "entity_type", type: "text" },
      { name: "entity_id", type: "text" },
    ],
  });

  // google_tokens: admin-only (no rules set), stores OAuth refresh tokens per household
  await ensureCollection({
    name: "google_tokens",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "refresh_token", type: "text" },
      { name: "calendar_id", type: "text" },
      { name: "sync_token", type: "text" },
    ],
  });

  // ── add fields missing from existing collections (upgrades) ──

  await addMissingFields("households", [{ name: "custody_week", type: "text" }]);
  await addMissingFields("memberships", [
    { name: "permissions", type: "json" },
    { name: "theme", type: "text" },
    { name: "pin", type: "text" },
  ]);
  await addMissingFields("chores", [
    { name: "type", ...sel(["single", "everyone", "shared"]) },
    { name: "scope", type: "text" },
    { name: "deadline_time", type: "text" },
  ]);
  await addMissingFields("meals", [{ name: "meal_type", type: "text" }]);
  await addMissingFields("meal_recipes", [
    { name: "category", type: "text" },
    { name: "url", type: "text" },
    { name: "meal_type", type: "text" },
    { name: "ingredients", type: "text" },
  ]);
  await addMissingFields("goals", [{ name: "private", type: "bool" }]);
  await addMissingFields("tasks", [
    { name: "recurrence", ...sel(["none", "daily", "weekly", "monthly"]) },
    { name: "last_completed", type: "text" },
  ]);
  await addMissingFields("shopping_items", [
    { name: "added_by", ...rel(PB_USERS_ID) },
    { name: "good_price", type: "text" },
    { name: "meal_note", type: "text" },
  ]);

  // chores recurrence — add new option values if missing
  const choresCol = byName["chores"];
  if (choresCol) {
    const fields: any[] = choresCol.fields ?? choresCol.schema ?? [];
    const recIdx = fields.findIndex((f: any) => f.name === "recurrence");
    if (recIdx >= 0) {
      const field = fields[recIdx];
      const current: string[] = field.values ?? field.options?.values ?? [];
      const needed = ["odd_week", "even_week", "my_week"];
      const missing = needed.filter((v) => !current.includes(v));
      if (missing.length > 0) {
        const merged = [...current, ...missing];
        const updated = [...fields];
        updated[recIdx] = { ...field, values: merged, options: { ...(field.options ?? {}), values: merged } };
        await pbApi(token, `collections/${choresCol.id}`, "PATCH", { fields: updated });
        log.push(`chores: added recurrence values: ${missing.join(", ")}`);
      }
    }
  }

  // ── ensure API rules ──

  // re-fetch collections so we have fresh rule state
  const freshCollections = await pbApi(token, "collections?perPage=200");
  const fresh: Record<string, any> = {};
  for (const c of freshCollections.items ?? []) fresh[c.name] = c;

  // users collection: allow public registration + allow auth users to view (needed for member name expand)
  const usersCol = fresh["users"] ?? freshCollections.items?.find((c: any) => c.id === "_pb_users_auth_");
  if (usersCol) {
    const patch: Record<string, string> = {};
    if (usersCol.createRule !== "") patch.createRule = "";
    if (usersCol.viewRule !== '@request.auth.id != ""') patch.viewRule = '@request.auth.id != ""';
    if (Object.keys(patch).length > 0) {
      await pbApi(token, `collections/${usersCol.id}`, "PATCH", patch);
      if (patch.createRule !== undefined) log.push("users: set createRule to public");
      if (patch.viewRule !== undefined) log.push("users: set viewRule to authenticated");
    }
  }

  // all app collections: allow authenticated users
  const AUTH = '@request.auth.id != ""';
  const appCols = ["households", "memberships", "chores", "chore_completions", "meals", "meal_recipes", "shopping_items", "goals", "calendar_events", "tasks", "notes", "activity_log"];
  for (const name of appCols) {
    const col = fresh[name];
    if (!col) continue;
    if (col.listRule === null || col.viewRule === null || col.createRule === null || col.updateRule === null || col.deleteRule === null) {
      await pbApi(token, `collections/${col.id}`, "PATCH", {
        listRule: AUTH,
        viewRule: AUTH,
        createRule: AUTH,
        updateRule: AUTH,
        deleteRule: AUTH,
      });
      log.push(`${name}: set API rules to authenticated`);
    }
  }

  // fix emailVisibility on child accounts
  try {
    const pinMembers = await pbApi(
      token,
      `collections/memberships/records?filter=${encodeURIComponent('pin!=""')}&expand=user&perPage=200`,
    );
    for (const m of pinMembers.items ?? []) {
      const uid = m.expand?.user?.id ?? m.user;
      if (uid && m.expand?.user?.emailVisibility === false) {
        await pbApi(token, `collections/users/records/${uid}`, "PATCH", { emailVisibility: true });
        log.push(`users: fixed emailVisibility for ${m.expand?.user?.email ?? uid}`);
      }
    }
  } catch {
    // memberships might not exist yet on very first run — ignore
  }

  if (log.length === 0) log.push("All schema up to date.");
  return log;
}
