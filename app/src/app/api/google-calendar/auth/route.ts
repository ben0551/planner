import { type NextRequest } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId") ?? "";
  try {
    const url = getAuthUrl(householdId);
    return Response.redirect(url);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
