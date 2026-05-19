import { NextRequest, NextResponse } from "next/server";
import { getPbAdminToken, PB_URL } from "../_pb-admin";

export async function GET(req: NextRequest) {
  let token: string;
  try {
    token = await getPbAdminToken();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const name = req.nextUrl.searchParams.get("name")?.trim();
  const url = name && name.length >= 2
    ? `${PB_URL}/api/collections/households/records?filter=${encodeURIComponent(`name~"${name}"`)}&perPage=5`
    : `${PB_URL}/api/collections/households/records?perPage=10`;

  const householdsRes = await fetch(url, { headers: { Authorization: token } });
  if (!householdsRes.ok) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  const { items: households } = await householdsRes.json();

  if (!households || households.length === 0) {
    return NextResponse.json({ households: [] });
  }

  const results = await Promise.all(
    households.map(async (h: any) => {
      const msRes = await fetch(
        `${PB_URL}/api/collections/memberships/records?filter=${encodeURIComponent(`household="${h.id}"`)}&expand=user&perPage=50`,
        { headers: { Authorization: token } }
      );
      if (!msRes.ok) return null;
      const { items: ms } = await msRes.json();
      const members = (ms ?? [])
        .filter((m: any) => m.pin && String(m.pin).length === 4)
        .map((m: any) => ({
          membershipId: m.id,
          userId: m.expand?.user?.id ?? m.user,
          name: (m.expand?.user?.name as string) ?? "Unknown",
          email: (m.expand?.user?.email as string) ?? "",
          role: m.role as string,
          hasPin: true,
          permissions: m.permissions ?? {},
          theme: m.theme as string | undefined,
        }));
      return { id: h.id, name: h.name as string, members };
    })
  );

  return NextResponse.json({ households: results.filter(Boolean) });
}
