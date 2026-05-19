import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";

export async function POST(req: NextRequest) {
  try {
    const { householdId, calendarId } = await req.json();
    if (!householdId || !calendarId) {
      return Response.json({ error: "householdId and calendarId required" }, { status: 400 });
    }

    const adminToken = await getPbAdminToken();
    const res = await fetch(
      `${PB_URL}/api/collections/google_tokens/records?filter=${encodeURIComponent(`household="${householdId}"`)}&perPage=1`,
      { headers: { Authorization: adminToken } },
    );
    const data = await res.json();
    if (!data.items?.length) return Response.json({ error: "Not connected" }, { status: 400 });

    const recId = data.items[0].id;
    await fetch(`${PB_URL}/api/collections/google_tokens/records/${recId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: adminToken },
      body: JSON.stringify({ calendar_id: calendarId, sync_token: "" }),
    });

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
