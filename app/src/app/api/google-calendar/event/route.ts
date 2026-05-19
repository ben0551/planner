import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import {
  getAccessToken,
  createGoogleEvent,
  deleteGoogleEvent,
  toGoogleEvent,
} from "@/lib/google-calendar";

async function getTokensForHousehold(adminToken: string, householdId: string) {
  const res = await fetch(
    `${PB_URL}/api/collections/google_tokens/records?filter=${encodeURIComponent(`household="${householdId}"`)}&perPage=1`,
    { headers: { Authorization: adminToken } },
  );
  const data = await res.json();
  if (!data.items?.length) return null;
  const rec = data.items[0];
  if (!rec.calendar_id) return null;
  return rec;
}

// Push a Planner event to Google Calendar, return the Google event ID
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, plannerEventId, title, start, end, allDay, notes } = body;

    const adminToken = await getPbAdminToken();
    const rec = await getTokensForHousehold(adminToken, householdId);
    if (!rec) return Response.json({ skipped: true });

    const accessToken = await getAccessToken(rec.refresh_token);
    const gEvent = toGoogleEvent({ title, start, end, all_day: allDay, notes });
    const created = await createGoogleEvent(accessToken, rec.calendar_id, gEvent);

    // Store the Google event ID back on the Planner record
    if (plannerEventId && created.id) {
      await fetch(`${PB_URL}/api/collections/calendar_events/records/${plannerEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: adminToken },
        body: JSON.stringify({ external_id: created.id, source: "google" }),
      });
    }

    return Response.json({ googleEventId: created.id });
  } catch (err: any) {
    console.error("[google-calendar/event POST]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Delete a Google Calendar event by its ID
export async function DELETE(req: NextRequest) {
  try {
    const householdId = req.nextUrl.searchParams.get("householdId");
    const googleEventId = req.nextUrl.searchParams.get("googleEventId");
    if (!householdId || !googleEventId) {
      return Response.json({ error: "householdId and googleEventId required" }, { status: 400 });
    }

    const adminToken = await getPbAdminToken();
    const rec = await getTokensForHousehold(adminToken, householdId);
    if (!rec) return Response.json({ skipped: true });

    const accessToken = await getAccessToken(rec.refresh_token);
    await deleteGoogleEvent(accessToken, rec.calendar_id, googleEventId);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[google-calendar/event DELETE]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
