const PB_URL = process.env.PB_INTERNAL_URL ?? "http://localhost:8090";

export { PB_URL };

export async function getAuthEmail(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.record?.email as string) ?? null;
  } catch {
    return null;
  }
}

export function isAdminEmail(email: string | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  return Boolean(adminEmail && email === adminEmail);
}

export async function getPbAdminToken(): Promise<string> {
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in .env.local, then restart the dev server.");
  }

  const body = JSON.stringify({ identity: email, password });
  const headers = { "Content-Type": "application/json" };

  // PocketBase >= 0.22 uses _superusers; older versions use /api/admins
  for (const path of [
    "collections/_superusers/auth-with-password",
    "admins/auth-with-password",
  ]) {
    const res = await fetch(`${PB_URL}/api/${path}`, { method: "POST", headers, body });
    if (res.ok) {
      const data = await res.json();
      return data.token as string;
    }
  }

  throw new Error(
    `Admin login failed. Check that PB_ADMIN_EMAIL (${email}) and PB_ADMIN_PASSWORD are the credentials you use to log into the PocketBase admin panel at ${PB_URL}/_/`
  );
}
