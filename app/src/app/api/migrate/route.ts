import { NextResponse } from "next/server";

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://localhost:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

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

async function getCollection(token: string, name: string) {
  const list = await pbApi(token, "collections?perPage=200");
  return list.items?.find((c: any) => c.name === name);
}

function hasField(schema: any[], fieldName: string) {
  return schema.some((f: any) => f.name === fieldName);
}

export async function POST() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables." },
      { status: 500 }
    );
  }

  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
  });
  if (!authRes.ok) {
    return NextResponse.json({ error: "Admin authentication failed." }, { status: 500 });
  }
  const { token } = await authRes.json();

  const log: string[] = [];

  try {
    // ── chores ──
    const chores = await getCollection(token, "chores");
    if (chores) {
      const schema: any[] = chores.fields ?? chores.schema ?? [];
      let updated = [...schema];
      let dirty = false;

      // deadline_time field
      if (!hasField(schema, "deadline_time")) {
        updated.push({ name: "deadline_time", type: "text" });
        log.push("chores: added deadline_time");
        dirty = true;
      }

      // recurrence select — add new values
      const recurrenceIdx = updated.findIndex((f: any) => f.name === "recurrence");
      if (recurrenceIdx >= 0) {
        const field = updated[recurrenceIdx];
        const currentVals: string[] = field.options?.values ?? field.values ?? [];
        const newVals = ["odd_week", "even_week", "my_week"];
        const missing = newVals.filter((v) => !currentVals.includes(v));
        if (missing.length > 0) {
          updated[recurrenceIdx] = {
            ...field,
            options: { ...(field.options ?? {}), values: [...currentVals, ...missing] },
          };
          log.push(`chores: added recurrence values: ${missing.join(", ")}`);
          dirty = true;
        }
      }

      if (dirty) await pbApi(token, `collections/${chores.id}`, "PATCH", { fields: updated });
    }

    // ── memberships ──
    const memberships = await getCollection(token, "memberships");
    if (memberships) {
      const schema: any[] = memberships.fields ?? memberships.schema ?? [];
      let updated = [...schema];
      let dirty = false;
      for (const f of [
        { name: "permissions", type: "json" },
        { name: "theme", type: "text" },
        { name: "pin", type: "text" },
      ]) {
        if (!hasField(schema, f.name)) {
          updated.push(f);
          log.push(`memberships: added ${f.name}`);
          dirty = true;
        }
      }
      if (dirty) await pbApi(token, `collections/${memberships.id}`, "PATCH", { fields: updated });
    }

    // ── households ──
    const households = await getCollection(token, "households");
    if (households) {
      const schema: any[] = households.fields ?? households.schema ?? [];
      let updated = [...schema];
      let dirty = false;
      if (!hasField(schema, "custody_week")) {
        updated.push({ name: "custody_week", type: "text" });
        log.push("households: added custody_week");
        dirty = true;
      }
      if (dirty) await pbApi(token, `collections/${households.id}`, "PATCH", { fields: updated });
    }

    // ── meal_recipes ──
    const mealRecipes = await getCollection(token, "meal_recipes");
    if (mealRecipes) {
      const schema: any[] = mealRecipes.fields ?? mealRecipes.schema ?? [];
      let updated = [...schema];
      let dirty = false;
      for (const f of [
        { name: "category", type: "text" },
        { name: "url", type: "text" },
        { name: "meal_type", type: "text" },
        { name: "ingredients", type: "text" },
      ]) {
        if (!hasField(schema, f.name)) {
          updated.push(f);
          log.push(`meal_recipes: added ${f.name}`);
          dirty = true;
        }
      }
      if (dirty) await pbApi(token, `collections/${mealRecipes.id}`, "PATCH", { fields: updated });
    }

    // ── meals ──
    const meals = await getCollection(token, "meals");
    if (meals) {
      const schema: any[] = meals.fields ?? meals.schema ?? [];
      let updated = [...schema];
      let dirty = false;
      if (!hasField(schema, "meal_type")) {
        updated.push({ name: "meal_type", type: "text" });
        log.push("meals: added meal_type");
        dirty = true;
      }
      if (dirty) await pbApi(token, `collections/${meals.id}`, "PATCH", { fields: updated });
    }

    if (log.length === 0) log.push("All fields already up to date.");
    return NextResponse.json({ ok: true, log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Migration failed." }, { status: 500 });
  }
}
