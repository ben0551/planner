import { NextResponse } from "next/server";
import { getAuthEmail, isAdminEmail } from "@/app/api/_pb-admin";

export async function GET(request: Request) {
  const email = await getAuthEmail(request.headers.get("Authorization"));
  return NextResponse.json({ isAdmin: isAdminEmail(email) });
}
