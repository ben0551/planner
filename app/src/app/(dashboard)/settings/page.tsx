"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Users, UserPlus, ChevronRight, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

type CustodyWeek = "odd" | "even" | "";

const CUSTODY_OPTIONS: { value: CustodyWeek; label: string; sub: string }[] = [
  { value: "odd",  label: "Odd weeks",  sub: "Weeks 1, 3, 5, 7…" },
  { value: "even", label: "Even weeks", sub: "Weeks 2, 4, 6, 8…" },
  { value: "",     label: "Not applicable", sub: "No shared custody schedule" },
];

export default function SettingsPage() {
  const { user, membership } = useAuth();
  const router = useRouter();
  const pb = getClient();
  const household = membership?.expand?.household;
  const isOwner = membership?.role === "owner";

  const [custodyWeek, setCustodyWeek] = useState<CustodyWeek>(
    (household?.custody_week as CustodyWeek) ?? ""
  );
  const [custodySaving, setCustodySaving] = useState(false);
  const [custodySaved, setCustodySaved] = useState(false);

  async function saveCustodyWeek() {
    if (!household?.id) return;
    setCustodySaving(true);
    try {
      await pb.collection("households").update(household.id, { custody_week: custodyWeek });
      setCustodySaved(true);
      setTimeout(() => setCustodySaved(false), 2000);
    } finally {
      setCustodySaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Household */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Household</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{household?.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Your role: <Badge variant="secondary">{membership?.role}</Badge>
          </p>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Account</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{user?.name as string}</p>
          <p className="text-xs text-muted-foreground">{user?.email as string}</p>
        </div>
      </div>

      {/* Custody schedule — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Custody Schedule</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Set which weeks the kids are with you. Chores can then be set to <strong>"My Week"</strong> and will automatically appear on the right weeks.
            </p>
            <div className="flex flex-col gap-2">
              {CUSTODY_OPTIONS.map((opt) => (
                <label key={opt.value}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                    custodyWeek === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  )}
                >
                  <input
                    type="radio"
                    name="custody"
                    value={opt.value}
                    checked={custodyWeek === opt.value}
                    onChange={() => setCustodyWeek(opt.value)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="self-start rounded-xl"
              disabled={custodySaving}
              onClick={saveCustodyWeek}
            >
              {custodySaving ? "Saving…" : custodySaved ? "✓ Saved!" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Owner-only actions */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden divide-y">
          <button
            onClick={() => router.push("/settings/members")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Members</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => router.push("/settings/invite")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Invite member</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
