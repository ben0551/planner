import { NextRequest, NextResponse } from "next/server";
import { getPbAdminToken, PB_URL } from "../_pb-admin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { membershipId, pin, householdId } = body as Record<string, string>;

  if (!membershipId || !householdId || !pin || String(pin).length !== 4) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let token: string;
  try {
    token = await getPbAdminToken();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const msRes = await fetch(
    `${PB_URL}/api/collections/memberships/records/${membershipId}`,
    { headers: { Authorization: token } }
  );
  if (!msRes.ok) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  const ms = await msRes.json();

  if (ms.household !== householdId || String(ms.pin) !== String(pin)) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  const impRes = await fetch(
    `${PB_URL}/api/collections/users/impersonate/${ms.user}`,
    {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ duration: 86400 }),
    }
  );
  if (!impRes.ok) return NextResponse.json({ error: "Login failed." }, { status: 500 });
  const { token: authToken, record } = await impRes.json();

  return NextResponse.json({ token: authToken, record });
}
