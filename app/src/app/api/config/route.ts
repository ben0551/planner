import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const mode = process.env.HOUSEHOLD_MODE === "multi" ? "multi" : "single";
  return NextResponse.json({ mode }, { headers: { "Cache-Control": "no-store" } });
}
