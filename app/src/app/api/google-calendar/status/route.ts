import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId");
  if (!householdId) return Response.json({ connected: false });

  try {
    const token = await getPbAdminToken();
    const res = await fetch(
      `${PB_URL}/api/collections/google_tokens/records?filter=${encodeURIComponent(`household="${householdId}"`)}&perPage=1`,
      { headers: { Authorization: token } },
    );
    if (!res.ok) return Response.json({ connected: false });
    const data = await res.json();
    if (!data.items?.length) return Response.json({ connected: false });

    const rec = data.items[0];
    return Response.json({
      connected: true,
      calendarId: rec.calendar_id ?? "",
      hasSyncToken: !!rec.sync_token,
    });
  } catch {
    return Response.json({ connected: false });
  }
}
