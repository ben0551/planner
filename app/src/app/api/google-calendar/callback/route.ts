import { type NextRequest } from "next/server";
import { exchangeCode } from "@/lib/google-calendar";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getGoogleCredentials, getGoogleTokenRecord } from "@/app/api/google-calendar/_credentials";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

async function pbAdmin(token: string, path: string, method = "GET", body?: object) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const householdId = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !householdId) {
    return Response.redirect(`${APP_URL}/settings?gcal=denied`);
  }

  try {
    const adminToken = await getPbAdminToken();
    const creds = await getGoogleCredentials(householdId);
    const { refresh_token } = await exchangeCode(code, creds);

    const existing = await getGoogleTokenRecord(adminToken, householdId);
    if (existing) {
      await pbAdmin(adminToken, `collections/google_tokens/records/${existing.id}`, "PATCH", {
        refresh_token, calendar_id: "", sync_token: "",
      });
    } else {
      await pbAdmin(adminToken, "collections/google_tokens/records", "POST", {
        household: householdId, refresh_token, calendar_id: "", sync_token: "",
      });
    }

    return Response.redirect(`${APP_URL}/settings?gcal=connected`);
  } catch (err: any) {
    console.error("[google-calendar/callback]", err);
    return Response.redirect(`${APP_URL}/settings?gcal=error`);
  }
}
