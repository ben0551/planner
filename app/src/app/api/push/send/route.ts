import { NextResponse } from "next/server";
import webPush from "web-push";
import { getPbAdminToken, PB_URL, getAuthEmail, isAdminEmail } from "@/app/api/_pb-admin";

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const email = await getAuthEmail(authHeader);
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const { householdId, title, body, url } = await request.json();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const token = await getPbAdminToken();
  const filter = householdId ? `&filter=${encodeURIComponent(`household="${householdId}"`)}` : "";
  const res = await fetch(
    `${PB_URL}/api/collections/push_subscriptions/records?perPage=500${filter}`,
    { headers: { Authorization: token } }
  );
  const data = await res.json();
  const subs: any[] = data.items ?? [];

  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err: any) => {
        // 410 Gone = subscription expired; clean it up
        if (err.statusCode === 410) {
          await fetch(`${PB_URL}/api/collections/push_subscriptions/records/${sub.id}`, {
            method: "DELETE",
            headers: { Authorization: token },
          });
        }
        throw err;
      })
    )
  );

  return NextResponse.json({
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    total: subs.length,
  });
}
