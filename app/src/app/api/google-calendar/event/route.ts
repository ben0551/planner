import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getAccessToken, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, toGoogleEvent } from "@/lib/google-calendar";
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

export async function POST(req: NextRequest) {
  try {
    const { householdId, plannerEventId, title, start, end, allDay, notes } = await req.json();
    const adminToken = await getPbAdminToken();
    const rec = await getGoogleTokenRecord(adminToken, householdId);
    if (!rec?.calendar_id) return Response.json({ skipped: true });

    const creds = await getGoogleCredentials(householdId);
    const accessToken = await getAccessToken(rec.refresh_token, creds);
    const gEvent = toGoogleEvent({ title, start, end, all_day: allDay, notes });
    const created = await createGoogleEvent(accessToken, rec.calendar_id, gEvent);

    if (plannerEventId && created.id) {
      await pbAdmin(adminToken, `collections/calendar_events/records/${plannerEventId}`, "PATCH", {
        external_id: created.id, source: "google",
      });
    }

    return Response.json({ googleEventId: created.id });
  } catch (err: any) {
    console.error("[google-calendar/event POST]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { householdId, plannerEventId, googleEventId, title, start, end, allDay, notes } = await req.json();
    const adminToken = await getPbAdminToken();
    const rec = await getGoogleTokenRecord(adminToken, householdId);
    if (!rec?.calendar_id) return Response.json({ skipped: true });

    const creds = await getGoogleCredentials(householdId);
    const accessToken = await getAccessToken(rec.refresh_token, creds);
    const gEvent = toGoogleEvent({ title, start, end, all_day: allDay, notes });

    if (googleEventId) {
      await updateGoogleEvent(accessToken, rec.calendar_id, googleEventId, gEvent);
      return Response.json({ ok: true });
    } else {
      const created = await createGoogleEvent(accessToken, rec.calendar_id, gEvent);
      if (plannerEventId && created.id) {
        await pbAdmin(adminToken, `collections/calendar_events/records/${plannerEventId}`, "PATCH", {
          external_id: created.id, source: "google",
        });
      }
      return Response.json({ googleEventId: created.id });
    }
  } catch (err: any) {
    console.error("[google-calendar/event PATCH]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const householdId = req.nextUrl.searchParams.get("householdId");
    const googleEventId = req.nextUrl.searchParams.get("googleEventId");
    if (!householdId || !googleEventId) {
      return Response.json({ error: "householdId and googleEventId required" }, { status: 400 });
    }

    const adminToken = await getPbAdminToken();
    const rec = await getGoogleTokenRecord(adminToken, householdId);
    if (!rec?.calendar_id) return Response.json({ skipped: true });

    const creds = await getGoogleCredentials(householdId);
    const accessToken = await getAccessToken(rec.refresh_token, creds);
    await deleteGoogleEvent(accessToken, rec.calendar_id, googleEventId);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[google-calendar/event DELETE]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
