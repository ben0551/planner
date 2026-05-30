import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getAccessToken, listEvents, fromGoogleEvent } from "@/lib/google-calendar";
import { getGoogleCredentials, getGoogleTokenRecord } from "@/app/api/google-calendar/_credentials";

async function pbAdmin(token: string, path: string, method = "GET", body?: object) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PB ${method} ${path}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId");
  if (!householdId) return Response.json({ error: "householdId required" }, { status: 400 });

  try {
    const adminToken = await getPbAdminToken();
    const rec = await getGoogleTokenRecord(adminToken, householdId);
    if (!rec) return Response.json({ skipped: true });
    if (!rec.calendar_id) return Response.json({ skipped: true, reason: "no calendar selected" });

    const creds = await getGoogleCredentials(householdId);
    const accessToken = await getAccessToken(rec.refresh_token, creds);
    const isFullSync = !rec.sync_token;
    const { items, nextSyncToken } = await listEvents(accessToken, rec.calendar_id, rec.sync_token || undefined);

    // On a full sync, wipe existing Google-sourced events so stale instance records don't persist
    if (isFullSync) {
      const stale = await pbAdmin(
        adminToken,
        `collections/calendar_events/records?filter=${encodeURIComponent(`household="${householdId}" && source="google"`)}&perPage=2500&skipTotal=1`,
      );
      for (const r of stale?.items ?? []) {
        await pbAdmin(adminToken, `collections/calendar_events/records/${r.id}`, "DELETE");
      }
    }

    let created = 0, updated = 0, deleted = 0;

    for (const gEvent of items) {
      if (!gEvent.id) continue;
      // Skip exception instances — the master recurring event covers all dates
      if (gEvent.recurringEventId) continue;
      const existing = await pbAdmin(
        adminToken,
        `collections/calendar_events/records?filter=${encodeURIComponent(`household="${householdId}" && external_id="${gEvent.id}"`)}&perPage=1`,
      );
      const existingRec = existing?.items?.[0];

      if (gEvent.status === "cancelled") {
        if (existingRec) {
          await pbAdmin(adminToken, `collections/calendar_events/records/${existingRec.id}`, "DELETE");
          deleted++;
        }
        continue;
      }

      const fields = fromGoogleEvent(gEvent, householdId);
      if (existingRec) {
        await pbAdmin(adminToken, `collections/calendar_events/records/${existingRec.id}`, "PATCH", fields);
        updated++;
      } else {
        await pbAdmin(adminToken, "collections/calendar_events/records", "POST", fields);
        created++;
      }
    }

    if (nextSyncToken) {
      await pbAdmin(adminToken, `collections/google_tokens/records/${rec.id}`, "PATCH", { sync_token: nextSyncToken });
    }

    return Response.json({ ok: true, created, updated, deleted });
  } catch (err: any) {
    console.error("[google-calendar/sync]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
