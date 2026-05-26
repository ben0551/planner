"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { getClient } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PendingHousehold {
  householdId: string;
  householdName: string;
  created: string;
  ownerName: string;
  ownerEmail: string;
}

function Toggle({ value, disabled, onChange }: { value: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50",
        value ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          value ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function ToggleRow({
  label, description, value, disabled, onChange,
}: {
  label: string; description: string; value: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Toggle value={value} disabled={disabled} onChange={onChange} />
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const pb = getClient();

  const [allowSignups, setAllowSignups] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [serverMode, setServerMode] = useState<"single" | "multi" | null>(null);
  const [pending, setPending] = useState<PendingHousehold[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/");
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const auth = `Bearer ${pb.authStore.token}`;

    fetch("/api/admin/settings", { headers: { Authorization: auth } })
      .then((r) => r.json())
      .then((d) => {
        setAllowSignups(d.allow_signups !== false);
        setRequireApproval(d.require_approval === true);
        setServerMode(d.household_mode === "multi" ? "multi" : "single");
      })
      .finally(() => setSettingsLoading(false));

    fetch("/api/admin/households", { headers: { Authorization: auth } })
      .then((r) => r.json())
      .then((rows) => Array.isArray(rows) && setPending(rows))
      .finally(() => setPendingLoading(false));
  }, [isAdmin, pb]);

  async function saveSetting(patch: { allow_signups?: boolean; require_approval?: boolean }) {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pb.authStore.token}` },
      body: JSON.stringify(patch),
    });
    setSaving(false);
  }

  async function decide(householdId: string, status: "active" | "rejected") {
    setActionId(householdId);
    await fetch(`/api/admin/households/${householdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pb.authStore.token}` },
      body: JSON.stringify({ status }),
    });
    setPending((prev) => prev.filter((h) => h.householdId !== householdId));
    setActionId(null);
  }

  if (loading || !isAdmin || serverMode === null) return null;

  if (serverMode === "single") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4 pt-8 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Admin — not applicable</h1>
        <p className="text-sm text-muted-foreground">
          Multi-household admin controls (signups, approval) are only available when <code className="bg-muted px-1 py-0.5 rounded text-xs">HOUSEHOLD_MODE=multi</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage signups and household approvals.</p>
      </div>

      <section className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-5">
        <h2 className="font-bold text-base">Signup settings</h2>
        <ToggleRow
          label="Allow new signups"
          description="When off, the register page shows a closed message."
          value={allowSignups}
          disabled={settingsLoading || saving}
          onChange={(v) => { setAllowSignups(v); saveSetting({ allow_signups: v }); }}
        />
        <ToggleRow
          label="Require approval"
          description="New households sit in a pending queue until you approve them."
          value={requireApproval}
          disabled={settingsLoading || saving}
          onChange={(v) => { setRequireApproval(v); saveSetting({ require_approval: v }); }}
        />
      </section>

      <section className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
        <h2 className="font-bold text-base">Pending households</h2>
        {pendingLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No households awaiting approval.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((h) => (
              <div
                key={h.householdId}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/50 border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{h.householdName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {h.ownerName} · {h.ownerEmail}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionId === h.householdId}
                    onClick={() => decide(h.householdId, "rejected")}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={actionId === h.householdId}
                    onClick={() => decide(h.householdId, "active")}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
