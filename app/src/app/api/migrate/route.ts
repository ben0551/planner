import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db-setup";

export async function POST() {
  try {
    const log = await ensureSchema();
    return NextResponse.json({ ok: true, log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Migration failed." }, { status: 500 });
  }
}
