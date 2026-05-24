import { type NextRequest } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";
import { getGoogleCredentials } from "@/app/api/google-calendar/_credentials";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId") ?? "";
  try {
    const creds = await getGoogleCredentials(householdId);
    const url = getAuthUrl(householdId, creds);
    return Response.redirect(url);
  } catch (err: any) {
    return Response.redirect(`${APP_URL}/settings?gcal=error&msg=${encodeURIComponent(err.message)}`);
  }
}
