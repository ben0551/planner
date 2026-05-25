import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db-setup";

export async function POST() {
  try {
    const log = await ensureSchema();
    return NextResponse.json({ ok: true, log });
  } catch (err: any) {
    // Parse PocketBase error JSON if that's what was thrown
    let message: string = err.message ?? "Migration failed.";
    try {
      const parsed = JSON.parse(message);
      message = parsed.message ?? message;
    } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
