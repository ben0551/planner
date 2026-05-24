import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import { getGoogleTokenRecord } from "@/app/api/google-calendar/_credentials";

async function pbAdmin(token: string, path: string, method = "GET", body?: object) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { householdId, clientId, clientSecret } = await req.json();
    if (!householdId || !clientId || !clientSecret) {
      return Response.json({ error: "householdId, clientId and clientSecret are required" }, { status: 400 });
    }

    const adminToken = await getPbAdminToken();
    const existing = await getGoogleTokenRecord(adminToken, householdId);

    if (existing) {
      await pbAdmin(adminToken, `collections/google_tokens/records/${existing.id}`, "PATCH", {
        google_client_id: clientId.trim(),
        google_client_secret: clientSecret.trim(),
      });
    } else {
      await pbAdmin(adminToken, "collections/google_tokens/records", "POST", {
        household: householdId,
        google_client_id: clientId.trim(),
        google_client_secret: clientSecret.trim(),
        refresh_token: "",
        calendar_id: "",
        sync_token: "",
      });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
