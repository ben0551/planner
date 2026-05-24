import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getGoogleCredentials, getGoogleTokenRecord } from "@/app/api/google-calendar/_credentials";

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId");
  if (!householdId) return Response.json({ connected: false, hasCredentials: false });

  try {
    const token = await getPbAdminToken();
    const rec = await getGoogleTokenRecord(token, householdId);

    const hasCredentials = await getGoogleCredentials(householdId).then(() => true).catch(() => false);

    if (!rec?.refresh_token) return Response.json({ connected: false, hasCredentials });

    return Response.json({
      connected: true,
      hasCredentials,
      calendarId: rec.calendar_id ?? "",
      hasSyncToken: !!rec.sync_token,
    });
  } catch {
    return Response.json({ connected: false, hasCredentials: false });
  }
}
