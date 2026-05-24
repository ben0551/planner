import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";
import type { GoogleCreds } from "@/lib/google-calendar";

async function pbGet(token: string, path: string) {
  const res = await fetch(`${PB_URL}/api/${path}`, { headers: { Authorization: token } });
  return res.json();
}

export async function getGoogleCredentials(householdId: string): Promise<GoogleCreds> {
  const token = await getPbAdminToken();

  const rec = await getGoogleTokenRecord(token, householdId);

  if (rec?.google_client_id && rec?.google_client_secret) {
    return { clientId: rec.google_client_id, clientSecret: rec.google_client_secret };
  }

  // Env fallback only when this is a single-household instance
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const counts = await pbGet(token, "collections/households/records?perPage=1&skipTotal=false");
    const total: number = counts.totalItems ?? counts.total ?? 0;
    if (total <= 1) {
      return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
    }
  }

  throw new Error(
    "Google API credentials are not configured for this household. " +
    "Go to Settings → Google Calendar and enter your Client ID and Client Secret."
  );
}

export async function getGoogleTokenRecord(token: string, householdId: string) {
  const data = await pbGet(
    token,
    `collections/google_tokens/records?filter=${encodeURIComponent(`household="${householdId}"`)}&perPage=1`,
  );
  return (data.items?.[0] as Record<string, string> | undefined) ?? null;
}
