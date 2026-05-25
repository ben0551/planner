import { NextResponse } from "next/server";

export function GET() {
  const mode = process.env.HOUSEHOLD_MODE === "multi" ? "multi" : "single";
  return NextResponse.json({ mode });
}
