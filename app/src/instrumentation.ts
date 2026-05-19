export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.PB_ADMIN_EMAIL) return;

  const { ensureSchema } = await import("@/lib/db-setup");
  const log = await ensureSchema();
  for (const line of log) console.log(`[db-setup] ${line}`);
}
