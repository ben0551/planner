import { NextResponse } from "next/server";
import { getPbAdminToken, PB_URL, getAuthEmail, isAdminEmail } from "@/app/api/_pb-admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const email = await getAuthEmail(authHeader);
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await getPbAdminToken();
  const filter = encodeURIComponent(`role="owner"&&household.status="pending"`);
  const res = await fetch(
    `${PB_URL}/api/collections/memberships/records?filter=${filter}&expand=user,household&perPage=100`,
    { headers: { Authorization: token } },
  );
  const data = await res.json();

  const rows = (data.items ?? []).map((m: any) => ({
    householdId: m.household,
    householdName: m.expand?.household?.name ?? m.household,
    created: m.expand?.household?.created ?? "",
    ownerName: m.expand?.user?.name ?? "",
    ownerEmail: m.expand?.user?.email ?? "",
  }));

  return NextResponse.json(rows);
}
