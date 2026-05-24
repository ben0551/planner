import { NextResponse } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";

export async function POST(request: Request) {
  const { householdId, subscription } = await request.json();
  if (!householdId || !subscription?.endpoint) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let token: string;
  try { token = await getPbAdminToken(); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  // Upsert — skip if this endpoint is already stored
  const filter = encodeURIComponent(`endpoint="${subscription.endpoint}"`);
  const existing = await fetch(
    `${PB_URL}/api/collections/push_subscriptions/records?filter=${filter}&perPage=1&skipTotal=1`,
    { headers: { Authorization: token } }
  );
  const existingData = await existing.json();
  if (existingData.items?.length > 0) return NextResponse.json({ ok: true });

  const res = await fetch(`${PB_URL}/api/collections/push_subscriptions/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      household: householdId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? "",
      auth: subscription.keys?.auth ?? "",
    }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json({ ok: true });
}
