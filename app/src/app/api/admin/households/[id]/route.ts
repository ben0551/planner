import { NextResponse } from "next/server";
import { getPbAdminToken, PB_URL, getAuthEmail, isAdminEmail } from "@/app/api/_pb-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = request.headers.get("Authorization");
  const email = await getAuthEmail(authHeader);
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();
  if (!["active", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const token = await getPbAdminToken();
  const res = await fetch(`${PB_URL}/api/collections/households/records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
