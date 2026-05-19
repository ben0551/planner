import { type NextRequest } from "next/server";
import { getPbAdminToken, PB_URL } from "@/app/api/_pb-admin";

export async function POST(req: NextRequest) {
  try {
    const { householdId } = await req.json();
    if (!householdId) return Response.json({ error: "householdId required" }, { status: 400 });

    const adminToken = await getPbAdminToken();
    const res = await fetch(
      `${PB_URL}/api/collections/google_tokens/records?filter=${encodeURIComponent(`household="${householdId}"`)}&perPage=1`,
      { headers: { Authorization: adminToken } },
    );
    const data = await res.json();
    if (data.items?.length) {
      await fetch(`${PB_URL}/api/collections/google_tokens/records/${data.items[0].id}`, {
        method: "DELETE",
        headers: { Authorization: adminToken },
      });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
