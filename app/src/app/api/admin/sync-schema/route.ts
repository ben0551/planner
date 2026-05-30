import { NextResponse } from "next/server";
import { getAuthEmail, isAdminEmail } from "@/app/api/_pb-admin";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const email = await getAuthEmail(authHeader);
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { ensureSchema } = await import("@/lib/db-setup");
    const log = await ensureSchema();
    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
