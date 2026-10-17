import { NextRequest, NextResponse } from "next/server";
import { getPbAdminToken, PB_URL } from "../_pb-admin";

// PIN logins work by impersonating the user, and PocketBase's impersonate tokens are
// STATIC: their `refreshable` claim is false, so /auth-refresh refuses to renew them.
// This duration is therefore the hard ceiling on a PIN session — there is no keep-alive.
// It was 86400 (24h), far shorter than the 7-day refreshable token a password login
// receives, so PIN users were being logged out every day. Impersonate has no upper cap
// (PocketBase validates only `duration >= 0`), so match the password-login lifetime.
// Tradeoff: a static token cannot be revoked — resetting a member's PIN does NOT
// invalidate sessions already issued to them.
const PIN_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

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
      body: JSON.stringify({ duration: PIN_SESSION_SECONDS }),
    }
  );
  if (!impRes.ok) return NextResponse.json({ error: "Login failed." }, { status: 500 });
  const { token: authToken, record } = await impRes.json();

  return NextResponse.json({ token: authToken, record });
}
