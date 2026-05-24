export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.PB_ADMIN_EMAIL) return;

  try {
    const { ensureSchema } = await import("@/lib/db-setup");
    const log = await ensureSchema();
    for (const line of log) console.log(`[db-setup] ${line}`);
  } catch (err) {
    // Schema setup failed (PocketBase may not be ready, or a migration step errored).
    // Log and continue — the server still starts; owners can retry via Settings → Sync Database.
    console.error("[db-setup] Startup schema check failed:", err instanceof Error ? err.message : err);
  }
}
