import { NextResponse } from "next/server";
import { getPbAdminToken, PB_URL, getAuthEmail, isAdminEmail } from "@/app/api/_pb-admin";

async function getSettings(token: string) {
  const res = await fetch(`${PB_URL}/api/collections/app_settings/records?perPage=1&skipTotal=1`, {
    headers: { Authorization: token },
  });
  const data = await res.json();
  return data.items?.[0] ?? { allow_signups: true, require_approval: false };
}

export async function GET() {
  try {
    const token = await getPbAdminToken();
    const settings = await getSettings(token);
    return NextResponse.json({
      allow_signups: settings.allow_signups !== false,
      require_approval: settings.require_approval === true,
    });
  } catch {
    return NextResponse.json({ allow_signups: true, require_approval: false });
  }
}

export async function PATCH(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const email = await getAuthEmail(authHeader);
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const token = await getPbAdminToken();
  const existing = await getSettings(token);

  let result;
  if (existing.id) {
    const res = await fetch(`${PB_URL}/api/collections/app_settings/records/${existing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify(body),
    });
    result = await res.json();
  } else {
    const res = await fetch(`${PB_URL}/api/collections/app_settings/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ allow_signups: true, require_approval: false, ...body }),
    });
    result = await res.json();
  }

  return NextResponse.json(result);
}
