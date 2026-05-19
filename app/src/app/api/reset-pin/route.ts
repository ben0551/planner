import { NextRequest, NextResponse } from "next/server";

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://localhost:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

export async function POST(req: NextRequest) {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD on the server." },
      { status: 500 }
    );
  }

  const { userId, membershipId, householdId, newPin } = await req.json();
  if (!userId || !membershipId || !householdId || !newPin || String(newPin).length !== 4) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Authenticate as PocketBase superuser
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
  });
  if (!authRes.ok) {
    return NextResponse.json({ error: "Admin authentication failed." }, { status: 500 });
  }
  const { token } = await authRes.json();

  // Update child's PocketBase password
  const newPassword = `planner-${householdId}-${newPin}`;
  const updateRes = await fetch(`${PB_URL}/api/collections/users/records/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ password: newPassword, passwordConfirm: newPassword }),
  });
  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    return NextResponse.json({ error: (err as any).message ?? "Failed to update password." }, { status: 400 });
  }

  // Update membership pin field
  await fetch(`${PB_URL}/api/collections/memberships/records/${membershipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ pin: newPin }),
  });

  return NextResponse.json({ ok: true });
}
