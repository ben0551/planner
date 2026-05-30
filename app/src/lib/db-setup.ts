import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";

const PB_USERS_ID = "_pb_users_auth_";

export function makeSlug(householdName: string): string {
  const parts = householdName.trim().toLowerCase().split(/\s+/);
  const base = (parts[0] === "the" && parts[1] ? parts[1] : parts[0])
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10) || "family";
  const rand = Math.random().toString(36).slice(2, 5);
  return base + rand;
}

async function generateUniqueSlug(householdName: string, token: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = makeSlug(householdName);
    const res = await fetch(`${PB_URL}/api/collections/households/records?filter=${encodeURIComponent(`slug="${slug}"`)}&perPage=1&skipTotal=1`, { headers: { Authorization: token } });
    const data = await res.json();
    if (!data.items?.length) return slug;
  }
  return "family" + Math.random().toString(36).slice(2, 7);
}

async function pbApi(token: string, path: string, method = "GET", body?: object) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Read as text first — some PocketBase versions return `null` or an empty body
  // for certain PATCH operations, which breaks res.json() with a parse error.
  const text = await res.text();
  let json: any = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      // OK response but non-JSON body (e.g. 204 No Content) — treat as success
    }
  }
  if (!res.ok) throw new Error(JSON.stringify(json ?? { status: res.status }));
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

  // Collections that should have authenticated-only access
  const AUTH_COLS = new Set(["households", "memberships", "chores", "chore_completions", "meals", "meal_recipes", "shopping_lists", "shopping_items", "shopping_catalog", "goals", "calendar_events", "tasks", "notes", "activity_log", "balance_transactions", "push_subscriptions", "bookmarks"]);
  const AUTH_RULE = '@request.auth.id != ""';

  async function addMissingFields(name: string, newFields: any[]) {
    const col = byName[name];
    if (!col) return;
    const existing: any[] = col.fields ?? col.schema ?? [];
    let updated = [...existing, ...newFields.filter((f) => !hasField(existing, f.name))];
    let needsUpdate = updated.length > existing.length;

    // Also repair relation fields that exist but point to the wrong collectionId
    for (const newF of newFields) {
      if (newF.type !== "relation" || !newF.collectionId) continue;
      const idx = updated.findIndex((f: any) => f.name === newF.name);
      if (idx < 0) continue;
      const existF = updated[idx];
      if (existF.collectionId !== newF.collectionId) {
        updated[idx] = { ...existF, collectionId: newF.collectionId, options: { ...(existF.options ?? {}), collectionId: newF.collectionId } };
        log.push(`${name}: repaired ${newF.name} relation (collectionId was ${existF.collectionId})`);
        needsUpdate = true;
      }
    }

    if (!needsUpdate) return;
    const toAdd = newFields.filter((f) => !hasField(existing, f.name));
    const ruleFields = AUTH_COLS.has(name)
      ? { listRule: AUTH_RULE, viewRule: AUTH_RULE, createRule: AUTH_RULE, updateRule: AUTH_RULE, deleteRule: AUTH_RULE }
      : {};
    try {
      await pbApi(token, `collections/${col.id}`, "PATCH", { schema: updated, fields: updated, ...ruleFields });
      toAdd.forEach((f) => log.push(`${name}: added field ${f.name}`));
      byName[name] = { ...col, schema: updated, fields: updated };
    } catch (err: any) {
      log.push(`WARNING: ${name}: could not update fields — ${String(err.message).slice(0, 120)}`);
    }
  }

  // ── create missing collections (order matters for relations) ──

  const householdsId = await ensureCollection({
    name: "households",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "invite_token", type: "text", required: true },
      { name: "slug", type: "text" },
      { name: "custody_week", type: "text" },
      { name: "week_start", type: "text" },
      { name: "kids_can_check_shopping", type: "bool" },
      { name: "status", type: "text" },
    ],
  });

  const membershipsId = await ensureCollection({
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
      { name: "days", type: "text" },
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

  const shoppingListsId = await ensureCollection({
    name: "shopping_lists",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "name", type: "text", required: true },
      { name: "archived", type: "bool" },
      { name: "archived_at", type: "text" },
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
    name: "shopping_catalog",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "name", type: "text", required: true },
      { name: "category", type: "text" },
      { name: "good_price", type: "text" },
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
    name: "bookmarks",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "name", type: "text", required: true },
      { name: "url", type: "text", required: true },
      { name: "emoji", type: "text" },
      { name: "description", type: "text" },
      { name: "visibility", type: "text" },
      { name: "created_by", ...rel(PB_USERS_ID) },
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

  await ensureCollection({
    name: "balance_transactions",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "membership", ...rel(membershipsId), required: true },
      { name: "amount", type: "number", required: true },
      { name: "description", type: "text" },
      { name: "type", ...sel(["allowance", "purchase", "points_conversion"]) },
    ],
  });

  // push_subscriptions: stores Web Push subscriptions per household (admin-authed writes only, but rules applied below)
  await ensureCollection({
    name: "push_subscriptions",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "endpoint", type: "text", required: true },
      { name: "p256dh", type: "text" },
      { name: "auth", type: "text" },
    ],
  });

  // google_tokens: admin-only (no rules set), stores OAuth tokens + credentials per household
  await ensureCollection({
    name: "google_tokens",
    fields: [
      { name: "household", ...rel(householdsId), required: true },
      { name: "refresh_token", type: "text" },
      { name: "calendar_id", type: "text" },
      { name: "sync_token", type: "text" },
      { name: "google_client_id", type: "text" },
      { name: "google_client_secret", type: "text" },
    ],
  });

  // app_settings: global admin-only settings, no user-level access rules
  await ensureCollection({
    name: "app_settings",
    fields: [
      { name: "allow_signups", type: "bool" },
      { name: "require_approval", type: "bool" },
    ],
  });
  try {
    const existing = await pbApi(token, "collections/app_settings/records?perPage=1&skipTotal=1");
    if (!existing.items?.length) {
      await pbApi(token, "collections/app_settings/records", "POST", { allow_signups: true, require_approval: false });
      log.push("app_settings: created default record");
    }
  } catch { /* ignore — collection may not be accessible yet on first run */ }

  // ── add fields missing from existing collections (upgrades) ──

  await addMissingFields("households", [
    { name: "slug", type: "text" },
    { name: "custody_week", type: "text" },
    { name: "week_start", type: "text" },
    { name: "kids_can_check_shopping", type: "bool" },
    { name: "status", type: "text" },
  ]);
  await addMissingFields("memberships", [
    { name: "permissions", type: "json" },
    { name: "theme", type: "text" },
    { name: "pin", type: "text" },
    { name: "balance", type: "number" },
    { name: "points_per_dollar", type: "number" },
    { name: "converted_points", type: "number" },
    { name: "custom_gradient", type: "text" },
    { name: "custom_bg_image", type: "file", options: { maxSelect: 1, mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"] } },
    { name: "custom_primary", type: "text" },
  ]);
  await addMissingFields("chores", [
    { name: "type", ...sel(["single", "everyone", "shared"]) },
    { name: "scope", type: "text" },
    { name: "deadline_time", type: "text" },
    { name: "days", type: "text" },
  ]);
  await addMissingFields("meals", [{ name: "meal_type", type: "text" }]);
  await addMissingFields("meal_recipes", [
    { name: "category", type: "text" },
    { name: "url", type: "text" },
    { name: "meal_type", type: "text" },
    { name: "ingredients", type: "text" },
  ]);
  await addMissingFields("goals", [
    { name: "private", type: "bool" },
    { name: "users", type: "json" },
    { name: "emoji", type: "text" },
  ]);
  await addMissingFields("tasks", [
    { name: "recurrence", ...sel(["none", "daily", "weekly", "monthly"]) },
    { name: "last_completed", type: "text" },
  ]);
  await addMissingFields("shopping_items", [
    { name: "added_by", ...rel(PB_USERS_ID) },
    { name: "good_price", type: "text" },
    { name: "meal_note", type: "text" },
    { name: "list", ...rel(shoppingListsId) },
  ]);
  await addMissingFields("shopping_lists", [
    { name: "archived", type: "bool" },
    { name: "archived_at", type: "text" },
  ]);
  await addMissingFields("shopping_catalog", [
    { name: "category", type: "text" },
    { name: "good_price", type: "text" },
  ]);
  await addMissingFields("notes", [
    { name: "pinned", type: "bool" },
    { name: "color", type: "text" },
  ]);
  await addMissingFields("calendar_events", [
    { name: "recurrence", ...sel(["none", "daily", "weekly", "fortnightly", "monthly", "yearly"]) },
    { name: "recurrence_until", type: "text" },
  ]);
  await addMissingFields("google_tokens", [
    { name: "google_client_id", type: "text" },
    { name: "google_client_secret", type: "text" },
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
        try {
          await pbApi(token, `collections/${choresCol.id}`, "PATCH", { fields: updated });
          log.push(`chores: added recurrence values: ${missing.join(", ")}`);
        } catch (err: any) {
          log.push(`WARNING: chores recurrence update failed — ${String(err.message).slice(0, 120)}`);
        }
      }
    }
  }

  // ── ensure API rules ──

  // re-fetch collections so we have fresh rule state
  const freshCollections = await pbApi(token, "collections?perPage=200");
  const fresh: Record<string, any> = {};
  for (const c of freshCollections.items ?? []) fresh[c.name] = c;
  log.push(`Checking rules on ${Object.keys(fresh).length} collections`);

  // users collection: allow public registration + allow auth users to view (needed for member name expand)
  const usersCol = fresh["users"] ?? freshCollections.items?.find((c: any) => c.id === "_pb_users_auth_");
  if (usersCol) {
    const patch: Record<string, string> = {};
    if (usersCol.createRule !== "") patch.createRule = "";
    if (usersCol.viewRule !== AUTH_RULE) patch.viewRule = AUTH_RULE;
    if (Object.keys(patch).length > 0) {
      await pbApi(token, `collections/${usersCol.id}`, "PATCH", patch);
      if (patch.createRule !== undefined) log.push("users: set createRule to public");
      if (patch.viewRule !== undefined) log.push("users: set viewRule to authenticated");
    }
  }

  // all app collections: allow authenticated users
  for (const name of AUTH_COLS) {
    const col = fresh[name];
    if (!col) {
      log.push(`WARNING: ${name} not found in collection list`);
      continue;
    }
    const needsFix = col.listRule !== AUTH_RULE || col.viewRule !== AUTH_RULE || col.createRule !== AUTH_RULE || col.updateRule !== AUTH_RULE || col.deleteRule !== AUTH_RULE;
    if (needsFix) {
      log.push(`${name}: rules wrong (listRule=${JSON.stringify(col.listRule)}), fixing…`);
      try {
        await pbApi(token, `collections/${col.id}`, "PATCH", {
          listRule: AUTH_RULE,
          viewRule: AUTH_RULE,
          createRule: AUTH_RULE,
          updateRule: AUTH_RULE,
          deleteRule: AUTH_RULE,
        });
        log.push(`${name}: rules set ✓`);
      } catch (err: any) {
        log.push(`WARNING: ${name}: could not set rules — ${String(err.message).slice(0, 120)}`);
      }
    } else {
      log.push(`${name}: rules OK`);
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

  // ── repair broken relation collectionIds ──
  // Map each relation field name to the name of the collection it should reference.
  // When PocketBase stores the wrong collectionId (e.g. after a household collection was
  // recreated), filter queries on that relation fail with "Something went wrong".
  const FIELD_TO_COL: Record<string, string> = {
    household:   "households",
    user:        "_pb_users_auth_",
    assignee:    "_pb_users_auth_",
    assigned_to: "_pb_users_auth_",
    created_by:  "_pb_users_auth_",
    added_by:    "_pb_users_auth_",
    chore:       "chores",
    meal:        "meals",
    list:        "shopping_lists",
    membership:  "memberships",
  };

  function expectedId(fieldName: string): string | undefined {
    const target = FIELD_TO_COL[fieldName];
    if (!target) return undefined;
    if (target === "_pb_users_auth_") return "_pb_users_auth_";
    return fresh[target]?.id;
  }

  for (const name of AUTH_COLS) {
    const col = fresh[name];
    if (!col) continue;
    const fields: any[] = col.fields ?? col.schema ?? [];
    let dirty = false;
    const repairedFields = fields.map((f: any) => {
      if (f.type !== "relation") return f;
      const expected = expectedId(f.name);
      if (!expected || f.collectionId === expected) return f;
      log.push(`${name}.${f.name}: collectionId ${f.collectionId} → ${expected}`);
      dirty = true;
      return { ...f, collectionId: expected, options: { ...(f.options ?? {}), collectionId: expected } };
    });
    if (dirty) {
      try {
        await pbApi(token, `collections/${col.id}`, "PATCH", { schema: repairedFields, fields: repairedFields });
        log.push(`${name}: relations repaired ✓`);
      } catch (err: any) {
        log.push(`WARNING: ${name}: could not repair relations — ${String(err.message).slice(0, 120)}`);
      }
    }
  }

  // ── filter-based diagnostic: confirm household relation works ──
  const sampleHh = await pbApi(token, "collections/households/records?perPage=1&skipTotal=1").catch(() => null);
  const sampleHhId = sampleHh?.items?.[0]?.id;
  if (sampleHhId) {
    const filterQ = encodeURIComponent(`household="${sampleHhId}"`);
    for (const name of ["notes", "shopping_items", "shopping_lists", "chores"]) {
      try {
        await pbApi(token, `collections/${name}/records?perPage=1&skipTotal=1&filter=${filterQ}`);
        log.push(`${name}: household filter OK`);
      } catch (err: any) {
        log.push(`${name}: household filter FAILED — ${String(err.message).slice(0, 120)}`);
      }
    }
  }

  // ── generate slugs for households that don't have one ──
  try {
    const noSlug = await pbApi(token, `collections/households/records?filter=${encodeURIComponent('slug=""')}&perPage=200&skipTotal=1`);
    for (const hh of noSlug.items ?? []) {
      const slug = await generateUniqueSlug(hh.name, token);
      await pbApi(token, `collections/households/records/${hh.id}`, "PATCH", { slug });
      log.push(`households: generated slug "${slug}" for "${hh.name}"`);
    }
  } catch { /* skip — field may not exist yet on very first run */ }

  if (log.length === 0) log.push("All schema up to date.");
  return log;
}
