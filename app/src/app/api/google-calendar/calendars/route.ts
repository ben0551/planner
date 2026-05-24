import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getAccessToken, listCalendars } from "@/lib/google-calendar";
import { getGoogleCredentials, getGoogleTokenRecord } from "@/app/api/google-calendar/_credentials";

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId");
  if (!householdId) return Response.json({ error: "householdId required" }, { status: 400 });

  try {
    const adminToken = await getPbAdminToken();
    const rec = await getGoogleTokenRecord(adminToken, householdId);
    if (!rec?.refresh_token) return Response.json({ error: "Not connected" }, { status: 400 });

    const creds = await getGoogleCredentials(householdId);
    const accessToken = await getAccessToken(rec.refresh_token, creds);
    const calendars = await listCalendars(accessToken);

    return Response.json({ calendars });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
