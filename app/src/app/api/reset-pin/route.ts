import { NextRequest, NextResponse } from "next/server";
import { getPbAdminToken, PB_URL } from "../_pb-admin";

export async function POST(req: NextRequest) {
  const { userId, membershipId, householdId, newPin } = await req.json();
  if (!userId || !membershipId || !householdId || !newPin || String(newPin).length !== 4) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let token: string;
  try {
    token = await getPbAdminToken();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  // For child accounts (synthetic @planner.local email), keep the password in sync with the PIN
  const userRes = await fetch(`${PB_URL}/api/collections/users/records/${userId}`, {
    headers: { Authorization: token },
  });
  if (userRes.ok) {
    const user = await userRes.json();
    if ((user.email as string)?.endsWith("@planner.local")) {
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
    }
  }

  // Update membership pin field
  await fetch(`${PB_URL}/api/collections/memberships/records/${membershipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ pin: newPin }),
  });

  return NextResponse.json({ ok: true });
}
