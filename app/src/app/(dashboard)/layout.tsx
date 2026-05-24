"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { getClient } from "@/lib/pocketbase";
import { randomUUID } from "@/lib/utils";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, setupRequired, householdStatus, logout, refreshMembership } = useAuth();
  const router = useRouter();

  const [householdName, setHouseholdName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  async function createHousehold() {
    if (!user) return;
    setCreating(true);
    setCreateError("");
    try {
      const pb = getClient();
      const household = await pb.collection("households").create({
        name: householdName.trim() || `${(user.name as string).split(" ")[0]}'s Home`,
        invite_token: randomUUID(),
      });
      await pb.collection("memberships").create({
        user: user.id,
        household: household.id,
        role: "owner",
      });
      refreshMembership();
    } catch (err: any) {
      setCreateError(err?.message ?? "Failed to create household.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return null;

  if (householdStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 text-center">
          <div className="text-4xl">⏳</div>
          <h1 className="text-lg font-bold">Awaiting approval</h1>
          <p className="text-sm text-muted-foreground">
            Your household has been created and is waiting for the admin to approve it. Check back soon.
          </p>
          <button onClick={logout} className="text-xs text-muted-foreground hover:underline">Sign out</button>
        </div>
      </div>
    );
  }

  if (householdStatus === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 text-center">
          <div className="text-4xl">🚫</div>
          <h1 className="text-lg font-bold">Access not approved</h1>
          <p className="text-sm text-muted-foreground">
            Your household registration was not approved. Contact the admin if you think this is a mistake.
          </p>
          <button onClick={logout} className="text-xs text-muted-foreground hover:underline">Sign out</button>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-bold">Create your household</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your account exists but isn't linked to a household yet. Give it a name to get started.
            </p>
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <Input
            placeholder={`${(user.name as string).split(" ")[0]}'s Home`}
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
          />
          <Button onClick={createHousehold} disabled={creating}>
            {creating ? "Creating…" : "Create household"}
          </Button>
          <button onClick={logout} className="text-xs text-muted-foreground hover:underline text-center">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    /* Mobile: normal document flow (header sticky, bottom nav fixed)
       Desktop: full-viewport flex row; sidebar + content each scroll independently */
    <div className="flex flex-col md:flex-row md:h-screen bg-muted/30">
      <Nav />
      <main className="flex-1 min-w-0 px-4 py-6 pb-24 md:pb-8 md:px-8 md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
