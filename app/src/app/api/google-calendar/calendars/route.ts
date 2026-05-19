import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getAccessToken, listCalendars } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId");
  if (!householdId) return Response.json({ error: "householdId required" }, { status: 400 });

  try {
    const adminToken = await getPbAdminToken();
    const res = await fetch(
      `${PB_URL}/api/collections/google_tokens/records?filter=${encodeURIComponent(`household="${householdId}"`)}&perPage=1`,
      { headers: { Authorization: adminToken } },
    );
    const data = await res.json();
    if (!data.items?.length) return Response.json({ error: "Not connected" }, { status: 400 });

    const { refresh_token } = data.items[0];
    const accessToken = await getAccessToken(refresh_token);
    const calendars = await listCalendars(accessToken);

    return Response.json({ calendars });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
