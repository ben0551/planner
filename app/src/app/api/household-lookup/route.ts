import { NextRequest, NextResponse } from "next/server";
import { getPbAdminToken, PB_URL } from "../_pb-admin";

export async function GET(req: NextRequest) {
  // Slug is always required — prevents unauthenticated enumeration of all households.
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ households: [] });
  }

  let token: string;
  try {
    token = await getPbAdminToken();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const url = `${PB_URL}/api/collections/households/records?filter=${encodeURIComponent(`slug="${slug}"`)}&perPage=1`;

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
        `${PB_URL}/api/collections/memberships/records?filter=${encodeURIComponent(`household="${h.id}"`)}&perPage=50`,
        { headers: { Authorization: token } }
      );
      if (!msRes.ok) return null;
      const { items: ms } = await msRes.json();

      const pinMembers = (ms ?? []).filter((m: any) => m.pin && String(m.pin).length === 4);
      if (pinMembers.length === 0) return { id: h.id, name: h.name as string, members: [] };

      const userIds = pinMembers.map((m: any) => m.user).filter(Boolean);
      const usersFilter = userIds.map((id: string) => `id="${id}"`).join("||");
      const usersRes = await fetch(
        `${PB_URL}/api/collections/users/records?filter=${encodeURIComponent(usersFilter)}&perPage=50`,
        { headers: { Authorization: token } }
      );
      const usersById: Record<string, any> = {};
      if (usersRes.ok) {
        const { items: users } = await usersRes.json();
        for (const u of users ?? []) usersById[u.id] = u;
      }

      const members = pinMembers.map((m: any) => {
        const u = usersById[m.user];
        return {
          membershipId: m.id,
          userId: m.user,
          name: (u?.name as string) || "Member",
          email: (u?.email as string) ?? "",
          role: m.role as string,
          hasPin: true,
          permissions: m.permissions ?? {},
          theme: m.theme as string | undefined,
        };
      });
      return { id: h.id, name: h.name as string, members };
    })
  );

  return NextResponse.json({ households: results.filter(Boolean) });
}
